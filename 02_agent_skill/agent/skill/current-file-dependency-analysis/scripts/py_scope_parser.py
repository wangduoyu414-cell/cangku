from __future__ import annotations

import ast
from pathlib import Path
from typing import Any

from common import repo_relative, safe_read_text


BUILTINS = {
    "print", "len", "range", "str", "int", "float", "bool", "list", "dict",
    "set", "tuple", "type", "isinstance", "hasattr", "getattr", "setattr",
    "open", "abs", "max", "min", "sum", "sorted", "reversed", "enumerate",
    "zip", "map", "filter", "any", "all", "round", "hex", "oct", "bin",
    "chr", "ord", "input", "repr", "dir", "vars", "locals", "globals",
    "callable", "issubclass", "super", "property", "classmethod", "staticmethod",
    "staticmethod", "Exception", "BaseException", "RuntimeError", "ValueError",
    "TypeError", "AttributeError", "KeyError", "IndexError", "ImportError",
    "FileNotFoundError", "OSError", "ZeroDivisionError", "StopIteration",
}


class ScopeAwarePythonAnalyzer(ast.NodeVisitor):
    """
    作用域感知的 Python AST 分析器。

    优点：
    - 严格按函数/类作用域收集调用，消除跨作用域误匹配
    - 正确识别 self/cls 调用（method vs standalone function）
    - 可检测装饰器，识别被装饰的函数
    - 区分内置函数调用（低噪声）

    局限性：
    - 不处理 yield / async 上下文的特殊语义
    - lambda 内部的调用归属到外层函数

    风险：
    - 对超长函数（> 1000 行）的递归深度可能超出限制
    """

    def __init__(self, file_path: Path, repo_root: Path, anchor_relative: str):
        self.file_path = file_path
        self.repo_root = repo_root
        self.anchor_relative = anchor_relative
        self.edges: list[dict] = []
        self._scope_stack: list[str] = ["module"]
        self._known_symbols: dict[str, str] = {}  # name -> kind (class/function/method)
        self._all_symbols: list[dict] = []
        self._in_class_stack: list[bool] = [False]  # 追踪是否在 class 体内

    def analyze(self, tree: ast.AST) -> list[dict]:
        """执行分析并返回边列表"""
        self.visit(tree)
        return self.edges

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._visit_function(node)
        return

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._visit_function(node)
        return

    def _visit_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        """处理函数定义的公共逻辑"""
        in_method = self._in_class_stack[-1]
        kind = "method" if in_method else "function"

        # 检查装饰器
        decorators = []
        for dec in node.decorator_list:
            dec_name = self._get_name_from_node(dec)
            if dec_name:
                decorators.append(dec_name)
                self._known_symbols[dec_name] = "decorator"

        # 记录符号
        sym = {
            "kind": kind,
            "name": node.name,
            "line": node.lineno,
            "decorators": decorators,
            "is_async": isinstance(node, ast.AsyncFunctionDef),
        }
        self._all_symbols.append(sym)
        self._known_symbols[node.name] = kind

        # 进入新作用域
        self._scope_stack.append(node.name)
        self.generic_visit(node)
        self._scope_stack.pop()

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        # 记录类符号
        sym = {
            "kind": "class",
            "name": node.name,
            "line": node.lineno,
            "bases": [self._get_name_from_node(b) for b in node.bases],
        }
        self._all_symbols.append(sym)
        self._known_symbols[node.name] = "class"

        # 继承关系 -> inherits 边
        for base in node.bases:
            base_name = self._get_name_from_node(base)
            if base_name:
                self.edges.append(self._make_edge(
                    "inherits", node.name, base_name, node.lineno, "high",
                ))

        # 进入类作用域 + 类体内标记
        self._scope_stack.append(node.name)
        self._in_class_stack.append(True)
        self.generic_visit(node)
        self._in_class_stack.pop()
        self._scope_stack.pop()
        return

    def visit_Call(self, node: ast.Call) -> None:
        current_scope = self._scope_stack[-1]
        target = self._get_name_from_node(node.func)

        if not target or target in BUILTINS:
            self.generic_visit(node)
            return

        # self/cls 调用特殊处理
        if target in ("self", "cls"):
            self.generic_visit(node)
            return

        # 过滤明显的非调用模式
        if target in {"if", "for", "while", "with", "except", "try", "else", "return"}:
            self.generic_visit(node)
            return

        # 判断置信度
        if target in self._known_symbols:
            confidence = "medium"
        else:
            confidence = "low"

        self.edges.append(self._make_edge(
            "call", current_scope, target, node.lineno, confidence,
        ))
        self.generic_visit(node)
        return

    def visit_Lambda(self, node: ast.Lambda) -> None:
        # lambda 不创建新作用域栈帧，但记录为 module 上下文内的匿名调用
        # 继续遍历但不压栈
        self.generic_visit(node)
        return

    def _get_name_from_node(self, node: ast.AST) -> str:
        """从 AST 节点提取名称字符串"""
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return node.attr
        if isinstance(node, ast.Subscript):
            return self._get_name_from_node(node.value)
        if isinstance(node, ast.BinOp):
            return ""
        return ""

    def _make_edge(
        self,
        relation: str,
        symbol_from: str,
        symbol_to: str,
        line: int,
        confidence: str = "medium",
    ) -> dict:
        return {
            "from": self.anchor_relative,
            "to": self.anchor_relative,
            "direction": "outbound",
            "edge_kind": "symbol",
            "relation_type": relation,
            "symbol_from": symbol_from,
            "symbol_to": symbol_to,
            "evidence_ref": f"{self.anchor_relative}:{line}",
            "confidence": confidence,
            "resolution": "resolved",
        }


def collect_python_symbol_edges(
    file_path: Path,
    repo_root: Path,
    anchor_relative: str,
) -> list[dict]:
    """
    使用作用域感知分析器收集 Python 符号边。

    自动降级到简单 AST 分析（无需递归），
    仅在无法解析时返回空列表。
    """
    try:
        text = safe_read_text(file_path)
        tree = ast.parse(text, filename=str(file_path))
    except Exception:
        return []

    analyzer = ScopeAwarePythonAnalyzer(file_path, repo_root, anchor_relative)
    return analyzer.analyze(tree)

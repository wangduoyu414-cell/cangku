from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

# 确保 scripts 目录在 sys.path 中
_scripts_dir = Path(__file__).parent.resolve()
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))

from common import normalize_path, repo_relative


TS_ANALYZER_SCRIPT = r"""
const fs = require('fs');
const ts = require('typescript');

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
    process.stdout.write(JSON.stringify({ error: 'File not found' }));
    process.exit(0);
}

let content;
try {
    content = fs.readFileSync(filePath, 'utf-8');
} catch (e) {
    process.stdout.write(JSON.stringify({ error: 'Cannot read file' }));
    process.exit(0);
}

const sourceFile = ts.createSourceFile(
    filePath, content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
);

const symbols = [];
const calls = [];
const interfaces = [];

function getLine(text, pos) {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

function visit(node, depth = 0) {
    if (depth > 50) return;

    // Class declaration
    if (ts.isClassDeclaration(node) && node.name) {
        const classInfo = {
            kind: 'class',
            name: node.name.text,
            line: getLine(content, node.pos),
            extends: [],
            implements: [],
            decorators: [],
        };

        // Heritage clauses (extends, implements)
        if (node.heritageClauses) {
            for (const clause of node.heritageClauses) {
                if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                    classInfo.extends = clause.types.map(t => t.expression.getText(sourceFile));
                } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                    classInfo.implements = clause.types.map(t => t.expression.getText(sourceFile));
                }
            }
        }

        // Decorators
        if (node.decorators) {
            classInfo.decorators = node.decorators.map(d => d.expression.getText(sourceFile));
        }

        symbols.push(classInfo);
    }

    // Interface declaration
    if (ts.isInterfaceDeclaration(node) && node.name) {
        const ifaceInfo = {
            kind: 'interface',
            name: node.name.text,
            line: getLine(content, node.pos),
            extends: [],
        };

        if (node.heritageClauses) {
            ifaceInfo.extends = node.heritageClauses
                .filter(c => c.token === ts.SyntaxKind.ExtendsKeyword)
                .flatMap(c => c.types.map(t => t.expression.getText(sourceFile)));
        }

        interfaces.push(ifaceInfo);
        symbols.push(ifaceInfo);
    }

    // Function declaration
    if (ts.isFunctionDeclaration(node) && node.name && !node.name.text.startsWith('_')) {
        const fnInfo = {
            kind: 'function',
            name: node.name.text,
            line: getLine(content, node.pos),
            decorators: [],
        };

        if (node.decorators) {
            fnInfo.decorators = node.decorators.map(d => d.expression.getText(sourceFile));
        }

        symbols.push(fnInfo);
    }

    // Method declaration (inside class)
    if (ts.isMethodDeclaration(node) && node.name) {
        const methodName = node.name.getText(sourceFile);
        if (methodName && !methodName.startsWith('[')) {
            const methodInfo = {
                kind: 'method',
                name: methodName,
                line: getLine(content, node.pos),
                decorators: [],
            };

            if (node.decorators) {
                methodInfo.decorators = node.decorators.map(d => d.expression.getText(sourceFile));
            }

            symbols.push(methodInfo);
        }
    }

    // Call expression
    if (ts.isCallExpression(node)) {
        let callee = '';
        if (ts.isIdentifier(node.expression)) {
            callee = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
            callee = node.expression.name.getText(sourceFile);
        }

        if (callee && callee !== 'require') {
            calls.push({
                callee,
                line: getLine(content, node.getStart()),
            });
        }
    }

    ts.forEachChild(node, n => visit(n, depth + 1));
}

visit(sourceFile);
process.stdout.write(JSON.stringify({ symbols, calls, interfaces }, null, 0));
"""


class TypeScriptSymbolParser:
    """
    基于 TypeScript Compiler API 的符号解析器。

    优点：
    - 编译器级别 AST 解析，得到精确的符号表
    - 正确处理 interface extends、类 implements、装饰器
    - 按行号建立符号上下文，消除跨作用域误匹配

    局限性：
    - 依赖 node/npm 环境
    - 不直接处理 .vue 文件（需配合 vue-ts-plugin）

    风险：
    - node 环境不可用时自动降级到正则解析
    """

    _script_cache: Path | None = None
    _node_checked: bool = False
    _node_available: bool = False

    @classmethod
    def _check_node(cls) -> bool:
        """检测 node 环境是否可用"""
        if cls._node_checked:
            return cls._node_available
        cls._node_checked = True
        cls._node_available = shutil.which("node") is not None
        return cls._node_available

    @classmethod
    def _get_script_path(cls) -> Path | None:
        """获取或创建临时分析脚本"""
        if cls._script_cache and cls._script_cache.exists():
            return cls._script_cache

        if not cls._check_node():
            return None

        try:
            tmp_dir = Path(tempfile.gettempdir())
            script_path = tmp_dir / f"ts_symbol_analyzer_{os.getpid()}.js"
            script_path.write_text(TS_ANALYZER_SCRIPT, encoding="utf-8")
            cls._script_cache = script_path
            return script_path
        except Exception:
            return None

    @classmethod
    def is_available(cls) -> bool:
        """检查 TypeScript 解析器是否可用"""
        return cls._get_script_path() is not None

    def parse(self, file_path: Path) -> dict[str, Any] | None:
        """
        解析单个 TypeScript 文件，返回符号和调用信息。

        Returns:
            {
                "symbols": [...],  # 类、函数、接口、方法定义
                "calls": [...],    # 函数调用
                "interfaces": [...] # 接口定义（子集）
            }
        """
        script_path = self._get_script_path()
        if not script_path:
            return None

        if file_path.suffix.lower() == ".vue":
            # 提取 <script> 块
            content = self._extract_vue_script(file_path)
            if not content:
                return None
            # 写入临时 .ts 文件供分析
            try:
                tmp_ts = Path(tempfile.gettempdir()) / f"vue_script_{os.getpid()}.ts"
                tmp_ts.write_text(content, encoding="utf-8")
                file_path = tmp_ts
            except Exception:
                return None

        try:
            result = subprocess.run(
                ["node", str(script_path), str(file_path)],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                return None
            return json.loads(result.stdout)
        except Exception:
            return None

    def _extract_vue_script(self, vue_path: Path) -> str | None:
        """从 Vue SFC 中提取 <script> 块内容"""
        import re
        try:
            content = vue_path.read_text(encoding="utf-8")
        except Exception:
            return None

        blocks = re.findall(
            r"<script[^>]*>(.*?)</script>",
            content,
            flags=re.DOTALL | re.IGNORECASE,
        )
        if not blocks:
            return None
        return "\n".join(blocks)

    def build_edges(
        self,
        file_path: Path,
        repo_root: Path,
        anchor_relative: str,
    ) -> list[dict]:
        """
        从解析结果构建符号级依赖边。

        Returns:
            符号边列表，包含 inherits（继承）和 call（调用）关系
        """
        data = self.parse(file_path)
        if not data or data.get("error"):
            return []

        edges: list[dict] = []
        symbols = data.get("symbols", [])
        calls = data.get("calls", [])

        # 建立已知符号集合
        known: dict[str, dict] = {}
        for sym in symbols:
            kind = sym.get("kind", "")
            name = sym.get("name", "")
            if name and kind:
                known[name] = sym

        # 处理继承/实现关系
        for sym in symbols:
            kind = sym.get("kind", "")
            name = sym.get("name", "")
            line = sym.get("line", 0)

            if kind == "class":
                for base in sym.get("extends", []):
                    edges.append(self._make_edge(
                        anchor_relative, "inherits",
                        name, base, line, "high",
                    ))
                for impl in sym.get("implements", []):
                    edges.append(self._make_edge(
                        anchor_relative, "implements",
                        name, impl, line, "high",
                    ))
            elif kind == "interface":
                for base in sym.get("extends", []):
                    edges.append(self._make_edge(
                        anchor_relative, "inherits",
                        name, base, line, "high",
                    ))

        # 建立行号到符号的映射
        sym_by_line: dict[int, dict] = {}
        for sym in symbols:
            line = sym.get("line", 0)
            if line and line not in sym_by_line:
                sym_by_line[line] = sym

        # 处理函数调用（带作用域上下文）
        for call in calls:
            line = call.get("line", 0)
            callee = call.get("callee", "")

            if not callee or callee in {
                "if", "for", "while", "switch", "return",
                "try", "catch", "throw", "new", "delete",
                "typeof", "void", "in", "of", "import",
            }:
                continue

            # 确定当前符号上下文
            current_sym = "module"
            if line in sym_by_line:
                current_sym_name = sym_by_line[line].get("name", "")
                if current_sym_name:
                    current_sym = current_sym_name

            # 区分方法调用和函数调用
            confidence = "medium" if callee in known else "low"
            edges.append(self._make_edge(
                anchor_relative, "call",
                current_sym, callee, line, confidence,
            ))

        return edges

    def _make_edge(
        self,
        anchor_relative: str,
        relation_type: str,
        symbol_from: str,
        symbol_to: str,
        line_number: int,
        confidence: str = "medium",
    ) -> dict:
        return {
            "from": anchor_relative,
            "to": anchor_relative,
            "direction": "outbound",
            "edge_kind": "symbol",
            "relation_type": relation_type,
            "symbol_from": symbol_from,
            "symbol_to": symbol_to,
            "evidence_ref": f"{anchor_relative}:{line_number}",
            "confidence": confidence,
            "resolution": "resolved",
        }

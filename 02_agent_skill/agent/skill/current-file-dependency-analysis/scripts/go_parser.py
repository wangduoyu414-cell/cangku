from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

# 确保 scripts 目录在 sys.path 中
_scripts_dir = Path(__file__).parent.resolve()
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))

from common import normalize_path, repo_relative, safe_read_text


GO_SINGLE_IMPORT_RE = re.compile(r'^\s*import\s+(?:\w+\s+)?"([^"]+)"')
GO_BLOCK_IMPORT_RE = re.compile(r'^\s*(?:\w+\s+)?"([^"]+)"')
GO_FUNC_RE = re.compile(r'^\s*func\s+(?:\([^)]+\)\s+)?([A-Za-z_]\w*)\s*\(')
GO_TYPE_RE = re.compile(r'^\s*type\s+([A-Za-z_]\w*)\s+struct\b')
GO_METHOD_RE = re.compile(r'^\s*func\s+\(([A-Za-z_]\w+)\s+\*?([A-Za-z_]\w*)\s*\)\s*([A-Za-z_]\w*)\s*\(')


class GoDependencyResolver:
    """
    Go 依赖解析器，结合 go list 和正则 AST，提升文件级依赖精度。

    优点：
    - go list -json 获取精确的包依赖图
    - 配合 import 路径解析，区分"导入当前文件所在包"和"导入其他包"
    - 检测 build tags 影响

    局限性：
    - 需要 go 工具链环境
    - go list 对 monorepo（多个 go.mod）支持有限
    - 不是真正的文件级 import 分析（Go 导入粒度是包）

    风险：
    - go 环境缺失时需降级到正则解析
    """

    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self._module_name: str | None = None
        self._package_deps: dict[str, set[str]] | None = None
        self._checked: bool = False
        self._go_available: bool = False

    def _check_go(self) -> bool:
        """检测 go 环境是否可用"""
        if self._checked:
            return self._go_available
        self._checked = True
        self._go_available = shutil.which("go") is not None
        return self._go_available

    @property
    def module_name(self) -> str:
        """获取当前模块名（惰性求值）"""
        if self._module_name is None:
            go_mod = self.repo_root / "go.mod"
            if go_mod.exists():
                for line in safe_read_text(go_mod).splitlines():
                    if line.startswith("module "):
                        self._module_name = line.split(" ", 1)[1].strip()
                        break
            if self._module_name is None:
                self._module_name = ""
        return self._module_name

    def get_package_deps(self) -> dict[str, set[str]]:
        """
        获取当前仓库所有包的精确依赖关系。

        调用 go list -json ./... 获取每个包的 ImportPath 和 Imports。
        仅在 go 环境可用时调用，否则返回空字典。

        Returns:
            {
                "github.com/user/repo/pkg": {"github.com/user/repo/pkg/sub", ...},
                ...
            }
        """
        if not self._check_go():
            return {}

        if self._package_deps is not None:
            return self._package_deps

        self._package_deps = {}

        try:
            result = subprocess.run(
                ["go", "list", "-json", "./..."],
                cwd=str(self.repo_root),
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                return {}

            # 解析 go list -json 输出（每行一个 JSON 对象）
            pkg_buffer = ""
            for line in result.stdout.splitlines():
                if line.strip() == "}":
                    pkg_buffer += line
                    try:
                        pkg_info = json.loads(pkg_buffer)
                        pkg_name = pkg_info.get("ImportPath", "")
                        imports = set(pkg_info.get("Imports", []))
                        if pkg_name:
                            self._package_deps[pkg_name] = imports
                    except json.JSONDecodeError:
                        pass
                    pkg_buffer = ""
                else:
                    pkg_buffer += line + "\n"

        except Exception:
            pass

        return self._package_deps

    def go_anchor_package(self, file_path: Path) -> str:
        """计算锚点文件所属的 Go 包路径"""
        module = self.module_name
        if not module:
            return ""
        relative_dir = file_path.relative_to(self.repo_root).parent.as_posix()
        return module if relative_dir == "." else f"{module}/{relative_dir}"

    def go_anchor_package_relative(self, file_path: Path) -> str:
        """计算锚点文件所属的仓库相对包路径"""
        return file_path.relative_to(self.repo_root).parent.as_posix()

    def iter_go_imports(self, importer: Path) -> list[tuple[int, str]]:
        """解析 Go 文件中的所有 import 语句"""
        text = safe_read_text(importer)
        imports: list[tuple[int, str]] = []
        in_block = False

        for line_number, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()

            if stripped.startswith("import ("):
                in_block = True
                continue
            if in_block and stripped == ")":
                in_block = False
                continue

            match = None
            if in_block:
                match = GO_BLOCK_IMPORT_RE.match(line)
            else:
                match = GO_SINGLE_IMPORT_RE.match(line)

            if match:
                imports.append((line_number, match.group(1)))

        return imports

    def resolve_import(
        self,
        import_path: str,
        file_path: Path,
    ) -> tuple[str, str, str]:
        """
        解析单个 import 路径。

        Returns:
            (target, resolution, confidence)
            - target: 包路径或 "external:..." 标记
            - resolution: "resolved" | "unresolved" | "external"
            - confidence: "high" | "medium" | "low"
        """
        module = self.module_name

        if module and import_path.startswith(module):
            # 内部包引用
            relative_dir = import_path[len(module):].lstrip("/")
            target = relative_dir or "."
            return target, "resolved", "high"

        elif import_path.startswith("."):
            # 相对导入
            current_pkg = self.go_anchor_package(file_path)
            if not current_pkg:
                return import_path, "unresolved", "low"
            # 计算相对路径对应的包
            pkg_parts = current_pkg.split("/")
            dot_count = len(import_path) - len(import_path.lstrip("."))
            if dot_count:
                keep = max(0, len(pkg_parts) - (dot_count - 1))
                base = pkg_parts[:keep]
            else:
                base = []
            remainder = import_path.lstrip(".")
            if remainder:
                base.extend(p for p in remainder.split(".") if p)
            target = "/".join(base)
            return target, "resolved", "high"

        else:
            # 外部包
            return f"external:{import_path}", "external", "medium"

    def iter_file_edges(self, importer: Path) -> list[dict]:
        """解析单个 Go 文件的导入边"""
        imports = self.iter_go_imports(importer)
        edges: list[dict] = []
        anchor_relative = repo_relative(importer, self.repo_root)

        for line_number, import_path in imports:
            target, resolution, confidence = self.resolve_import(import_path, importer)

            if resolution == "external":
                target = f"external:{import_path}"

            edges.append({
                "source_file": anchor_relative,
                "target": target,
                "edge_kind": "import",
                "evidence_ref": f"{anchor_relative}:{line_number}",
                "confidence": confidence,
                "resolution": resolution,
                "symbol": "",
            })

        return edges

    def resolve_inbound_edges(
        self,
        anchor_file: Path,
        candidates: list[Path],
    ) -> list[dict]:
        """
        解析锚点文件的入边，精度提升到包级（而非目录级近似）。

        通过 go list 获取精确的包依赖图，结合 import 路径解析，
        判断候选文件是否真正依赖锚点文件所在包。

        Returns:
            入边列表
        """
        anchor_pkg = self.go_anchor_package(anchor_file)
        anchor_pkg_relative = self.go_anchor_package_relative(anchor_file)
        if not anchor_pkg or not anchor_pkg_relative:
            return []

        anchor_relative = repo_relative(anchor_file, self.repo_root)
        pkg_deps = self.get_package_deps()
        edges: list[dict] = []

        for candidate in candidates:
            if candidate == anchor_file:
                continue

            candidate_pkg = self.go_anchor_package(candidate)
            if not candidate_pkg:
                continue

            candidate_edges = self.iter_file_edges(candidate)

            for edge in candidate_edges:
                target = edge["target"]

                # 判断是否指向锚点包
                if target == anchor_pkg_relative or target == ".":
                    # 候选文件的包直接依赖锚点包
                    edges.append({
                        "from": repo_relative(candidate, self.repo_root),
                        "to": anchor_relative,
                        "direction": "inbound",
                        "edge_kind": edge["edge_kind"],
                        "symbol": edge["symbol"],
                        "evidence_ref": edge["evidence_ref"],
                        "confidence": "high",  # 基于 go list 包依赖，提升置信度
                        "resolution": "resolved",
                    })
                elif pkg_deps:
                    # 间接依赖：候选包的依赖列表包含锚点包
                    target_pkg = target if target.startswith(self.module_name) else (
                        f"{self.module_name}/{target}" if self.module_name and target not in {"", "."} else target
                    )
                    if anchor_pkg in pkg_deps.get(target_pkg, set()):
                        edges.append({
                            "from": repo_relative(candidate, self.repo_root),
                            "to": anchor_relative,
                            "direction": "inbound",
                            "edge_kind": edge["edge_kind"],
                            "symbol": edge["symbol"],
                            "evidence_ref": edge["evidence_ref"],
                            "confidence": "medium",  # 间接依赖
                            "resolution": "resolved",
                        })

        return edges

    def is_available(self) -> bool:
        """检查 Go 解析器是否可用"""
        return self._check_go()


def iter_go_imports_standalone(importer: Path) -> list[tuple[int, str]]:
    """Standalone 函数，供 collect_code_edges.py 的原有逻辑降级使用"""
    text = safe_read_text(importer)
    imports: list[tuple[int, str]] = []
    in_block = False

    for line_number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()

        if stripped.startswith("import ("):
            in_block = True
            continue
        if in_block and stripped == ")":
            in_block = False
            continue

        match = None
        if in_block:
            match = GO_BLOCK_IMPORT_RE.match(line)
        else:
            match = GO_SINGLE_IMPORT_RE.match(line)

        if match:
            imports.append((line_number, match.group(1)))

    return imports

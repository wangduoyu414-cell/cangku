from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

from common import normalize_path, repo_relative, safe_read_text


# ---- Makefile 解析 ----

MAKEFILE_PATTERNS = {
    "simple_target": re.compile(r"^\s*([A-Za-z_][\w\-]*)\s*:\s*(.*)$"),
    "pattern_target": re.compile(r"^\s*(%|[A-Za-z_][\w\-]*%[\w\-]*)\s*:\s*(.*)$"),
}


def parse_makefile_targets(repo_root: Path) -> dict[str, dict[str, Any]]:
    """
    解析 Makefile 中的 target 及其依赖关系。

    输出：
    {
        "build": {
            "deps": ["src/a.o", "src/b.o"],
            "recipe_lines": 3,
            "phony": False,
        }
    }
    """
    targets: dict[str, dict[str, Any]] = {}
    makefile_candidates = [
        repo_root / "Makefile",
        repo_root / "makefile",
        repo_root / "GNUmakefile",
        repo_root / "build/Makefile",
    ]

    for mf_path in makefile_candidates:
        if not mf_path.exists():
            continue

        text = safe_read_text(mf_path)
        current_recipe_lines = 0
        in_recipe = False

        for raw_line in text.splitlines():
            line = raw_line.rstrip()
            # 跳过注释和空行
            if not line or line.strip().startswith("#"):
                continue

            # 检查是否是 target 行
            match = MAKEFILE_PATTERNS["simple_target"].match(line)
            if match:
                target_name = match.group(1)
                deps_raw = match.group(2).strip()

                # 简单依赖解析
                deps = [d.strip() for d in re.split(r"\s+", deps_raw) if d.strip()]

                # 判断是否是 .PHONY
                is_phony = target_name in {".PHONY", ".DEFAULT", ".IGNORE", ".SILENT"}

                targets[target_name] = {
                    "deps": deps,
                    "recipe_lines": 0,
                    "phony": is_phony,
                    "makefile": repo_relative(mf_path, repo_root),
                }
                in_recipe = True
                current_recipe_lines = 0
                continue

            # Tab 开头的行 = recipe
            if line.startswith("\t") and in_recipe:
                current_recipe_lines += 1
                if targets:
                    last_target = next(reversed(targets.values()))
                    last_target["recipe_lines"] = current_recipe_lines

    return targets


def trace_file_to_makefile_targets(
    file_path: Path,
    repo_root: Path,
) -> list[dict[str, Any]]:
    """
    追踪源文件到其所属的 Makefile target。

    返回命中 target 列表。
    """
    rel_path = repo_relative(file_path, repo_root)
    results: list[dict[str, Any]] = []

    targets = parse_makefile_targets(repo_root)
    for target_name, target_info in targets.items():
        deps = target_info.get("deps", [])
        matched_dep = None
        for dep in deps:
            # 精确匹配或 glob 模式
            if dep == rel_path or _glob_match(dep, rel_path):
                matched_dep = dep
                break
            # 前缀匹配（如 src/a.o 匹配 src/*.o）
            if "*" in dep:
                import fnmatch
                if fnmatch.fnmatch(rel_path, dep):
                    matched_dep = dep
                    break

        if matched_dep:
            results.append({
                "system": "make",
                "target": target_name,
                "matched_dependency": matched_dep,
                "confidence": "high",
                "makefile": target_info.get("makefile", ""),
            })

    return results


# ---- npm package.json scripts 解析 ----


def trace_file_to_npm_scripts(
    file_path: Path,
    repo_root: Path,
) -> list[dict[str, Any]]:
    """
    追踪源文件到 package.json scripts 中的引用。
    """
    rel_path = repo_relative(file_path, repo_root)
    file_name = file_path.name
    results: list[dict[str, Any]] = []

    pkg_json = repo_root / "package.json"
    if not pkg_json.exists():
        return results

    try:
        pkg = json.loads(safe_read_text(pkg_json))
    except Exception:
        return results

    scripts = pkg.get("scripts", {})
    dependencies = pkg.get("dependencies", {})
    dev_dependencies = pkg.get("devDependencies", {})

    for script_name, cmd in scripts.items():
        cmd_str = str(cmd)
        matched = False
        matched_type = ""

        if rel_path in cmd_str or file_name in cmd_str:
            matched = True
            matched_type = "direct_path"
        elif f"./{rel_path}" in cmd_str:
            matched = True
            matched_type = "relative_path"

        # 检查是否作为依赖包引用
        for dep_name, dep_path in list(dependencies.items()) + list(dev_dependencies.items()):
            if isinstance(dep_path, str) and (file_name in dep_path or rel_path in dep_path):
                matched = True
                matched_type = f"dependency:{dep_name}"
                break

        if matched:
            results.append({
                "system": "npm",
                "script": script_name,
                "command": cmd_str,
                "matched_type": matched_type,
                "confidence": "medium",
            })

    return results


# ---- Go build targets 解析 ----


def trace_file_to_go_targets(
    file_path: Path,
    repo_root: Path,
) -> list[dict[str, Any]]:
    """
    追踪源文件到 Go build target 的关联。
    """
    rel_path = repo_relative(file_path, repo_root)
    results: list[dict[str, Any]] = []

    # 读取 go.mod 确定 module 名
    go_mod = repo_root / "go.mod"
    module_name = ""
    if go_mod.exists():
        for line in safe_read_text(go_mod).splitlines():
            if line.startswith("module "):
                module_name = line.split(" ", 1)[1].strip()
                break

    if not module_name:
        return results

    file_pkg_dir = file_path.parent.relative_to(repo_root).as_posix()
    file_pkg = f"{module_name}/{file_pkg_dir}" if file_pkg_dir != "." else module_name

    # 检查 main 包文件
    if file_path.name == "main.go":
        results.append({
            "system": "go",
            "target_type": "main_package",
            "package": file_pkg,
            "command": "go build ./...",
            "confidence": "high",
        })

    # 尝试调用 go list 验证包
    try:
        result = subprocess.run(
            ["go", "list", "-f", "{{.ImportPath}}", file_pkg],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            results.append({
                "system": "go",
                "target_type": "package",
                "package": result.stdout.strip(),
                "command": f"go build {result.stdout.strip()}",
                "confidence": "high",
            })
    except Exception:
        pass

    return results


# ---- CMake 基础解析 ----


def trace_file_to_cmake_targets(
    file_path: Path,
    repo_root: Path,
) -> list[dict[str, Any]]:
    """
    追踪源文件到 CMake target 的关联。
    """
    rel_path = repo_relative(file_path, repo_root)
    results: list[dict[str, Any]] = []

    cmake_files = list(repo_root.rglob("CMakeLists.txt"))
    cmake_files.extend(repo_root.rglob("*.cmake"))

    for cmake_path in cmake_files:
        try:
            text = safe_read_text(cmake_path)
        except Exception:
            continue

        for line in text.splitlines():
            line = line.strip()
            # add_executable, add_library
            match = re.search(
                r"add_(executable|library)\s*\(\s*(\w+)\s+(.*?)\s*\)",
                line,
                re.DOTALL,
            )
            if match:
                target_type = match.group(1)
                target_name = match.group(2)
                sources = match.group(3)

                if rel_path in sources or file_path.name in sources:
                    results.append({
                        "system": "cmake",
                        "target_type": target_type,
                        "target": target_name,
                        "cmake_file": repo_relative(cmake_path, repo_root),
                        "confidence": "high",
                    })

    return results


# ---- 统一入口 ----


def trace_file_to_build_targets(
    file_path: Path,
    repo_root: Path,
) -> list[dict[str, Any]]:
    """
    统一入口：追踪源文件到所有已知构建系统的 target 关联。

    按优先级返回结果（Makefile > npm > Go > CMake）。
    """
    all_results: list[dict[str, Any]] = []

    all_results.extend(trace_file_to_makefile_targets(file_path, repo_root))
    all_results.extend(trace_file_to_npm_scripts(file_path, repo_root))
    all_results.extend(trace_file_to_go_targets(file_path, repo_root))
    all_results.extend(trace_file_to_cmake_targets(file_path, repo_root))

    # 去重（按 system + target 组合）
    seen: set[tuple] = set()
    unique_results: list[dict[str, Any]] = []
    for r in all_results:
        key = (r.get("system", ""), r.get("target", "") or r.get("script", "") or r.get("package", ""))
        if key not in seen:
            seen.add(key)
            unique_results.append(r)

    return unique_results


def _glob_match(pattern: str, path: str) -> bool:
    """简单 glob 匹配（仅支持 *）"""
    if "*" not in pattern:
        return False
    import fnmatch
    return fnmatch.fnmatch(path, pattern)

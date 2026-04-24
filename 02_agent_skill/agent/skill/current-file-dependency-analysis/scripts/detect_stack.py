from __future__ import annotations

import argparse
from pathlib import Path

from common import detect_language, find_repo_root, normalize_path, read_json, write_json


STACK_REFERENCE = {
    "typescript": "references/ts-edge-rules.md",
    "python": "references/py-edge-rules.md",
    "go": "references/go-edge-rules.md",
}


def score_stack(repo_root: Path, file_path: Path) -> tuple[str, int, list[str]]:
    scores = {
        "typescript": 0,
        "python": 0,
        "go": 0,
    }
    reasons: dict[str, list[str]] = {
        "typescript": [],
        "python": [],
        "go": [],
    }

    language = detect_language(file_path)
    if language == "typescript":
        scores["typescript"] += 4
        reasons["typescript"].append(f"file extension suggests {language}")
    elif language == "python":
        scores["python"] += 4
        reasons["python"].append(f"file extension suggests {language}")
    elif language == "go":
        scores["go"] += 4
        reasons["go"].append(f"file extension suggests {language}")

    repo_checks = {
        "typescript": ("package.json", "tsconfig.json", "pnpm-lock.yaml", "yarn.lock"),
        "python": ("pyproject.toml", "requirements.txt", "setup.py", "tox.ini"),
        "go": ("go.mod",),
    }

    for stack, markers in repo_checks.items():
        for marker in markers:
            if (repo_root / marker).exists():
                scores[stack] += 2
                reasons[stack].append(f"found {marker}")

    # 当所有分数为0时，使用文件扩展名检测的语言
    all_zero = all(v == 0 for v in scores.values())
    if all_zero:
        language = detect_language(file_path)
        if language in scores:
            best_stack = language
        else:
            best_stack = "unknown"
    else:
        best_stack = max(scores, key=scores.get)

    final_score = scores.get(best_stack, 0)
    return best_stack, final_score, reasons.get(best_stack, [])


def main() -> None:
    parser = argparse.ArgumentParser(description="Detect the dominant stack family for a file-centered workflow.")
    parser.add_argument("--anchor", help="Path to anchor JSON produced by resolve_anchor.py.")
    parser.add_argument("--file", help="Path to the current file when no anchor JSON is supplied.")
    parser.add_argument("--repo-root", help="Optional repository root override.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    if args.anchor:
        anchor = read_json(args.anchor)
        file_path = normalize_path(anchor["file_path"])
        repo_root = normalize_path(anchor["repo_root"])
    else:
        if not args.file:
            raise SystemExit("--file is required when --anchor is not provided")
        file_path = normalize_path(args.file)
        repo_root = normalize_path(args.repo_root) if args.repo_root else find_repo_root(file_path)

    best_stack, score, reasons = score_stack(repo_root, file_path)
    confidence = "high" if score >= 6 else "medium" if score >= 4 else "low"
    payload = {
        "stack_family": best_stack,
        "stack_id": f"{best_stack}-stack",
        "confidence": confidence,
        "reasons": reasons,
        "reference_file": STACK_REFERENCE.get(best_stack, ""),
        "repo_root": repo_root.as_posix(),
        "file_path": file_path.as_posix(),
    }
    write_json(payload, args.output)


if __name__ == "__main__":
    main()

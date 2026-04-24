from __future__ import annotations

import argparse

from common import classify_role, detect_language, find_repo_root, normalize_path, repo_relative, write_json


def main() -> None:
    parser = argparse.ArgumentParser(description="Resolve the current file into a repository anchor.")
    parser.add_argument("--file", required=True, help="Path to the current file.")
    parser.add_argument("--repo-root", help="Optional repository root override.")
    parser.add_argument("--symbol", default="", help="Optional current symbol name.")
    parser.add_argument("--selection-range", default="", help="Optional editor selection range.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    file_path = normalize_path(args.file)
    repo_root = normalize_path(args.repo_root) if args.repo_root else find_repo_root(file_path)

    payload = {
        "repo_root": repo_root.as_posix(),
        "file_path": file_path.as_posix(),
        "repo_relative_path": repo_relative(file_path, repo_root),
        "symbol": args.symbol,
        "selection_range": args.selection_range,
        "language": detect_language(file_path),
        "role_hint": classify_role(file_path),
    }
    write_json(payload, args.output)


if __name__ == "__main__":
    main()

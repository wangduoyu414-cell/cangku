from __future__ import annotations

import importlib
import json
from pathlib import Path

from src.app.interfaces.http_controller import post_order


def run_cli() -> dict:
    payload = {"vendor": "ACME", "sku": " RTX 5090 "}
    result = post_order(payload)
    Path("tmp/order_result.json").write_text(json.dumps(result), encoding="utf-8")
    importlib.import_module("src.app.shared.utils")
    return result


if __name__ == "__main__":
    print(run_cli())

from __future__ import annotations

from src.app.application.use_cases import create_order


def post_order(payload: dict) -> dict:
    return create_order(payload["vendor"], payload["sku"])

from __future__ import annotations

from src.app.domain.order_service import build_order_key


def create_order(vendor: str, sku: str) -> dict:
    key = build_order_key(vendor, sku)
    return {"order_key": key, "status": "created"}

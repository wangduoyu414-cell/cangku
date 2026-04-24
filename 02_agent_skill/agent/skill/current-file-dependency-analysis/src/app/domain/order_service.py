from __future__ import annotations

from src.app.shared.utils import normalize_sku


def build_order_key(vendor: str, sku: str) -> str:
    return f"{vendor.lower()}::{normalize_sku(sku)}"

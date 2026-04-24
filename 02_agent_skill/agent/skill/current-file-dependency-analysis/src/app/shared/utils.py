from __future__ import annotations


def normalize_sku(sku: str) -> str:
    return sku.strip().upper().replace(" ", "-")

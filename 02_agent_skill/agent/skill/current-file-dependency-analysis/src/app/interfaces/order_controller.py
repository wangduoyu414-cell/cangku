from __future__ import annotations

from src.app.application.use_cases import create_order
from src.app.interfaces.base_controller import BaseController


class OrderController(BaseController):
    def create(self, payload: dict) -> dict:
        created = create_order(payload["vendor"], payload["sku"])
        return self.ok(created)

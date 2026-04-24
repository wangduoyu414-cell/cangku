from __future__ import annotations


class BaseController:
    def ok(self, payload: dict) -> dict:
        return {"ok": True, "payload": payload}

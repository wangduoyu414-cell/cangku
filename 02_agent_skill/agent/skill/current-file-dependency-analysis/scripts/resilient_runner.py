from __future__ import annotations

import subprocess
import time
import traceback
from typing import Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class StageStatus(Enum):
    SUCCESS = "success"
    DEGRADED = "degraded"
    FAILED = "failed"


@dataclass
class StageResult:
    status: StageStatus
    data: Any
    error: str | None = None
    stage_name: str = ""
    attempts: int = 0
    duration_ms: float = 0.0
    degraded_from: str | None = None  # 从哪个原始功能降级


@dataclass
class FallbackDef:
    """降级函数定义"""
    name: str
    fn: Callable[[], Any]
    reason: str = ""


class ResilientTaskRunner:
    """
    带重试和优雅降级的任务执行器。

    优点：
    - 外部工具瞬时故障自动重试，提升可靠性
    - 明确区分 success/degraded/failed，产出仍可使用
    - 保留错误上下文供调试
    - 降级可追溯（记录从哪个功能降级）

    局限性：
    - 重试次数有限，对持续性故障无效
    - 降级输出质量低于正常输出

    风险：
    - 降级模式可能被错误地当作正常结果使用
    """

    def __init__(
        self,
        max_retries: int = 2,
        timeout: float = 30.0,
        base_delay: float = 0.5,
    ):
        self.max_retries = max_retries
        self.timeout = timeout
        self.base_delay = base_delay
        self._fallbacks: dict[str, FallbackDef] = {}

    def register_fallback(
        self,
        stage: str,
        fallback_fn: Callable[[], Any],
        reason: str = "",
    ) -> None:
        """注册降级函数"""
        self._fallbacks[stage] = FallbackDef(
            name=stage,
            fn=fallback_fn,
            reason=reason,
        )

    def run(
        self,
        stage: str,
        primary_fn: Callable[[], Any],
        stage_name: str = "",
    ) -> StageResult:
        """
        执行任务，自动处理重试和降级。

        Args:
            stage: 阶段标识符
            primary_fn: 主要执行函数
            stage_name: 人类可读的阶段名称

        Returns:
            StageResult，包含 status/data/error 信息
        """
        start_time = time.time()
        last_error: Exception | None = None
        attempts = 0

        for attempt in range(self.max_retries + 1):
            attempts += 1
            try:
                result = primary_fn()
                duration = (time.time() - start_time) * 1000
                return StageResult(
                    status=StageStatus.SUCCESS,
                    data=result,
                    stage_name=stage_name or stage,
                    attempts=attempts,
                    duration_ms=round(duration, 2),
                )
            except FileNotFoundError as e:
                # 外部工具缺失，立即降级，不重试
                last_error = e
                break
            except subprocess.TimeoutExpired as e:
                last_error = e
                if attempt < self.max_retries:
                    delay = self.base_delay * (attempt + 1)
                    time.sleep(delay)
            except PermissionError as e:
                # 权限问题不重试
                last_error = e
                break
            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    time.sleep(self.base_delay)

        duration = (time.time() - start_time) * 1000

        # 尝试降级
        if stage in self._fallbacks:
            fb = self._fallbacks[stage]
            try:
                fallback_result = fb.fn()
                return StageResult(
                    status=StageStatus.DEGRADED,
                    data=fallback_result,
                    stage_name=stage_name or stage,
                    attempts=attempts,
                    duration_ms=round(duration, 2),
                    degraded_from=fb.reason or stage,
                    error=str(last_error),
                )
            except Exception:
                pass

        # 完全失败
        return StageResult(
            status=StageStatus.FAILED,
            data=None,
            error=str(last_error),
            stage_name=stage_name or stage,
            attempts=attempts,
            duration_ms=round(duration, 2),
        )


def run_pipeline(
    stages: list[tuple[str, Callable[[], Any], str]],
    runner: ResilientTaskRunner | None = None,
) -> tuple[dict[str, StageResult], bool]:
    """
    运行完整流水线，返回各阶段结果。

    Args:
        stages: [(stage_id, fn, description), ...]
        runner: 可选的 ResilientTaskRunner 实例

    Returns:
        (stage_results, all_success)
        - stage_results: 阶段 ID -> StageResult 的映射
        - all_success: 所有阶段是否都达到 success（不含 degraded）
    """
    if runner is None:
        runner = ResilientTaskRunner()

    results: dict[str, StageResult] = {}
    for stage_id, fn, description in stages:
        result = runner.run(stage_id, fn, stage_name=description)
        results[stage_id] = result
        # 关键阶段失败可提前终止
        if result.status == StageStatus.FAILED and stage_id in {
            "resolve_anchor",
            "detect_stack",
            "collect_code_edges",
        }:
            break

    all_success = all(r.status == StageStatus.SUCCESS for r in results.values())
    return results, all_success

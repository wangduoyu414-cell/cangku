"""
Eval runner: trigger + scenario selection check.

Evaluates:
1. Trigger decisions - did the model correctly decide to trigger/not-trigger this skill?
2. Scenario pack selection - did the model select the right packs?

Usage:
    python scripts/eval_trigger_and_scenario.py --trigger evals/trigger.json
    python scripts/eval_trigger_and_scenario.py --scenarios evals/scenario-selection-cases.json
    python scripts/eval_trigger_and_scenario.py --all
    python scripts/eval_trigger_and_scenario.py --verbose --json

Exit codes:
    0 - all checks passed
    1 - one or more checks failed
    2 - usage error or file not found
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Trigger evaluation
# ---------------------------------------------------------------------------

SUPPORTED_LANGUAGE_PATTERNS = {
    "python": [
        r"\bpython\b",
        r"\.py\b",
        r"\bpytest\b",
        r"\bpyproject\.toml\b",
    ],
    "go": [
        r"\bgo\b",
        r"\.go\b",
        r"\bgo test\b",
        r"\bgo\.mod\b",
        r"\bgolang\b",
    ],
    "typescript": [
        r"\btypescript\b",
        r"\bts\b",
        r"\.ts\b",
        r"\.tsx\b",
        r"\btsconfig\.json\b",
    ],
    "javascript": [
        r"\bjavascript\b",
        r"\bnode\b",
        r"\.js\b",
        r"\.jsx\b",
        r"\bpackage\.json\b",
        r"\bnode --test\b",
    ],
    "vue": [
        r"\bvue\b",
        r"\.vue\b",
        r"\bhydration\b",
        r"\bssr\b",
        r"服务端渲染",
        r"同构激活",
    ],
}

UNSUPPORTED_LANGUAGE_PATTERNS = {
    "rust": [r"\brust\b", r"\.rs\b", r"\bcargo\b"],
    "kotlin": [r"\bkotlin\b", r"\.kt\b", r"\bandroid\b"],
    "java": [r"\bjava\b", r"\.java\b", r"\bmaven\b", r"\bgradle\b"],
    "sql": [r"\bsql\b", r"\bmigration\b", r"\.sql\b"],
    "csharp": [r"\bc#\b", r"\bcsharp\b", r"\.cs\b", r"\bdotnet\b"],
    "cpp": [r"\bc\+\+\b", r"\.cpp\b", r"\.hpp\b"],
}

ACTION_PATTERNS = [
    r"\bfix\b",
    r"\bimplement\b",
    r"\badd\b",
    r"\bpatch\b",
    r"\bwrite\b",
    r"\bcomplete\b",
    r"\bmodify\b",
    r"\bupdate\b",
    r"\brepair\b",
    r"\bfinish\b",
    r"\bfill in\b",
    r"\bchange\b",
    r"\bbug\b",
    r"修",
    r"修复",
    r"补全",
    r"补充",
    r"添加",
    r"新增",
    r"实现",
    r"写一个",
    r"完成",
    r"修改",
    r"更新",
    r"增加",
    r"加个",
    r"加上",
    r"加日志",
    r"加默认值",
    r"加重试",
    r"加缓存",
    r"改",
    r"改成",
    r"改为",
    r"改一下",
    r"修一下",
    r"处理.*bug",
]

CONTRACT_FIRST_PATTERNS = [
    r"\bpre-?generation contract\b",
    r"\bcontract[- ]first\b",
    r"\bbefore writing code\b.*\bcontract\b",
    r"\bfirst\b.*\bcontract\b",
    r"先出.*契约",
    r"先给.*契约",
    r"先给.*contract",
    r"先别写代码.*契约",
]

TARGET_PATTERNS = [
    r"\bfunction\b",
    r"\bhandler\b",
    r"\bclient\b",
    r"\bcomponent\b",
    r"\bmodule\b",
    r"\bclass\b",
    r"\bmethod\b",
    r"\bprops?\b",
    r"\bapi\b",
    r"\bcache\b",
    r"\bretry\b",
    r"\bexport\b",
    r"\bwebhook\b",
    r"\bworker\b",
    r"\bbatch\b",
    r"\bcontract\b",
    r"\bvalidation\b",
    r"代码",
    r"\.(?:py|go|ts|tsx|js|jsx|vue)\b",
    r"`[^`]+\.(?:py|go|ts|tsx|js|jsx|vue)`",
    r"函数",
    r"模块",
    r"组件",
    r"类",
    r"方法",
    r"属性",
    r"接口",
    r"缓存",
    r"重试",
    r"导出",
    r"批处理",
    r"webhook",
    r"worker",
]

RISK_CONTEXT_PATTERNS = [
    r"\bdefault\b",
    r"\bfallback\b",
    r"\breplay\b",
    r"\bidempotent\b",
    r"\bretry\b",
    r"\btimeout\b",
    r"\bpartial success\b",
    r"\bdead.?letter\b",
    r"\btimezone\b",
    r"\butc\b",
    r"\bcurrency\b",
    r"\bdecimal\b",
    r"\bcsv\b",
    r"\bencoding\b",
    r"\baudit\b",
    r"\bredact(?:ion)?\b",
    r"\bsignature\b",
    r"\bresponse\b",
    r"\bstatus code\b",
    r"默认",
    r"回退",
    r"幂等",
    r"去重",
    r"重放",
    r"重试",
    r"超时",
    r"部分成功",
    r"死信",
    r"时区",
    r"UTC",
    r"金额",
    r"精度",
    r"CSV",
    r"编码",
    r"审计",
    r"脱敏",
    r"签名",
    r"状态码",
    r"时间",
    r"日期",
    r"时区",
]

NON_IMPLEMENTATION_PATTERNS = [
    r"\bexplain\b",
    r"\bdescribe\b",
    r"\banalyze\b",
    r"\bunderstand\b",
    r"\breview\b",
    r"\bplan\b",
    r"\bdesign\b",
    r"\bstrategy\b",
    r"\brecommend\b",
    r"\bsuggestion\b",
    r"\bcompare\b",
    r"\blist\b",
    r"\bwhy\b",
    r"\bshould\b",
    r"解释",
    r"说明",
    r"分析",
    r"理解",
    r"评审",
    r"代码审查",
    r"计划",
    r"设计",
    r"策略",
    r"建议",
    r"对比",
    r"列出",
    r"为什么",
    r"帮我找",
]

STRONG_NON_IMPLEMENTATION_PATTERNS = [
    r"\barchitecture\b",
    r"\bdiagram\b",
    r"\bframework\b",
    r"\btech stack\b",
    r"\bperformance\b",
    r"\brefactor\b",
    r"架构",
    r"架构图",
    r"选型",
    r"项目计划",
    r"性能分析",
    r"重构整个",
]

LOCAL_IMPLEMENTATION_HINTS = [
    r"这个函数",
    r"这段代码",
    r"当前模块",
    r"这个组件",
    r"这个接口",
    r"this function",
    r"this module",
    r"this component",
    r"this handler",
]


@dataclass
class TriggerResult:
    case_id: str
    text: str
    language: str
    expected: bool
    expected_decision: str = "activate"
    predicted: bool = False
    predicted_decision: str = "do_not_activate"
    correct: bool = False
    reasoning: str = ""
    keywords_matched: list[str] = field(default_factory=list)
    keywords_rejected: list[str] = field(default_factory=list)
    stack_status: str = "unknown"
    normalized_language: str = "unknown"

    @property
    def passed(self) -> bool:
        return self.correct


@dataclass
class ActivationDecision:
    decision: str
    stack_status: str
    normalized_language: str
    matched: list[str]
    rejected: list[str]


def find_matches(patterns: list[str], text: str) -> list[str]:
    return [pattern for pattern in patterns if re.search(pattern, text, re.IGNORECASE)]


def normalize_language(language: str | None) -> str | None:
    if not language:
        return None
    normalized = language.strip().lower()
    aliases = {
        "ts": "typescript",
        "tsx": "typescript",
        "js": "javascript",
        "jsx": "javascript",
        "py": "python",
        "golang": "go",
    }
    return aliases.get(normalized, normalized)


def detect_stack_scope(text: str, explicit_language: str | None = None) -> tuple[str, str, list[str]]:
    normalized_language = normalize_language(explicit_language)
    matched: list[str] = []

    if normalized_language in SUPPORTED_LANGUAGE_PATTERNS:
        return "supported", normalized_language, [f"explicit:{normalized_language}"]
    if normalized_language in UNSUPPORTED_LANGUAGE_PATTERNS:
        return "unsupported", normalized_language, [f"explicit:{normalized_language}"]

    supported_hits: dict[str, list[str]] = {}
    for language, patterns in SUPPORTED_LANGUAGE_PATTERNS.items():
        hits = find_matches(patterns, text)
        if hits:
            supported_hits[language] = hits

    unsupported_hits: dict[str, list[str]] = {}
    for language, patterns in UNSUPPORTED_LANGUAGE_PATTERNS.items():
        hits = find_matches(patterns, text)
        if hits:
            unsupported_hits[language] = hits

    if len(supported_hits) == 1 and not unsupported_hits:
        language, hits = next(iter(supported_hits.items()))
        return "supported", language, hits

    if len(unsupported_hits) == 1 and not supported_hits:
        language, hits = next(iter(unsupported_hits.items()))
        return "unsupported", language, hits

    if supported_hits and unsupported_hits:
        for hits in supported_hits.values():
            matched.extend(hits)
        for hits in unsupported_hits.values():
            matched.extend(hits)
        return "unknown", "unknown", matched

    return "unknown", "unknown", []


def evaluate_trigger(text: str, language: str | None = None) -> ActivationDecision:
    """
    Evaluate how this skill should activate for a request.

    Decisions:
    - activate
    - recover_anchor_then_activate
    - do_not_activate
    """

    matched_actions = find_matches(ACTION_PATTERNS, text)
    matched_contract_first = find_matches(CONTRACT_FIRST_PATTERNS, text)
    matched_targets = find_matches(TARGET_PATTERNS, text)
    matched_risks = find_matches(RISK_CONTEXT_PATTERNS, text)
    rejected = find_matches(NON_IMPLEMENTATION_PATTERNS, text)
    strong_rejected = find_matches(STRONG_NON_IMPLEMENTATION_PATTERNS, text)
    local_hints = find_matches(LOCAL_IMPLEMENTATION_HINTS, text)
    stack_status, normalized_language, stack_matches = detect_stack_scope(text, language)

    has_action = bool(matched_actions or matched_contract_first)
    has_target = bool(matched_targets or local_hints)
    has_risk = bool(matched_risks)
    has_concrete_impl = has_action and (has_target or has_risk or bool(matched_contract_first))
    matched = (
        matched_actions
        + matched_contract_first
        + matched_targets
        + matched_risks
        + local_hints
        + stack_matches
    )

    # Strong non-implementation framing only blocks when it dominates the request.
    # Mixed prompts such as "fix this function and explain the architecture impact"
    # should still be allowed through when the implementation ask is concrete.
    if strong_rejected and not has_concrete_impl:
        return ActivationDecision(
            decision="do_not_activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected + strong_rejected,
        )

    if stack_status == "unsupported":
        return ActivationDecision(
            decision="do_not_activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected + [f"unsupported:{normalized_language}"],
        )

    if rejected and not has_action:
        return ActivationDecision(
            decision="do_not_activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected,
        )

    if rejected and has_action and not (has_target or has_risk):
        return ActivationDecision(
            decision="do_not_activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected,
        )

    if not has_action:
        return ActivationDecision(
            decision="do_not_activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected,
        )

    if stack_status == "unknown":
        return ActivationDecision(
            decision="recover_anchor_then_activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected,
        )

    if matched_contract_first:
        return ActivationDecision(
            decision="activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected,
        )

    if has_target or has_risk:
        return ActivationDecision(
            decision="activate",
            stack_status=stack_status,
            normalized_language=normalized_language,
            matched=matched,
            rejected=rejected,
        )

    return ActivationDecision(
        decision="recover_anchor_then_activate",
        stack_status=stack_status,
        normalized_language=normalized_language,
        matched=matched,
        rejected=rejected,
    )


def run_trigger_eval(trigger_path: str, verbose: bool = False) -> list[TriggerResult]:
    path = Path(trigger_path)
    if not path.exists():
        raise FileNotFoundError(f"Trigger eval file not found: {path}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    results: list[TriggerResult] = []

    def build_result(case: dict, default_decision: str) -> TriggerResult:
        text = case.get("text", "")
        language = case.get("language", "unknown")
        expected_decision = case.get("expected_decision", default_decision)
        decision = evaluate_trigger(text, language=language)
        predicted = decision.decision == "activate"
        expected_bool = case.get("expected_trigger", expected_decision == "activate")
        result = TriggerResult(
            case_id=case.get("id", "unknown"),
            text=text,
            language=language,
            expected=expected_bool,
            expected_decision=expected_decision,
            predicted=predicted,
            predicted_decision=decision.decision,
            correct=decision.decision == expected_decision,
            reasoning=case.get("reason", ""),
            keywords_matched=decision.matched,
            keywords_rejected=decision.rejected,
            stack_status=decision.stack_status,
            normalized_language=decision.normalized_language,
        )
        return result

    for case in data.get("should_trigger", []):
        result = build_result(case, "activate")
        results.append(result)

    for case in data.get("should_not_trigger", []):
        result = build_result(case, "do_not_activate")
        results.append(result)

    for case in data.get("recover_anchor_then_activate", []):
        result = build_result(case, "recover_anchor_then_activate")
        results.append(result)

    return results


# ---------------------------------------------------------------------------
# Scenario selection evaluation
# ---------------------------------------------------------------------------

A_GENERIC_PATTERNS = [
    r"\bparse\b",
    r"\binput\b",
    r"\bvalidat(?:e|es|ion)\b",
    r"\bpayload\b",
    r"\bparams?\b",
    r"\bargs?\b",
    r"\bjson\b",
    r"\bprops?\b",
    r"\bpath\b",
    r"\bquery\b",
    r"\bbody\b",
    r"\bheader\b",
    r"\bdate\b",
    r"\bdatetime\b",
    r"\bfilename\b",
    r"\bcsv\b",
    r"\btsv\b",
    r"\bread file\b",
    r"\bpatch\b",
    r"\bpartial update\b",
    r"\bmerge\b",
    r"\bschema\b",
    r"\bversion\b",
    r"\bcompatibilit(?:y|ies)\b",
    r"\bcli\b",
    r"\bcommand line\b",
    r"\bflags?\b",
    r"\bargv\b",
    r"\bbatch\b",
    r"\bitems?\b",
    r"\bevents?\b",
    r"\bdelivery id\b",
    r"\bevent id\b",
    r"\bsignature\b",
    r"\border(?:ing)?\b",
    r"\bsort\b",
    r"\bfilter\b",
    r"\breduce\b",
    r"\baggregate\b",
    r"\bbucket(?:ed|s)?\b",
    r"\bleaderboard\b",
    r"\bpagination\b",
    r"\bpage size\b",
    r"\bpage number\b",
    r"\btop-?n\b",
    r"\bcursor\b",
    r"\bnullable\b",
    r"\boptional\b",
    r"解析",
    r"输入",
    r"验证",
    r"参数",
    r"请求体",
    r"请求参数",
    r"日期字符串",
    r"文件名",
    r"读取文件",
    r"列结构",
    r"补丁",
    r"字段缺失",
    r"部分更新",
    r"批处理",
    r"事件数组",
    r"排序",
    r"聚合",
]

B_GENERIC_PATTERNS = [
    r"\bdefault\b",
    r"\bfallback\b",
    r"\berror handling\b",
    r"\bfailure handling\b",
    r"\bretain\b",
    r"\bclear\b",
    r"\bempty result\b",
    r"\bnull return\b",
    r"\breturn shape\b",
    r"\bresult contract\b",
    r"\berror response\b",
    r"\bstatus code mapping\b",
    r"\bduplicate replay\b",
    r"\bretry exhaustion\b",
    r"\bpartial success\b",
    r"\bbatch result\b",
    r"\bretry required\b",
    r"\bduplicate\b",
    r"\breplay\b",
    r"\bunsupported version\b",
    r"\bunknown version\b",
    r"\bpartial import\b",
    r"\breject summary\b",
    r"\bout of range\b",
    r"\bempty page\b",
    r"\bbusy\b",
    r"\balready held\b",
    r"\breclaimed\b",
    r"\blease\b",
    r"\bsummary\b",
    r"\bstatus\b",
    r"默认",
    r"回退",
    r"错误处理",
    r"异常处理",
    r"保留旧值",
    r"清空",
    r"空结果",
    r"返回结构",
    r"结果契约",
    r"状态码映射",
    r"重放结果",
    r"部分成功",
    r"批量结果",
    r"重试耗尽",
    r"retry_required",
    r"duplicate",
]

C_GENERIC_PATTERNS = [
    r"\bstate\b",
    r"\bcache\b",
    r"\bside.?effect\b",
    r"\basync\b",
    r"\bawait\b",
    r"\bretry\b",
    r"\btimeout\b",
    r"\bresource\b",
    r"\bconnection\b",
    r"\bcleanup\b",
    r"\bwrite\b",
    r"\bappend\b",
    r"\boverwrite\b",
    r"\bread\b",
    r"\bemit\b",
    r"\bsend\b",
    r"\bmutat(?:e|ion)\b",
    r"\bregister\b",
    r"\bunregister\b",
    r"\blistener\b",
    r"\bsubscription\b",
    r"\bunsubscribe\b",
    r"\bwatch(?:er)?\b",
    r"\bmutex\b",
    r"\block\b",
    r"\blease\b",
    r"\bacquire(?:d)?\b",
    r"\bcontention\b",
    r"\bconcurr(?:ent|ency)\b",
    r"\bgoroutine\b",
    r"\bcallback\b",
    r"\bfile (?:read|write|export|import)\b",
    r"\back\b",
    r"\bdead.?letter\b",
    r"\bqueue\b",
    r"状态写入",
    r"缓存",
    r"副作用",
    r"异步",
    r"重试",
    r"超时",
    r"资源",
    r"连接",
    r"清理",
    r"写入",
    r"追加",
    r"覆盖文件",
    r"读取文件",
    r"发送事件",
    r"监听器",
    r"取消订阅",
    r"并发",
    r"互斥锁",
    r"ack",
    r"死信",
    r"队列",
]

D_GENERIC_PATTERNS = [
    r"\butc\b",
    r"\btimezone\b",
    r"\bdate\b",
    r"\bdatetime\b",
    r"\bserialize\b",
    r"\bdeserialize\b",
    r"\bprotocol\b",
    r"\bschema\b",
    r"\bschema version\b",
    r"\bversion compatibility\b",
    r"\bencoding\b",
    r"\bunicode\b",
    r"\bdecimal\b",
    r"\bprecision\b",
    r"\bcurrency\b",
    r"\bround(?:ing)?\b",
    r"\bminor units?\b",
    r"\bresponse\b",
    r"\bstatus code\b",
    r"\bheader\b",
    r"\bhttp\b",
    r"\burl\b",
    r"\bpath traversal\b",
    r"\baudit\b",
    r"\bmetrics?\b",
    r"\bredact(?:ion)?\b",
    r"\bmask(?:ing)?\b",
    r"\bpii\b",
    r"\bcsv\b",
    r"\btsv\b",
    r"\butf-?8\b",
    r"\bsignature\b",
    r"\bprovider\b",
    r"\bordering\b",
    r"时区",
    r"日期",
    r"时间",
    r"序列化",
    r"反序列化",
    r"编码",
    r"精度",
    r"金额",
    r"货币",
    r"响应",
    r"状态码",
    r"审计",
    r"脱敏",
    r"UTF-8",
    r"签名",
]

PURE_FUNCTION_PATTERNS = [
    r"简单",
    r"加法",
    r"减法",
    r"\bsimple\b",
    r"\badd(?:ition)?\b",
    r"\bsubtract(?:ion)?\b",
    r"\bpure function\b",
]

HIGH_RISK_HINTS = [
    r"\bparse\b",
    r"\bvalidate\b",
    r"\bdefault\b",
    r"\bfallback\b",
    r"\berror\b",
    r"\basync\b",
    r"\bcache\b",
    r"\bretry\b",
    r"\btimeout\b",
    r"\butc\b",
    r"\btimezone\b",
    r"\bcurrency\b",
    r"\bdecimal\b",
    r"\bcsv\b",
    r"\baudit\b",
    r"\bredact\b",
    r"\bpatch\b",
    r"\bidempotent\b",
    r"\bbatch\b",
    r"\bwebhook\b",
    r"\bsignature\b",
    r"解析",
    r"验证",
    r"默认",
    r"回退",
    r"错误",
    r"缓存",
    r"重试",
    r"时区",
    r"金额",
    r"审计",
    r"脱敏",
    r"补丁",
    r"幂等",
    r"批处理",
    r"webhook",
    r"签名",
]


@dataclass
class ScenarioResult:
    case_id: str
    task: str
    language: str
    expected_packs: list[str]
    predicted_packs: list[str]
    correct_selection: bool = False
    over_selection: list[str] = field(default_factory=list)
    under_selection: list[str] = field(default_factory=list)
    reasoning: str = ""
    per_pack_reasoning: dict[str, str] = field(default_factory=dict)
    score: float = 0.0

    @property
    def passed(self) -> bool:
        return self.correct_selection or self.score >= 80


def predict_scenario_packs(task: str) -> tuple[list[str], dict[str, str]]:
    """
    Predict which scenario packs should be selected based on task text.

    Strategy:
    1. Detect a few high-frequency sub-scenarios with explicit mappings.
    2. Backfill with generic pack signals.
    3. Remove packs that were only weakly implied by broad words such as "log" or "response".
    """

    selected: list[str] = []
    reasoning: dict[str, str] = {}

    def matched_keywords(patterns: list[str]) -> list[str]:
        return [pattern for pattern in patterns if re.search(pattern, task, re.IGNORECASE)]

    def add_pack(pack: str, reasons: list[str]) -> None:
        if pack not in selected:
            selected.append(pack)
        cleaned: list[str] = []
        for reason in reasons:
            if reason and reason not in cleaned:
                cleaned.append(reason)
        if cleaned:
            reasoning[pack] = f"matched signals: {', '.join(cleaned[:4])}"

    simple_hits = matched_keywords(PURE_FUNCTION_PATTERNS)
    has_high_risk = any(re.search(pattern, task, re.IGNORECASE) for pattern in HIGH_RISK_HINTS)
    if simple_hits and not has_high_risk:
        return [], {"none": "simple pure/local computation with no obvious contract risk"}

    patch_hits = matched_keywords([
        r"\bpatch\b",
        r"\bpartial update\b",
        r"\bmerge\b",
        r"\bretain\b",
        r"\bclear\b",
        r"部分更新",
        r"补丁",
        r"字段缺失",
        r"保留旧值",
        r"清空字段",
    ])
    outbound_http_hits = matched_keywords([
        r"\boutbound http\b",
        r"\bpartner api\b",
        r"\bhttp client\b",
        r"\bupstream\b",
        r"\b429\b",
        r"\b5xx\b",
        r"\bstatus code mapping\b",
        r"第三方",
        r"出站 HTTP",
        r"状态码映射",
    ])
    json_parse_hits = matched_keywords([
        r"\bjson\b.*\bparse\b",
        r"\bparse\b.*\bjson\b",
        r"解析.*JSON",
        r"JSON.*解析",
    ])
    idempotency_hits = matched_keywords([
        r"\bidempotency key\b",
        r"\bidempotent\b",
        r"\breplay\b",
        r"\bduplicate suppression\b",
        r"\bdedupe\b",
        r"幂等键",
        r"幂等",
        r"重放",
        r"去重",
    ])
    time_money_hits = matched_keywords([
        r"\butc\b",
        r"\btimezone\b",
        r"\bcurrency\b",
        r"\bdecimal\b",
        r"\bprecision\b",
        r"\bminor units?\b",
        r"\bround(?:ing)?\b",
        r"UTC",
        r"时区",
        r"货币",
        r"金额",
        r"精度",
        r"舍入",
    ])
    api_fetch_hits = matched_keywords([
        r"\bapi\b.*\bfetch\b",
        r"\bapi\b.*\bget data\b",
        r"\bfetch\b.*\bapi\b",
        r"\bcall\b.*\bapi\b",
        r"从 API 获取",
        r"调用 API 获取",
        r"从接口获取",
    ])
    file_boundary_hits = matched_keywords([
        r"\bcsv\b",
        r"\btsv\b",
        r"\butf-?8\b",
        r"\bexport\b",
        r"\bimport\b",
        r"\bfilename\b",
        r"\boutput path\b",
        r"导出",
        r"导入",
        r"文件名",
    ])
    audit_hits = matched_keywords([
        r"\baudit\b",
        r"\bredact(?:ion)?\b",
        r"\bmask(?:ing)?\b",
        r"\bpii\b",
        r"\btoken\b",
        r"\bemail\b",
        r"审计",
        r"脱敏",
        r"敏感字段",
    ])
    batch_hits = matched_keywords([
        r"\bbatch\b",
        r"\bpartial success\b",
        r"\bitem result\b",
        r"\bbatch summary\b",
        r"\bdead.?letter\b",
        r"批处理",
        r"部分成功",
        r"逐项",
        r"批量结果",
        r"死信",
    ])
    webhook_hits = matched_keywords([
        r"\bwebhook\b",
        r"\bworker\b",
        r"\back\b",
        r"\bdelivery id\b",
        r"\bevent id\b",
        r"\bsignature\b",
        r"\bprovider retry\b",
        r"webhook",
        r"worker",
        r"ack",
        r"delivery_id",
        r"event_id",
        r"签名",
    ])
    hydration_hits = matched_keywords([
        r"\bssr\b",
        r"\bhydration\b",
        r"\bhydrate\b",
        r"服务端渲染",
        r"同构激活",
    ])
    env_config_hits = matched_keywords([
        r"\benvironment variables?\b",
        r"\benv\b",
        r"\bconfig\b",
        r"\bconfiguration\b",
        r"\bconfig file\b",
        r"\bcli\b",
        r"\bcommand line\b",
        r"\bflags?\b",
        r"\bargv\b",
        r"环境变量",
        r"配置",
        r"配置文件",
    ])
    schema_version_hits = matched_keywords([
        r"\bschema version\b",
        r"\bversion compatibility\b",
        r"\bcompatibilit(?:y|ies)\b",
        r"\bunknown version\b",
        r"\bunsupported version\b",
        r"\bv1\b",
        r"\bv2\b",
        r"schema_version",
    ])
    pagination_hits = matched_keywords([
        r"\bbucket(?:ed|s)?\b",
        r"\bleaderboard\b",
        r"\btop-?n\b",
        r"\bpagination\b",
        r"\bpage size\b",
        r"\bpage number\b",
        r"\bout of range\b",
        r"\bempty page\b",
        r"\bcursor\b",
    ])
    import_summary_hits = matched_keywords([
        r"\bpartial import\b",
        r"\breject summary\b",
        r"\breject reasons?\b",
        r"\brejected rows?\b",
        r"\baccepted rows?\b",
        r"\brow-level\b",
        r"\brejected_all\b",
    ])
    lock_contention_hits = matched_keywords([
        r"\block contention\b",
        r"\blease\b",
        r"\bacquire(?:d)? lock\b",
        r"\bbusy\b",
        r"\balready held\b",
        r"\breclaimed\b",
        r"\bsingle-process\b",
        r"\bsingle process\b",
    ])
    listener_hits = matched_keywords([
        r"\blistener\b",
        r"\bregister\b",
        r"\bunregister\b",
        r"\bsubscription\b",
        r"\bunsubscribe\b",
        r"\bwatch(?:er)?\b",
        r"监听器",
        r"取消订阅",
        r"清理回调",
    ])
    falsey_input_hits = matched_keywords([
        r"enabled\s*=\s*false",
        r"rolloutpercent\s*=\s*0",
        r"enabled=false",
        r"rolloutPercent=0",
        r"开关更新",
        r"布尔值",
        r"零值",
        r"feature toggle",
    ])

    if json_parse_hits:
        add_pack("A", ["json parsing inputs"])
        add_pack("B", ["json parse failure contract"])

    if api_fetch_hits:
        add_pack("A", ["api request inputs"])
        add_pack("B", ["network failure/result handling"])
        add_pack("C", ["network/cache side effects"])

    if patch_hits:
        add_pack("A", ["patch/update input presence semantics"])
        add_pack("B", ["retain/clear/default result contract"])

    if outbound_http_hits:
        add_pack("A", ["outbound request inputs"])
        add_pack("B", ["upstream failure mapping"])
        add_pack("C", ["retry/timeout runtime behavior"])
        add_pack("D", ["http boundary semantics"])

    if idempotency_hits:
        add_pack("B", ["duplicate/replay result contract"])
        add_pack("C", ["idempotency runtime state"])

    if time_money_hits:
        add_pack("A", ["time/money input parsing"])
        add_pack("D", ["timezone/precision semantics"])

    if file_boundary_hits:
        add_pack("A", ["file/report input shape"])
        if matched_keywords([r"\bwrite\b", r"\bread\b", r"\bcleanup\b", r"写入", r"读取", r"清理"]):
            add_pack("C", ["file lifecycle side effects"])
        add_pack("D", ["encoding/serialization boundary"])

    if audit_hits:
        add_pack("C", ["audit emission side effects"])
        add_pack("D", ["audit redaction and diagnostics"])

    if batch_hits:
        add_pack("A", ["batch item input shape"])
        add_pack("B", ["partial-success result contract"])
        add_pack("C", ["batch side effects"])

    if webhook_hits:
        add_pack("A", ["delivery/event input validation"])
        add_pack("B", ["ack/retry/dead-letter contract"])
        add_pack("C", ["worker runtime behavior"])
        add_pack("D", ["webhook/provider boundary semantics"])

    if hydration_hits:
        add_pack("C", ["hydration runtime coordination"])
        add_pack("D", ["ssr/hydration boundary semantics"])

    if env_config_hits:
        add_pack("A", ["env/config parsing"])
        add_pack("B", ["default precedence and fallback"])
        if matched_keywords([r"\burl\b", r"\bpath\b", r"\bencoding\b", r"\btimezone\b", r"时区", r"编码"]):
            add_pack("D", ["env/config boundary semantics"])

    if matched_keywords([r"\bconfig file\b", r"\bcli\b", r"\bcommand line\b", r"\bflags?\b", r"\bargv\b"]):
        add_pack("C", ["local config file and override runtime behavior"])
        add_pack("D", ["config file / cli boundary semantics"])

    if schema_version_hits:
        add_pack("A", ["schema-version input parsing"])
        add_pack("B", ["compatibility and unsupported-version contract"])
        add_pack("D", ["versioned protocol boundary semantics"])

    if pagination_hits:
        add_pack("A", ["grouping and ordering inputs"])
        add_pack("B", ["top-n and pagination contract"])

    if import_summary_hits:
        add_pack("B", ["row-level reject and partial-import contract"])

    if lock_contention_hits:
        if matched_keywords([r"\block_key\b", r"\bowner_id\b", r"\bttl_steps\b", r"校验"]):
            add_pack("A", ["lease request input validation"])
        add_pack("B", ["lease contention result contract"])
        add_pack("C", ["lock state mutation and local contention runtime"])

    if listener_hits:
        add_pack("B", ["listener registration result contract"])
        add_pack("C", ["listener lifecycle and cleanup"])

    if falsey_input_hits:
        add_pack("A", ["explicit false/zero input semantics"])

    # Generic backfill. These are intentionally narrower than the previous
    # implementation so words like "request" or "invalid" alone do not over-select.
    generic_a = matched_keywords(A_GENERIC_PATTERNS)
    if generic_a:
        add_pack("A", generic_a)

    generic_b = matched_keywords(B_GENERIC_PATTERNS)
    if generic_b:
        add_pack("B", generic_b)

    generic_c = matched_keywords(C_GENERIC_PATTERNS)
    if generic_c:
        add_pack("C", generic_c)

    generic_d = matched_keywords(D_GENERIC_PATTERNS)
    if generic_d:
        add_pack("D", generic_d)

    # Plain logging should not force Pack D on its own.
    observability_only = bool(re.search(r"\blog(?:ging)?\b|metrics|日志", task, re.IGNORECASE))
    if observability_only and "D" in selected and not (audit_hits or time_money_hits or outbound_http_hits or file_boundary_hits or webhook_hits):
        selected = [pack for pack in selected if pack != "D"]
        reasoning.pop("D", None)

    ordered = [pack for pack in ("A", "B", "C", "D") if pack in selected]
    return ordered, reasoning


def run_scenario_eval(scenario_path: str, verbose: bool = False) -> list[ScenarioResult]:
    path = Path(scenario_path)
    if not path.exists():
        raise FileNotFoundError(f"Scenario eval file not found: {path}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    results: list[ScenarioResult] = []

    for case in data.get("cases", []):
        task = case.get("task", "")
        expected_packs = case.get("expected_packs", [])
        if isinstance(expected_packs, str):
            expected_packs = []

        expected_set = set(expected_packs)
        predicted_packs, per_pack_reasoning = predict_scenario_packs(task)
        predicted_set = set(predicted_packs)

        over = sorted(predicted_set - expected_set)
        under = sorted(expected_set - predicted_set)
        correct = predicted_set == expected_set

        if correct:
            score = 100.0
        else:
            overlap = len(predicted_set & expected_set)
            total = max(len(predicted_set | expected_set), 1)
            score = (overlap / total) * 100

        results.append(ScenarioResult(
            case_id=case.get("id", "unknown"),
            task=task,
            language=case.get("language", "unknown"),
            expected_packs=sorted(expected_packs),
            predicted_packs=predicted_packs,
            correct_selection=correct,
            over_selection=over,
            under_selection=under,
            reasoning=case.get("reasoning", ""),
            per_pack_reasoning=per_pack_reasoning,
            score=score,
        ))

    return results


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def print_trigger_results(results: list[TriggerResult], verbose: bool = False) -> None:
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    print(f"\n{'=' * 70}")
    print(f"Trigger Evaluation: {passed}/{total} correct")
    print(f"{'=' * 70}")
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(
            f"  [{status}] {result.case_id}: "
            f"expected={result.expected_decision}, predicted={result.predicted_decision}"
        )
        print(f"         \"{result.text}\"")
        if verbose and result.reasoning:
            print(f"         Reason: {result.reasoning}")
        if verbose:
            print(
                f"         Stack: status={result.stack_status}, "
                f"normalized_language={result.normalized_language}"
            )
        if verbose and result.keywords_matched:
            print(f"         Matched keywords: {', '.join(result.keywords_matched)}")
        if verbose and result.keywords_rejected:
            print(f"         Rejected keywords: {', '.join(result.keywords_rejected)}")


def print_scenario_results(results: list[ScenarioResult], verbose: bool = False) -> None:
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    avg_score = sum(r.score for r in results) / total if results else 0.0
    print(f"\n{'=' * 70}")
    print(f"Scenario Selection Evaluation: {passed}/{total} correct | Avg score: {avg_score:.1f}")
    print(f"{'=' * 70}")
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        expected_str = ",".join(result.expected_packs) if result.expected_packs else "none"
        predicted_str = ",".join(result.predicted_packs) if result.predicted_packs else "none"
        print(f"  [{status}] {result.case_id}: expected=[{expected_str}], predicted=[{predicted_str}]")
        print(f"         \"{result.task}\"")
        if result.over_selection:
            print(f"         OVER-selected: {', '.join(result.over_selection)}")
        if result.under_selection:
            print(f"         UNDER-selected: {', '.join(result.under_selection)}")
        if verbose and result.reasoning:
            print(f"         Reason: {result.reasoning}")
        if verbose and result.per_pack_reasoning:
            for pack in ("A", "B", "C", "D"):
                if pack in result.per_pack_reasoning:
                    print(f"         {pack}: {result.per_pack_reasoning[pack]}")


def format_results_json(
    trigger_results: list[TriggerResult],
    scenario_results: list[ScenarioResult],
) -> dict:
    return {
        "trigger_eval": {
            "total": len(trigger_results),
            "passed": sum(1 for r in trigger_results if r.passed),
            "results": [
                {
                    "id": r.case_id,
                    "text": r.text,
                    "expected": r.expected,
                    "expected_decision": r.expected_decision,
                    "predicted": r.predicted,
                    "predicted_decision": r.predicted_decision,
                    "correct": r.correct,
                    "stack_status": r.stack_status,
                    "normalized_language": r.normalized_language,
                    "keywords_matched": r.keywords_matched,
                    "keywords_rejected": r.keywords_rejected,
                }
                for r in trigger_results
            ],
        },
        "scenario_eval": {
            "total": len(scenario_results),
            "passed": sum(1 for r in scenario_results if r.passed),
            "avg_score": sum(r.score for r in scenario_results) / max(len(scenario_results), 1),
            "results": [
                {
                    "id": r.case_id,
                    "task": r.task,
                    "expected": r.expected_packs,
                    "predicted": r.predicted_packs,
                    "correct": r.correct_selection,
                    "score": r.score,
                    "over": r.over_selection,
                    "under": r.under_selection,
                }
                for r in scenario_results
            ],
        },
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate trigger decisions and scenario pack selections.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--trigger", metavar="PATH", help="Path to evals/trigger.json")
    parser.add_argument("--scenarios", metavar="PATH", help="Path to evals/scenario-selection-cases.json")
    parser.add_argument("--tasks", metavar="PATH", help="Path to evals/tasks.json (for task evaluation)")
    parser.add_argument("--all", action="store_true", help="Run all evals using default paths")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.all or (not args.trigger and not args.scenarios and not args.tasks):
        root = Path(__file__).resolve().parents[1]
        args.trigger = str(root / "evals" / "trigger.json")
        args.scenarios = str(root / "evals" / "scenario-selection-cases.json")
        args.tasks = str(root / "evals" / "tasks.json")

    all_trigger_results: list[TriggerResult] = []
    all_scenario_results: list[ScenarioResult] = []

    if args.trigger:
        try:
            all_trigger_results = run_trigger_eval(args.trigger, verbose=args.verbose)
            if not args.json:
                print_trigger_results(all_trigger_results, verbose=args.verbose)
        except FileNotFoundError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 2

    if args.scenarios:
        try:
            all_scenario_results = run_scenario_eval(args.scenarios, verbose=args.verbose)
            if not args.json:
                print_scenario_results(all_scenario_results, verbose=args.verbose)
        except FileNotFoundError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 2

    if args.tasks and Path(args.tasks).exists():
        with open(args.tasks, encoding="utf-8") as f:
            tasks_data = json.load(f)
        print(f"\n{'=' * 70}")
        print(f"Task Evaluation: {len(tasks_data.get('tasks', []))} tasks")
        print(f"{'=' * 70}")
        for task in tasks_data.get("tasks", []):
            packs = task.get("scenario_packs", [])
            expected = task.get("expected_packs", [])
            correct = set(packs) == set(expected)
            status = "PASS" if correct else "FAIL"
            print(f"  [{status}] {task.get('id')}: packs={packs}, expected={expected}")

    if args.json:
        print(json.dumps(
            format_results_json(all_trigger_results, all_scenario_results),
            indent=2,
        ))

    total = len(all_trigger_results) + len(all_scenario_results)
    passed = sum(1 for r in all_trigger_results if r.passed)
    passed += sum(1 for r in all_scenario_results if r.passed)

    if total > 0:
        print(f"\nOverall: {passed}/{total} passed")
        return 0 if passed == total else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
Eval runner: contract output quality check.

Checks Pre-Generation Contract and Implementation Report outputs against:
1. Anchor-based field completeness (MUST / SHOULD / MAY fields)
2. Placeholder detection (catches敷衍填空)
3. Validation distinction (catches虚报验证)
4. Schema compliance
5. Stop condition enforcement

Usage:
    python scripts/eval_contract_output.py path/to/output.md
    python scripts/eval_contract_output.py --suite path/to/tasks.json
    python scripts/eval_contract_output.py --check-missing --verbose

Exit codes:
    0  — all checks passed
    1  — one or more checks failed
    2  — usage error
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Anchor definitions
# ---------------------------------------------------------------------------

CONTRACT_ANCHORS = {
    "##-Contract-Metadata": {
        "severity": "MUST",
        "description": "Contract metadata block",
        "sub_fields": [
            "generated_at",
            "task_mode",
            "continuation_mode",
            "contract_depth",
            "stop_before_code",
        ],
    },
    "##-Target-Language": {
        "severity": "MUST",
        "description": "Target Language section",
        "sub_fields": [
            "language",
        ],
    },
    "##-Scope": {
        "severity": "MUST",
        "description": "Scope section",
        "sub_fields": [
            "target",
            "requested_change",
            "blast_radius",
            "non_goals",
            "change_mode",
            "existing_contract_snapshot",
            "expected_contract_drift",
        ],
    },
    "##-Selected-Scenario-Packs": {
        "severity": "MUST",
        "description": "Selected Scenario Packs section",
        "sub_fields": [
            "pack",
            "why_applies",
        ],
    },
    "##-Input-Contract": {
        "severity": "MUST",
        "description": "Input Contract section",
        "sub_fields": [
            "accepted_inputs",
            "missing_or_empty_handling",
            "unknown_or_invalid_strategy",
        ],
    },
    "##-Return-And-Failure-Contract": {
        "severity": "MUST",
        "description": "Return And Failure Contract section",
        "sub_fields": [
            "success_shape",
            "empty_or_miss_shape",
            "failure_signaling",
        ],
    },
    "##-Branching-And-Ordering": {
        "severity": "SHOULD",
        "description": "Branching And Ordering section",
        "sub_fields": [
            "decision_points",
        ],
    },
    "##-Defaults-And-Fallback": {
        "severity": "SHOULD",
        "description": "Defaults And Fallback section",
        "sub_fields": [
            "default_sources",
            "fallback_triggers",
        ],
    },
    "##-Side-Effects-And-Runtime": {
        "severity": "SHOULD",
        "description": "Side Effects And Runtime section",
        "sub_fields": [
            "state_writes",
            "resource_lifecycle",
        ],
    },
    "##-Validation-Plan": {
        "severity": "SHOULD",
        "description": "Validation Plan section",
        "sub_fields": [
            "executable",
            "cannot_run",
        ],
    },
    "##-Boundary-And-Observability": {
        "severity": "MAY",
        "description": "Boundary And Observability section",
        "sub_fields": [],
    },
    "##-Open-Risks": {
        "severity": "MAY",
        "description": "Open Risks section",
        "sub_fields": [
            "unknowns",
        ],
    },
}

REPORT_ANCHORS = {
    "##-Report-Metadata": {
        "severity": "MUST",
        "description": "Report metadata block",
        "sub_fields": [
            "generated_at",
            "task_mode",
            "continuation_mode",
            "contract_depth",
            "contract_generated",
            "implementation_completed",
            "stopped_before_implementation",
        ],
    },
    "##-Language-Specific-Rules-Applied": {
        "severity": "MUST",
        "description": "Language-Specific Rules Applied section",
        "sub_fields": [
            "language_rules_applied",
            "prohibited_patterns_checked",
        ],
    },
    "##-Covered-Edge-Cases": {
        "severity": "MUST",
        "description": "Covered Edge Cases section",
        "sub_fields": [],
    },
    "##-Residual-Risks": {
        "severity": "MUST",
        "description": "Residual Risks section",
        "sub_fields": [],
    },
    "##-Executed-Validation": {
        "severity": "MUST",
        "description": "Executed Validation section",
        "sub_fields": [
            "command",
            "result",
        ],
    },
    "##-Validation-Not-Run": {
        "severity": "MUST",
        "description": "Validation Not Run section",
        "sub_fields": [
            "missing_command",
            "reason",
        ],
    },
    "##-Validation-Distinction": {
        "severity": "FATAL",
        "description": "Validation Distinction section",
        "sub_fields": [
            "tests claimed as executed but not actually run",
            "claimed_verified_count",
            "actually_verified_count",
            "discrepancy",
        ],
    },
    "##-Contract-Deviations": {
        "severity": "MUST",
        "description": "Contract Deviations section",
        "sub_fields": [],
    },
}

ALL_ANCHORS = tuple(CONTRACT_ANCHORS.keys()) + tuple(REPORT_ANCHORS.keys())

MINIMAL_REQUIRED_CONTRACT_ANCHORS = {
    "##-Contract-Metadata",
    "##-Target-Language",
    "##-Scope",
    "##-Selected-Scenario-Packs",
    "##-Input-Contract",
    "##-Return-And-Failure-Contract",
    "##-Side-Effects-And-Runtime",
    "##-Validation-Plan",
}

MINIMAL_REQUIRED_REPORT_ANCHORS = {
    "##-Report-Metadata",
    "##-Language-Specific-Rules-Applied",
    "##-Executed-Validation",
    "##-Validation-Not-Run",
    "##-Validation-Distinction",
    "##-Contract-Deviations",
}

MINIMAL_TOO_BROAD_PATTERNS = {
    "auth": re.compile(r"\bauth\b", re.IGNORECASE),
    "signature": re.compile(
        r"\b(signature verification|verify signature|signature header|signature headers|webhook signature)\b",
        re.IGNORECASE,
    ),
    "retry": re.compile(r"\bretry\b", re.IGNORECASE),
    "timeout": re.compile(r"\btimeout\b", re.IGNORECASE),
    "idempotency": re.compile(r"\bidempotency\b", re.IGNORECASE),
    "dead-letter": re.compile(r"\bdead[- ]letter\b", re.IGNORECASE),
    "currency": re.compile(r"\bcurrency\b", re.IGNORECASE),
    "timezone": re.compile(r"\btimezone\b", re.IGNORECASE),
    "utf-8": re.compile(r"\butf[- ]?8\b", re.IGNORECASE),
    "protocol": re.compile(r"\bprotocol\b", re.IGNORECASE),
    "webhook": re.compile(r"\bwebhook\b", re.IGNORECASE),
    "audit redaction": re.compile(r"\baudit\s+redaction\b", re.IGNORECASE),
}

# Patterns that indicate placeholder /敷衍填空 content
PLACEHOLDER_PATTERNS = [
    re.compile(r"^\s*-\s*\[.*?\]\s*$"),  # unfilled checkbox: "- [ ]"
    re.compile(r"^\s*-\s*:\s*$"),  # empty list item: "- :"
    re.compile(r"^\s*\w+:\s*\[.*?\]\s*$"),  # "field: [todo]"
    re.compile(r"^\s*:\s*$"),  # bare colon line
    re.compile(r"^\s*-\s*$"),  # bare dash line
    re.compile(r"^\s*\*\s*$"),  # bare asterisk line
    re.compile(r"\btodo\b", re.IGNORECASE),
    re.compile(r"\b[Tt]BD\b"),
    re.compile(r"\b[Tt]o be determined\b"),
    re.compile(r"\bvaries\b"),
    re.compile(r"\bdepends\b"),
    re.compile(r"\b[Tt]o [Dd]o\b"),
    re.compile(r"\bnot\s+applicable\b"),
]

# Patterns that indicate vague/敷衍 filler content
VAGUE_PATTERNS = [
    re.compile(r"\bappropriate\b", re.IGNORECASE),
    re.compile(r"\bproper\b", re.IGNORECASE),
    re.compile(r"\bcorrect\b", re.IGNORECASE),
    re.compile(r"\bhandle\s+(errors|edge\s cases|it|this)\b", re.IGNORECASE),
    re.compile(r"\bvalidate\s+the\s+input\b", re.IGNORECASE),
    re.compile(r"\bmaybe\b", re.IGNORECASE),
    re.compile(r"\bprobably\b", re.IGNORECASE),
    re.compile(r"\bpossibly\b", re.IGNORECASE),
    re.compile(r"\bmight\s+happen\b", re.IGNORECASE),
    re.compile(r"\bfeel\s+free\b", re.IGNORECASE),
]

# Patterns that indicate falsely claimed validation (虚报验证)
FAKE_VALIDATION_PATTERNS = [
    re.compile(r"^\s*-?\s*(all\s+)?tests?\s+(pass|passed|run|ran)\b", re.IGNORECASE),
    re.compile(r"^\s*-?\s*validated\b", re.IGNORECASE),
    re.compile(r"^\s*-?\s*verified\b", re.IGNORECASE),
    re.compile(r"^\s*-?\s*(no\s+issues?\s+found|passed\s+all)\b", re.IGNORECASE),
    re.compile(r"assert", re.IGNORECASE),  # assert claims without evidence
]

STOP_KEYWORDS = [
    "cannot proceed safely",
    "stop here",
    "missing:",
    "ask for:",
    "stop before",
]

VALIDATION_SECTION_KEYWORDS = [
    "command",
    "test",
    "result",
    "pytest",
    "jest",
    "go test",
    "npm test",
    "cargo test",
    "node --test",
    "python -m pytest",
]

FIELD_ALIASES = {
    "language": ["Language"],
    "target": ["Target"],
    "requested_change": ["Requested change"],
    "blast_radius": ["Allowed blast radius", "blast radius"],
    "non_goals": ["Explicit non-goals", "Non-goals"],
    "change_mode": ["Change mode"],
    "existing_contract_snapshot": ["Existing contract snapshot"],
    "expected_contract_drift": ["Expected contract drift"],
    "why_applies": ["Why it applies"],
    "accepted_inputs": ["Accepted inputs"],
    "missing_or_empty_handling": ["Missing or empty handling"],
    "unknown_or_invalid_strategy": ["Unknown or invalid value strategy"],
    "decision_points": ["Decision points"],
    "default_sources": ["Default sources"],
    "fallback_triggers": ["Fallback or downgrade triggers"],
    "state_writes": ["State writes or mutations"],
    "resource_lifecycle": ["Resources to acquire and release"],
    "executable": ["Commands or tests to run", "Executed now"],
    "cannot_run": ["Validation that cannot be run now", "Not run now", "Reason not run"],
    "unknowns": ["Unknowns that could change behavior"],
    "language_rules_applied": ["Language rules applied"],
    "prohibited_patterns_checked": ["Prohibited patterns checked"],
    "command": ["Command or test"],
    "missing_command": ["Missing command"],
    "result": ["Result"],
    "exit_code": ["Exit code"],
    "receipt_id": ["Receipt id", "Receipt ID"],
    "evidence_digest": ["Evidence digest"],
    "tests claimed as executed but not actually run": [
        "tests_claimed_but_not_run",
        "tests_claimed_as_executed_but_not_run",
    ],
}


def field_label_regex(field_name: str) -> re.Pattern[str]:
    candidates = [field_name, *FIELD_ALIASES.get(field_name, [])]
    parts = []
    for candidate in candidates:
        normalized = re.escape(candidate).replace("_", r"[_\-\s]*")
        parts.append(normalized)
    joined = "|".join(parts)
    return re.compile(rf"(?im)^\s*(?:<!--\s*)?(?:[-*]\s*)?(?:{joined})\s*:")


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    """A single check finding."""

    severity: str  # FATAL / MUST / SHOULD / MAY / WARN
    code: str
    message: str
    line: Optional[int] = None
    anchor: Optional[str] = None

    def __str__(self) -> str:
        location = f" line {self.line}" if self.line else ""
        anchor_str = f" [{self.anchor}]" if self.anchor else ""
        return (
            f"[{self.severity}] {self.code}{anchor_str}{location}: {self.message}"
        )


@dataclass
class EvalResult:
    """Result of evaluating a single output file."""

    file_path: str
    total_must_anchors: int = 0
    missing_must_anchors: list[str] = field(default_factory=list)
    total_should_anchors: int = 0
    missing_should_anchors: list[str] = field(default_factory=list)
    placeholder_count: int = 0
    vague_filler_count: int = 0
    fake_validation_count: int = 0
    findings: list[Finding] = field(default_factory=list)
    is_contract: bool = True  # True for Pre-Generation Contract, False for Report
    stopped_before_code: bool = False
    contract_depth: Optional[str] = None

    @property
    def must_completeness(self) -> float:
        if self.total_must_anchors == 0:
            return 1.0
        return (self.total_must_anchors - len(self.missing_must_anchors)) / self.total_must_anchors

    @property
    def should_completeness(self) -> float:
        if self.total_should_anchors == 0:
            return 1.0
        return (self.total_should_anchors - len(self.missing_should_anchors)) / self.total_should_anchors

    @property
    def score(self) -> float:
        """Overall quality score (0-100)."""
        must_penalty = (1 - self.must_completeness) * 40
        should_penalty = (1 - self.should_completeness) * 20
        fatal_findings = sum(1 for f in self.findings if f.severity == "FATAL")
        must_findings = sum(1 for f in self.findings if f.severity == "MUST")
        blocking_penalty = fatal_findings * 30 + must_findings * 10
        placeholder_penalty = max(0, (self.placeholder_count - 2) * 5)
        vague_penalty = max(0, (self.vague_filler_count - 2) * 3)
        fake_penalty = self.fake_validation_count * 20
        return max(
            0.0,
            min(
                100.0,
                100.0 - must_penalty - should_penalty - blocking_penalty - placeholder_penalty - vague_penalty - fake_penalty,
            ),
        )

    @property
    def grade(self) -> str:
        s = self.score
        if s >= 90:
            return "A"
        elif s >= 80:
            return "B"
        elif s >= 70:
            return "C"
        elif s >= 60:
            return "D"
        return "F"

    @property
    def passed(self) -> bool:
        has_blocking_findings = any(f.severity in {"FATAL", "MUST"} for f in self.findings)
        return self.score >= 70 and self.fake_validation_count == 0 and not has_blocking_findings


# ---------------------------------------------------------------------------
# Core evaluation logic
# ---------------------------------------------------------------------------

def extract_anchors(text: str) -> dict[str, int]:
    """Extract anchor sections and their starting line numbers."""
    anchors: dict[str, int] = {}
    for i, line in enumerate(text.splitlines(), start=1):
        for anchor in ALL_ANCHORS:
            if anchor in line:
                anchors[anchor] = i
                break
    return anchors


def extract_anchor_content(text: str, anchor: str, anchors: dict[str, int]) -> str:
    """Extract the content between two adjacent anchors."""
    anchor_line = anchors.get(anchor)
    if anchor_line is None:
        return ""

    sorted_anchors = sorted(anchors.items(), key=lambda x: x[1])
    next_line = None
    for i, (a, line_num) in enumerate(sorted_anchors):
        if a == anchor:
            if i + 1 < len(sorted_anchors):
                next_line = sorted_anchors[i + 1][1]
            break

    lines = text.splitlines()
    if next_line:
        segment = lines[anchor_line:next_line - 1]
    else:
        segment = lines[anchor_line - 1:]

    while segment and segment[-1].strip() in {"", "---"}:
        segment.pop()

    return "\n".join(segment)


def detect_placeholders(content: str) -> list[tuple[int, str]]:
    """Find placeholder patterns in content. Returns list of (line_num, pattern_name)."""
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), start=1):
        for pattern in PLACEHOLDER_PATTERNS:
            if pattern.search(line):
                findings.append((i, pattern.pattern))
                break
    return findings


def detect_vague_filler(content: str) -> list[tuple[int, str]]:
    """Find vague filler patterns in content."""
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), start=1):
        for pattern in VAGUE_PATTERNS:
            if pattern.search(line):
                findings.append((i, pattern.pattern))
                break
    return findings


def detect_fake_validation(content: str) -> list[tuple[int, str]]:
    """Find falsely claimed validation in content."""
    findings: list[tuple[int, str]] = []
    for i, line in enumerate(content.splitlines(), start=1):
        for pattern in FAKE_VALIDATION_PATTERNS:
            if pattern.search(line):
                findings.append((i, pattern.pattern))
                break
    return findings


def missing_subfields(content: str, sub_fields: list[str]) -> list[str]:
    missing: list[str] = []
    for field_name in sub_fields:
        if not field_label_regex(field_name).search(content):
            missing.append(field_name)
    return missing


def extract_contract_depth(
    text: str,
    is_contract: bool,
    anchors: dict[str, int],
) -> Optional[str]:
    metadata_anchor = "##-Contract-Metadata" if is_contract else "##-Report-Metadata"
    metadata = extract_anchor_content(text, metadata_anchor, anchors)
    match = re.search(
        r"contract_depth:\s*(minimal|standard|expanded)",
        metadata,
        re.IGNORECASE,
    )
    if not match:
        return None
    return match.group(1).lower()


def get_effective_severity(
    anchor: str,
    severity: str,
    is_contract: bool,
    contract_depth: Optional[str],
) -> str:
    if severity == "FATAL":
        return severity

    if contract_depth != "minimal":
        return severity

    required_anchors = (
        MINIMAL_REQUIRED_CONTRACT_ANCHORS
        if is_contract
        else MINIMAL_REQUIRED_REPORT_ANCHORS
    )
    if anchor in required_anchors:
        return "MUST"

    return "IGNORE"


def detect_minimal_too_broad(text: str) -> tuple[list[str], Optional[int]]:
    matched_terms: list[str] = []
    first_line: Optional[int] = None

    for line_num, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        lower_line = line.lower()
        if not line:
            continue
        if line.startswith("##-") or line.startswith("###") or line.startswith("<!--"):
            continue
        if re.match(r"^\s*[-*]?\s*[A-Za-z0-9 /(),`'_-]+:\s*$", line):
            continue
        if lower_line.startswith("```") or lower_line.startswith("> "):
            continue

        for label, pattern in MINIMAL_TOO_BROAD_PATTERNS.items():
            if pattern.search(line) and label not in matched_terms:
                matched_terms.append(label)
                if first_line is None:
                    first_line = line_num

    return matched_terms, first_line


def check_validation_distinction(text: str) -> list[Finding]:
    """Check Validation Distinction section for虚报验证."""
    findings: list[Finding] = []
    anchors = extract_anchors(text)
    section = extract_anchor_content(text, "##-Validation-Distinction", anchors)
    if not section:
        findings.append(Finding(
            severity="FATAL",
            code="MISSING_VALIDATION_DISTINCTION",
            message="Validation Distinction section is missing (FATAL)",
            anchor="##-Validation-Distinction",
        ))
        return findings

    lower_section = section.lower()

    disc_match = re.search(r"discrepancy:\s*(-?\d+)", lower_section)
    if disc_match:
        discrepancy = int(disc_match.group(1))
        if discrepancy != 0:
            findings.append(Finding(
                severity="FATAL",
                code="VALIDATION_DISCREPANCY",
                message=f"Validation discrepancy is {discrepancy}, must be 0 (FATAL violation)",
                anchor="##-Validation-Distinction",
            ))

    claimed_match = re.search(r"claimed_verified_count:\s*(\d+)", lower_section)
    actual_match = re.search(r"actually_verified_count:\s*(\d+)", lower_section)
    if claimed_match and actual_match:
        claimed = int(claimed_match.group(1))
        actual = int(actual_match.group(1))
        if claimed > actual:
            findings.append(Finding(
                severity="FATAL",
                code="CLAIMED_GT_ACTUAL",
                message=f"claimed_verified_count ({claimed}) exceeds actually_verified_count ({actual})",
                anchor="##-Validation-Distinction",
            ))

    if (
        "tests claimed as executed but not actually run:" not in lower_section
        and "discrepancy:" not in lower_section
    ):
        findings.append(Finding(
            severity="FATAL",
            code="DISTINCTION_INCOMPLETE",
            message="Validation Distinction must explicitly name falsely claimed validation or say none",
            anchor="##-Validation-Distinction",
        ))

    # Check for contradictory claims
    executed_lines = []
    not_run_lines = []
    in_executed = False
    in_not_run = False
    for line in section.splitlines():
        if "executed validation" in line.lower():
            in_executed = True
            in_not_run = False
        elif "validation not run" in line.lower():
            in_not_run = True
            in_executed = False
        elif "###" in line:
            in_executed = False
            in_not_run = False
        if in_executed and any(kw in line.lower() for kw in VALIDATION_SECTION_KEYWORDS):
            executed_lines.append(line.strip())
        if in_not_run and (":" in line or "-" in line):
            not_run_lines.append(line.strip())

    # Check for overlap between executed and not run
    for ex_line in executed_lines:
        ex_clean = re.sub(r"[-:\s]", "", ex_line).lower()
        for nr_line in not_run_lines:
            nr_clean = re.sub(r"[-:\s]", "", nr_line).lower()
            if ex_clean and ex_clean in nr_clean and ex_clean != nr_clean:
                findings.append(Finding(
                    severity="FATAL",
                    code="VALIDATION_CONTRADICTION",
                    message=f"Same validation appears in both Executed and Not Run: '{ex_line.strip()}'",
                    anchor="##-Validation-Distinction",
                ))

    return findings


def check_executed_validation_evidence(text: str) -> list[Finding]:
    findings: list[Finding] = []
    anchors = extract_anchors(text)
    section = extract_anchor_content(text, "##-Executed-Validation", anchors)
    if not section:
        return findings

    command_present = field_label_regex("command").search(section)
    if not command_present:
        return findings

    if not field_label_regex("exit_code").search(section):
        findings.append(Finding(
            severity="WARN",
            code="MISSING_EXIT_CODE",
            message="Executed Validation should include an exit code for receipt-backed evidence",
            anchor="##-Executed-Validation",
        ))

    if not (
        field_label_regex("receipt_id").search(section)
        or field_label_regex("evidence_digest").search(section)
    ):
        findings.append(Finding(
            severity="WARN",
            code="MISSING_EXECUTION_RECEIPT",
            message="Executed Validation should include a receipt id or evidence digest",
            anchor="##-Executed-Validation",
        ))

    return findings


def check_stop_condition(text: str, is_contract: bool) -> tuple[bool, list[Finding]]:
    """Check if stop conditions are properly handled."""
    findings: list[Finding] = []
    lower_text = text.lower()
    has_stop_template = any(kw in lower_text for kw in STOP_KEYWORDS)
    anchors = extract_anchors(text)
    metadata = extract_anchor_content(text, "##-Contract-Metadata", anchors) if is_contract else ""

    # Check stop_before_code flag
    if is_contract:
        if "stop_before_code: true" in metadata.lower():
            if not has_stop_template:
                findings.append(Finding(
                    severity="FATAL",
                    code="STOP_WITHOUT_TEMPLATE",
                    message="stop_before_code is true but stop template is missing",
                    anchor="##-Contract-Metadata",
                ))
            # OK: stopped before code, has template
            return True, findings
        elif "stop_before_code: false" in metadata.lower() or "implementation_completed: true" in metadata.lower():
            # Should have actual implementation, not just a stop template
            return False, findings

    # If has stop template without proper flag, warn
    if has_stop_template and "stop_before_code" not in metadata.lower():
        findings.append(Finding(
            severity="WARN",
            code="STOP_WITHOUT_FLAG",
            message="Stop template found but stop_before_code flag is missing from metadata",
        ))

    return False, findings


def evaluate_output(text: str, file_path: str, is_contract: bool = True) -> EvalResult:
    """Evaluate a single contract or report output."""
    anchors = extract_anchors(text)
    anchor_defs = CONTRACT_ANCHORS if is_contract else REPORT_ANCHORS

    result = EvalResult(file_path=file_path, is_contract=is_contract)
    result.contract_depth = extract_contract_depth(text, is_contract, anchors)
    effective_severities = {
        anchor: get_effective_severity(
            anchor,
            defn["severity"],
            is_contract,
            result.contract_depth,
        )
        for anchor, defn in anchor_defs.items()
    }

    # Check anchor completeness
    for anchor, defn in anchor_defs.items():
        effective_severity = effective_severities[anchor]
        if effective_severity == "IGNORE":
            continue
        if effective_severity == "MUST":
            result.total_must_anchors += 1
            if anchor not in anchors:
                result.missing_must_anchors.append(anchor)
                result.findings.append(Finding(
                    severity="MUST",
                    code="MISSING_ANCHOR",
                    message=f"MUST anchor '{anchor}' ({defn['description']}) is missing",
                    anchor=anchor,
                ))
        elif effective_severity in ("SHOULD", "MAY"):
            result.total_should_anchors += 1
            if anchor not in anchors:
                result.missing_should_anchors.append(anchor)
                result.findings.append(Finding(
                    severity=effective_severity,
                    code="MISSING_ANCHOR",
                    message=f"{effective_severity} anchor '{anchor}' ({defn['description']}) is missing",
                    anchor=anchor,
                ))
        elif effective_severity == "FATAL":
            # Only add to findings, not to counts
            if anchor not in anchors:
                result.findings.append(Finding(
                    severity="FATAL",
                    code="MISSING_ANCHOR",
                    message=f"FATAL anchor '{anchor}' ({defn['description']}) is missing",
                    anchor=anchor,
                ))

    # Check sub-field placeholders within each present anchor
    for anchor in anchors:
        content = extract_anchor_content(text, anchor, anchors)
        anchor_def = anchor_defs.get(anchor)
        effective_severity = effective_severities.get(
            anchor,
            anchor_def["severity"] if anchor_def else "MAY",
        )
        if anchor_def and anchor_def.get("sub_fields") and effective_severity != "IGNORE":
            missing_fields = missing_subfields(content, anchor_def["sub_fields"])
            for field_name in missing_fields:
                result.findings.append(Finding(
                    severity=(
                        "FATAL"
                        if effective_severity == "FATAL"
                        else "MUST"
                        if effective_severity == "MUST"
                        else effective_severity
                    ),
                    code="MISSING_SUBFIELD",
                    message=f"Required field '{field_name}' is missing from {anchor}",
                    anchor=anchor,
                ))

        placeholders = detect_placeholders(content)
        result.placeholder_count += len(placeholders)
        for line_num, pattern in placeholders:
            result.findings.append(Finding(
                severity="WARN",
                code="PLACEHOLDER",
                message=f"Placeholder/filler content detected: {pattern!r}",
                line=anchors[anchor] + line_num,
                anchor=anchor,
            ))

        vague = detect_vague_filler(content)
        result.vague_filler_count += len(vague)
        for line_num, pattern in vague:
            result.findings.append(Finding(
                severity="WARN",
                code="VAGUE_FILLER",
                message=f"Vague filler content: {pattern!r}",
                line=anchors[anchor] + line_num,
                anchor=anchor,
            ))

    # Special checks for contract
    if is_contract:
        # Check that Selected-Scenario-Packs has at least one pack
        packs_content = extract_anchor_content(text, "##-Selected-Scenario-Packs", anchors)
        if "pack:" in packs_content.lower():
            pack_matches = re.findall(r"(?i)pack\s*[_:]\s*([a-d])", packs_content)
            if not pack_matches:
                result.findings.append(Finding(
                    severity="MUST",
                    code="NO_PACK_SELECTED",
                    message="Selected Scenario Packs exists but no pack identifier (A/B/C/D) found",
                    anchor="##-Selected-Scenario-Packs",
                ))

        if result.contract_depth == "minimal":
            matched_terms, line_num = detect_minimal_too_broad(text)
            if matched_terms:
                result.findings.append(Finding(
                    severity="WARN",
                    code="DEPTH_MISMATCH_MINIMAL_TOO_BROAD",
                    message=(
                        "contract_depth is minimal but the content expands into higher-risk "
                        f"concerns: {', '.join(matched_terms)}"
                    ),
                    line=line_num,
                ))

    # Special checks for report
    if not is_contract:
        # Check Validation Distinction
        distinction_findings = check_validation_distinction(text)
        result.findings.extend(distinction_findings)
        result.findings.extend(check_executed_validation_evidence(text))

        # Count fake validation
        executed_content = extract_anchor_content(text, "##-Executed-Validation", anchors)
        fake_validations = detect_fake_validation(executed_content)
        result.fake_validation_count = len(fake_validations)
        for line_num, pattern in fake_validations:
            result.findings.append(Finding(
                severity="FATAL",
                code="FAKE_VALIDATION",
                message=f"Falsely claimed validation detected: {pattern!r}",
                line=line_num,
                anchor="##-Executed-Validation",
            ))

    # Check stop conditions
    stopped, stop_findings = check_stop_condition(text, is_contract)
    result.stopped_before_code = stopped
    result.findings.extend(stop_findings)

    return result


def print_result(result: EvalResult, verbose: bool = False) -> None:
    """Print evaluation result."""
    print(f"\n{'='*70}")
    print(f"File: {result.file_path}")
    print(f"Type: {'Pre-Generation Contract' if result.is_contract else 'Implementation Report'}")
    print(f"Depth: {result.contract_depth or 'unknown'}")
    print(f"{'='*70}")
    print(f"Completeness:")
    print(f"  MUST anchors: {result.total_must_anchors - len(result.missing_must_anchors)}/{result.total_must_anchors} present", end="")
    if result.missing_must_anchors:
        print(f" — MISSING: {', '.join(result.missing_must_anchors)}")
    else:
        print()
    print(f"  SHOULD anchors: {result.total_should_anchors - len(result.missing_should_anchors)}/{result.total_should_anchors} present", end="")
    if result.missing_should_anchors:
        print(f" — MISSING: {', '.join(result.missing_should_anchors)}")
    else:
        print()
    print(f"Content quality:")
    print(f"  Placeholders/fillers: {result.placeholder_count}")
    print(f"  Vague filler content: {result.vague_filler_count}")
    if not result.is_contract:
        print(f"  Fake validation claims: {result.fake_validation_count}")
    print(f"Stop condition:")
    print(f"  Stopped before code: {result.stopped_before_code}")

    if verbose or result.findings:
        print(f"\nFindings ({len(result.findings)}):")
        for f in sorted(result.findings, key=lambda x: (
            0 if x.severity == "FATAL" else 1 if x.severity == "MUST" else 2
        )):
            print(f"  {f}")

    print(f"\nScore: {result.score:.1f} / Grade: {result.grade} / {'PASSED' if result.passed else 'FAILED'}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate Pre-Generation Contract or Implementation Report output quality.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("file", nargs="?", help="Path to the output file to evaluate")
    parser.add_argument("--suite", dest="suite", help="Path to tasks.json with model outputs")
    parser.add_argument("--check-missing", action="store_true",
        help="Check which anchor sections are missing from the template")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    parser.add_argument("--type", choices=["contract", "report"], default="contract",
        help="Expected output type (default: contract)")

    args = parser.parse_args()

    if args.check_missing:
        print("Contract MUST anchors:")
        for anchor, defn in CONTRACT_ANCHORS.items():
            print(f"  {anchor} — {defn['description']}")
        print("\nReport MUST anchors:")
        for anchor, defn in REPORT_ANCHORS.items():
            print(f"  {anchor} — {defn['description']}")
        return 0

    if args.suite:
        return run_suite(args.suite, args.type, args.verbose, args.json)

    if not args.file:
        parser.print_help()
        return 2

    path = Path(args.file)
    if not path.exists():
        print(f"Error: file not found: {path}", file=sys.stderr)
        return 2

    text = path.read_text(encoding="utf-8")
    is_contract = args.type == "contract" or ("##-Target-Language" in text)
    result = evaluate_output(text, str(path), is_contract=is_contract)
    print_result(result, verbose=args.verbose)

    if args.json:
        print(json.dumps({
            "file": result.file_path,
            "type": "contract" if result.is_contract else "report",
            "score": result.score,
            "grade": result.grade,
            "passed": result.passed,
            "must_completeness": result.must_completeness,
            "should_completeness": result.should_completeness,
            "missing_must_anchors": result.missing_must_anchors,
            "missing_should_anchors": result.missing_should_anchors,
            "placeholder_count": result.placeholder_count,
            "vague_filler_count": result.vague_filler_count,
            "fake_validation_count": result.fake_validation_count,
            "stopped_before_code": result.stopped_before_code,
            "findings": [
                {"severity": f.severity, "code": f.code, "message": f.message,
                 "line": f.line, "anchor": f.anchor}
                for f in result.findings
            ],
        }, indent=2))

    return 0 if result.passed else 1


def run_suite(suite_path: str, default_type: str, verbose: bool, as_json: bool) -> int:
    """Run evaluation against a tasks.json suite."""
    path = Path(suite_path)
    if not path.exists():
        print(f"Error: suite file not found: {path}", file=sys.stderr)
        return 2

    with open(path, encoding="utf-8") as f:
        suite = json.load(f)

    evaluated: list[tuple[EvalResult, bool, bool]] = []
    for task in suite.get("tasks", []):
        # Tasks can have inline contract/report text or reference files.
        file_path = task.get("id", "unknown")
        is_contract = task.get("type", default_type) == "contract"
        expected_pass = bool(task.get("expected_pass", True))
        text = task.get("contract_text") or task.get("report_text", "")

        if not text:
            file_key = "contract_file" if is_contract else "report_file"
            file_ref = task.get(file_key) or task.get("file")
            if file_ref:
                fixture_path = (path.parent / file_ref).resolve()
                if not fixture_path.exists():
                    print(f"Error: fixture file not found for task {file_path}: {fixture_path}", file=sys.stderr)
                    return 2
                text = fixture_path.read_text(encoding="utf-8")
                file_path = task.get("id", fixture_path.as_posix())

        if text:
            result = evaluate_output(text, file_path, is_contract=is_contract)
            matched_expectation = result.passed == expected_pass
            evaluated.append((result, expected_pass, matched_expectation))
            if verbose or not matched_expectation:
                print_result(result, verbose=verbose)

    if not evaluated:
        print("No results from suite")
        return 0

    matched = sum(1 for _r, _exp, ok in evaluated if ok)
    total = len(evaluated)
    avg_score = sum(r.score for r, _exp, _ok in evaluated) / total

    summary = {
        "suite": str(path),
        "total": total,
        "matched_expected": matched,
        "mismatched_expected": total - matched,
        "expected_match_rate": f"{matched}/{total}",
        "avg_score": avg_score,
        "results": [
            {
                "id": r.file_path,
                "score": r.score,
                "grade": r.grade,
                "actual_passed": r.passed,
                "expected_pass": expected_pass,
                "matched_expected": matched_expectation,
                "missing_must": r.missing_must_anchors,
                "fake_validation": r.fake_validation_count,
            }
            for r, expected_pass, matched_expectation in evaluated
        ],
    }

    if as_json:
        print(json.dumps(summary, indent=2))
    else:
        print(f"\n{'='*70}")
        print(f"Suite: {path}")
        print(f"Expectation matches: {matched}/{total} | Avg score: {avg_score:.1f}")
        print(f"{'='*70}")
        for r, expected_pass, matched_expectation in sorted(evaluated, key=lambda x: x[0].score):
            status = "PASS" if matched_expectation else "FAIL"
            actual = "pass" if r.passed else "fail"
            expected = "pass" if expected_pass else "fail"
            print(f"  [{status}] {r.file_path}: expected {expected}, got {actual} | {r.score:.1f} ({r.grade})")

    return 0 if matched == total else 1


if __name__ == "__main__":
    sys.exit(main())

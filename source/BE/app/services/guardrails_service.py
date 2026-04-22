"""
Guardrails Service — Input Safety Rails + PII Redaction.

Tính năng (chat_workflow.puml - Bước ①b):
- Jailbreak / Prompt injection detection
- PII detection & redaction (SĐT, CMND, email cá nhân)
- Toxic / harmful content check
"""
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class GuardrailViolation:
    """Bản ghi vi phạm guardrail."""
    rail_name: str
    severity: str  # "critical", "high", "medium", "low"
    message: str
    detected_content: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class GuardrailResult:
    """Kết quả kiểm tra guardrail."""
    passed: bool
    violations: List[GuardrailViolation] = field(default_factory=list)
    sanitized_text: Optional[str] = None
    pii_redacted: bool = False


# ═══════════════════════════════════════════════════════
# PII PATTERNS (Việt Nam)
# ═══════════════════════════════════════════════════════

PII_PATTERNS = {
    # SĐT Việt Nam: 0xxxxxxxxx (10 số) hoặc +84xxxxxxxxx (11 số)
    "PHONE": r"(?:\+84|0)[\s.-]?\d{1,3}[\s.-]?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{0,3}",
    # CMND/CCCD: 9 hoặc 12 số liên tiếp (standalone)
    "CMND": r"\b\d{9}\b|\b\d{12}\b",
    # Email cá nhân
    "EMAIL": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    # Số thẻ ngân hàng: 16 số (có thể có space/dash)
    "CARD": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
}

# Context-aware PII: Vietnamese keywords + any number → PII disclosure
# Matches: "cccd của tôi là 4445", "số cmnd 012345678", "căn cước 123..."
PII_CONTEXT_PATTERNS = {
    "CCCD/CMND": re.compile(
        r"(?:cccd|cmnd|căn\s*cước(?:\s*công\s*dân)?|chứng\s*minh(?:\s*nhân\s*dân)?|"
        r"số\s*(?:căn\s*cước|chứng\s*minh|cmnd|cccd|cmtnd))"
        r"[^0-9]{0,20}(\d{3,})",
        re.IGNORECASE
    ),
    "TÀI KHOẢN NGÂN HÀNG": re.compile(
        r"(?:số\s*tài\s*khoản|stk|tài\s*khoản\s*(?:ngân\s*hàng)?|account)"
        r"[^0-9]{0,20}(\d{4,})",
        re.IGNORECASE
    ),
    "MÃ SỐ THUẾ": re.compile(
        r"(?:mã\s*số\s*thuế|mst|tax\s*(?:id|code))"
        r"[^0-9]{0,20}(\d{4,})",
        re.IGNORECASE
    ),
    "BHXH": re.compile(
        r"(?:bảo\s*hiểm\s*xã\s*hội|bhxh|số\s*bhxh)"
        r"[^0-9]{0,20}(\d{4,})",
        re.IGNORECASE
    ),
}

# ═══════════════════════════════════════════════════════
# JAILBREAK / INJECTION PATTERNS
# ═══════════════════════════════════════════════════════

JAILBREAK_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)",
    r"(disregard|forget)\s+(all\s+)?(previous|prior|your)\s+(instructions?|rules?|prompts?)",
    r"you\s+are\s+now\s+(DAN|a\s+new|an?\s+unrestricted)",
    r"pretend\s+(you|that)\s+(are|is)\s+(not|no\s+longer)\s+(an?\s+)?AI",
    r"bypass\s+(safety|content|security)\s+(filter|check|restriction)",
    r"act\s+as\s+if\s+you\s+have\s+no\s+(rules|restrictions|limitations)",
    r"(system|developer)\s*prompt",
    r"repeat\s+(the|your)\s+(system|initial)\s+(prompt|instructions)",
]

TOXIC_KEYWORDS_VI = [
    # Từ ngữ thô tục phổ biến
    "chết đi", "ngu vãi", "đồ ngu", "thằng ngu", "con ngu", "ngu như", "ngu thế",
    "đm", "vcl", "vkl", "dcm", "clm", "đcm", "vãi", "đéo", "địt", "cặc", "lồn"
    "giết", "chém", "đánh chết", "tự tử", "chết tiệt", "mẹ mày", "đụ","ngu à"
    # English profanity — moved here, short space variants handled separately below
    # English profanity
    "fuck", "shit", "bitch", "ass", "damn", "hell",
    # Hate speech
    "đồ khốn", "thằng khốn", "con khốn", "đồ chó", "thằng chó",
    # Violence
    "giết mày", "chém mày", "đập chết", "đánh đập",
]

# Short space-separated variants — must be matched as STANDALONE phrases
# (not substring) to avoid false positives like "good morning" matching "d m"
TOXIC_SHORT_PATTERNS = [
    "đ m", "v c l", "d m", "c l m", "d.m", "v.c.l",
]


class GuardrailsService:
    """
    Service kiểm tra input với safety rails (chat_workflow.puml - Bước ①b).
    Pattern-based, lightweight, không cần thêm thư viện ngoài.
    """

    def check_input(self, text: str) -> GuardrailResult:
        """
        Kiểm tra user input qua tất cả input rails.

        Returns:
            GuardrailResult với pass/fail, violations list, và sanitized_text nếu có PII.
        """
        violations = []
        sanitized_text = text
        pii_redacted = False

        # ── Rail 1: Jailbreak / Prompt Injection ──────
        jailbreak_violation = self._check_jailbreak(text)
        if jailbreak_violation:
            violations.append(jailbreak_violation)

        # ── Rail 2: Toxic Content ─────────────────────
        toxic_violation = self._check_toxic(text)
        if toxic_violation:
            violations.append(toxic_violation)

        # ── Rail 3: PII Detection (STRICT BLOCKING) ───
        pii_violation, sanitized = self._check_and_redact_pii(text)
        if pii_violation:
            violations.append(pii_violation)
            # Note: We don't use sanitized text anymore since we're blocking
            pii_redacted = True

        # Block if ANY critical/high severity violation (including PII)
        has_blocking = any(
            v.severity in ("critical", "high")
            for v in violations
        )

        return GuardrailResult(
            passed=not has_blocking,
            violations=violations,
            sanitized_text=None,  # No longer redacting, we block instead
            pii_redacted=pii_redacted,
        )

    def _check_jailbreak(self, text: str) -> Optional[GuardrailViolation]:
        """Kiểm tra jailbreak / prompt injection."""
        for pattern in JAILBREAK_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"🛡️ Jailbreak detected: {pattern}")
                return GuardrailViolation(
                    rail_name="jailbreak_detection",
                    severity="critical",
                    message="Phát hiện nỗ lực can thiệp hệ thống",
                    detected_content=pattern,
                )
        return None

    def _check_toxic(self, text: str) -> Optional[GuardrailViolation]:
        """Kiểm tra toxic content (tiếng Việt + English).
        
        FIX: Use word-boundary matching instead of substring matching
        to prevent false positives like "Hello" matching "hell".
        """
        text_lower = text.lower()
        detected = []
        for kw in TOXIC_KEYWORDS_VI:
            # For multi-word keywords (e.g. "chết đi", "đồ ngu"): substring match is fine
            # For single words (e.g. "hell", "ass"): require word boundary to avoid "hello", "class"
            if ' ' in kw:
                # Multi-word: simple contains check
                if kw in text_lower:
                    detected.append(kw)
            else:
                # Single word: word-boundary regex check
                pattern = r'(?:^|[\s,.!?;:"\']|(?<=\s))' + re.escape(kw) + r'(?:[\s,.!?;:"\']|$)'
                if re.search(pattern, text_lower):
                    detected.append(kw)
        
        # Check short space-separated patterns as STANDALONE only
        # e.g. "đ m" must be the entire text or surrounded by sentence boundaries
        for kw in TOXIC_SHORT_PATTERNS:
            pattern = r'(?:^|(?<=[\s,.!?]))' + re.escape(kw) + r'(?=$|[\s,.!?])'
            if re.search(pattern, text_lower):
                detected.append(kw)
        
        if detected:
            logger.warning(f"🛡️ Toxic content: {detected[:3]}")
            return GuardrailViolation(
                rail_name="toxic_content",
                severity="high",
                message="Nội dung không phù hợp trong môi trường học tập",
                detected_content=", ".join(detected[:3]),
            )
        return None

    def _check_and_redact_pii(self, text: str) -> tuple:
        """
        Kiểm tra PII và BLOCK nếu phát hiện (strict mode).
        Trả về (violation_or_None, sanitized_text).
        
        Supports:
        1. Standalone patterns (9/12 digit CMND, phone, email, card)
        2. Context-aware patterns (keyword + number: "cccd của tôi là 4445")
        """
        detected_types = []

        # Check standalone PII patterns
        for pii_type, pattern in PII_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                detected_types.append(pii_type)

        # Check context-aware PII patterns (Vietnamese keywords + numbers)
        for pii_type, compiled_pattern in PII_CONTEXT_PATTERNS.items():
            if compiled_pattern.search(text):
                if pii_type not in detected_types:
                    detected_types.append(pii_type)

        if detected_types:
            logger.warning(f"🛡️ PII detected - BLOCKING: {detected_types}")
            return (
                GuardrailViolation(
                    rail_name="pii_detection",
                    severity="critical",
                    message=f"🔒 Phát hiện thông tin cá nhân ({', '.join(detected_types)}). Vì lý do bảo mật, vui lòng không chia sẻ số điện thoại, email, CMND/CCCD hoặc thông tin nhạy cảm khác.",
                    detected_content=f"{len(detected_types)} loại PII: {', '.join(detected_types)}",
                ),
                text,
            )

        return None, text

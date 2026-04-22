"""
Memory Manager — Quản lý ngữ cảnh hội thoại (chat_workflow.puml - Bước ②, ②b).

NEW: Rolling Summary Integration
- Short-term memory: Load N tin nhắn gần nhất
- Long-term memory: Rolling summaries (incremental, versioned)
- Key facts extraction: Trích từ khóa quan trọng
- Token budget management: Cắt bớt nếu vượt quota
"""
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.chat import Message, MessageRole
from app.services.llm_service import LLMService
from app.services.prompt_service import PromptService

# Import RollingSummaryService (avoid circular import with TYPE_CHECKING)
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.services.rolling_summary_service import RollingSummaryService

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════

SHORT_TERM_MESSAGES = 10   # Giữ 10 tin nhắn gần nhất
TOKEN_BUDGET = 4000        # Token budget cho memory context


@dataclass
class MemoryContext:
    """Ngữ cảnh bộ nhớ hoàn chỉnh cho một cuộc hội thoại."""
    history: List[Dict[str, str]]      # [{role, content}] — short-term
    rolling_summary_latest: Optional[str] = None  # Latest rolling summary (full context)
    rolling_summary_old: Optional[List[str]] = None  # Old relevant summaries
    key_facts: Optional[List[str]] = None  # Từ khóa quan trọng
    total_messages: int = 0
    
    def __post_init__(self):
        if self.rolling_summary_old is None:
            self.rolling_summary_old = []


def estimate_tokens(text: str) -> int:
    """Ước tính tokens (~3 ký tự/token cho mixed Việt-Anh)."""
    return len(text) // 3


class MemoryManager:
    """
    Quản lý bộ nhớ cuộc trò chuyện.

    NEW: Rolling Summary Integration
    - Short-term: N tin nhắn cuối (trực tiếp từ DB)
    - Long-term: Rolling summaries (incremental, versioned, searchable)
    """

    def __init__(
        self, 
        db: Session, 
        llm_service: Optional['LLMService'] = None, 
        prompt_service: Optional['PromptService'] = None,
        rolling_summary_service: Optional['RollingSummaryService'] = None
    ):
        self.db = db
        # These will be initialized lazily if not provided (to avoid circular dependency issues)
        self.llm_service = llm_service
        self.prompt_service = prompt_service
        self.rolling_summary_service = rolling_summary_service

 
    async def get_context(
        self,
        conversation_id: int,
        current_query: str = "",
        exclude_message_id: Optional[int] = None,
    ) -> MemoryContext:
        """
        Load memory context cho conversation (Bước ②).

        NEW: Rolling Summary Integration
        - Load short-term history (10 messages)
        - Load rolling summary context (latest + relevant old versions)
        - Extract key facts

        Args:
            conversation_id: ID cuộc hội thoại
            current_query: Câu hỏi hiện tại (để search old summaries)
            exclude_message_id: ID message cần loại trừ (user msg vừa tạo)

        Returns:
            MemoryContext chứa history + rolling summaries + facts
        """
        # ── Đếm tổng tin nhắn ──────────────────────────
        total_query = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        )
        if exclude_message_id:
            total_query = total_query.filter(Message.id != exclude_message_id)
        total_messages = total_query.count()

        # ── Load Short-term (N tin nhắn gần nhất) ──────
        query = (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
        )
        if exclude_message_id:
            query = query.filter(Message.id != exclude_message_id)

        recent_messages = (
            query
            .order_by(Message.created_at.desc())
            .limit(SHORT_TERM_MESSAGES)
            .all()
        )
        recent_messages.reverse()  # Chronological order

        history = [
            {"role": m.role.value, "content": m.content}
            for m in recent_messages
        ]

        # ── NEW: Rolling Summary Context ────────────────
        rolling_latest = None
        rolling_old = []
        
        if self.rolling_summary_service and current_query:
            try:
                summary_context = await self.rolling_summary_service.get_summary_context(
                    conversation_id=conversation_id,
                    current_query=current_query,
                    top_k_old=2  # Get top 2 relevant old versions
                )
                
                if summary_context.latest_summary:
                    rolling_latest = summary_context.latest_summary.summary_text
                
                if summary_context.relevant_old_summaries:
                    rolling_old = [
                        s.summary_text for s in summary_context.relevant_old_summaries
                    ]
                    
                logger.info(
                    f"Rolling summary context: latest={bool(rolling_latest)}, "
                    f"old_versions={len(rolling_old)}"
                )
            except Exception as e:
                logger.warning(f"Failed to load rolling summary context: {e}")

        # ── Key Facts (Bước ②b - lightweight) ──────────
        key_facts = self._extract_key_facts(history) if history else None

        return MemoryContext(
            history=history,
            rolling_summary_latest=rolling_latest,
            rolling_summary_old=rolling_old,
            key_facts=key_facts,
            total_messages=total_messages,
        )

    def should_summarize(self, conversation_id: int) -> bool:
        """
        DEPRECATED: Use rolling_summary_service.should_create_new_version() instead.
        Kept for backward compatibility.
        """
        if self.rolling_summary_service:
            return self.rolling_summary_service.should_create_new_version(conversation_id)
        return False

    def _extract_key_facts(self, history: List[Dict[str, str]]) -> Optional[List[str]]:
        """
        Trích xuất key facts/terms từ history bằng LLM.
        
        FIX 3: Now uses REAL LLM via PromptService instead of simple word frequency.
        """
        if not history:
            return None

        # FIX 3: Use REAL LLM with PromptService
        if self.llm_service and self.prompt_service:
            try:
                import asyncio
                prompt = self.prompt_service.build_facts_extraction_prompt(history)
                
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                result = loop.run_until_complete(
                    self.llm_service.chat_completion(
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.1,
                        max_tokens=50
                    )
                )
                
                # Parse list from response
                content = result["content"].strip()
                if content:
                    # Handle various formats: comma-separated, dash-separated, numbered list
                    keywords = [k.strip() for k in content.replace("-", ",").replace("\n", ",").split(",") if k.strip()]
                    # Remove numbering like "1.", "2." etc
                    import re
                    keywords = [re.sub(r'^\d+[\.\)]\s*', '', k) for k in keywords]
                    keywords = [k for k in keywords if k and len(k) > 2]
                    if keywords:
                        logger.info(f"✅ LLM facts extracted: {keywords[:5]}")
                        return keywords[:5]
            except Exception as e:
                logger.error(f"Error generating LLM facts: {e}")

        # Fallback simple heuristic (if LLM fails)
        # Gộp tất cả nội dung
        all_text = " ".join(m["content"] for m in history).lower()

        # Vietnamese stopwords
        stopwords = {
            "và", "của", "là", "có", "được", "cho", "với", "trong", "này",
            "đã", "để", "các", "một", "những", "không", "từ", "như", "khi",
            "về", "theo", "trên", "đến", "ra", "vào", "còn", "cũng", "nên",
            "thì", "mà", "hay", "hoặc", "nếu", "vì", "do", "bởi", "tại",
            "bạn", "tôi", "gì", "nào", "sao", "thế", "vậy", "ạ",
        }

        # Tokenize & count
        words = all_text.split()
        word_freq: Dict[str, int] = {}
        for w in words:
            w = w.strip(".,!?:;\"'()[]{}").lower()
            if len(w) > 2 and w not in stopwords:
                word_freq[w] = word_freq.get(w, 0) + 1

        # Get top 5 most frequent non-trivial words
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        top_facts = [word for word, count in sorted_words[:5] if count >= 2]

        if top_facts:
            logger.warning(f"⚠️ Using fallback facts (LLM unavailable): {top_facts}")
        return top_facts if top_facts else None

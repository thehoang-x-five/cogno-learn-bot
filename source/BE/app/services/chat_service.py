"""
 Chat Service — SSE Streaming Orchestrator.
  Full pipeline theo chat_workflow.puml:
  ①b Guardrails+PII → ② Memory → ③ Intent → ④ RAG Pipeline → ⑤ Citations → ⑥ Save → ⑦ Metadata
"""
import json
import logging
import re
import time
import uuid
from enum import Enum
from typing import AsyncGenerator, Dict, List, Optional, Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models.chat import Conversation, Message, Citation, MessageRole
from app.services.app_settings_service import get_effective_llm_config, get_effective_rag_config
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.services.guardrails_service import GuardrailsService
from app.services.memory_manager import MemoryManager
from app.services.prompt_service import PromptService, PromptContext
from app.services.rolling_summary_service import RollingSummaryService

logger = logging.getLogger(__name__)


DEFAULT_CONVERSATION_TITLES = {
    "cuộc hội thoại mới",
    "cuộc trò chuyện mới",
    "new conversation",
    "untitled",
}


def _normalize_title_key(title: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _is_auto_title_candidate(title: Optional[str]) -> bool:
    """Return True when the current title still looks auto-generated or meaningless."""
    title_text = (title or "").strip()
    if not title_text:
        return True

    if _normalize_title_key(title_text) in DEFAULT_CONVERSATION_TITLES:
        return True

    compact = re.sub(r"[\W_]+", "", title_text, flags=re.UNICODE)
    return len(compact) <= 2


def _clean_generated_title(title: Optional[str]) -> Optional[str]:
    if not title:
        return None

    title_text = re.sub(r"[\r\n]+", " ", title).strip(" \"'.:-")
    title_text = re.sub(r"\s+", " ", title_text)
    if not title_text or _is_auto_title_candidate(title_text):
        return None

    return title_text[:80]


# ═══════════════════════════════════════════════════════
# SSE EVENT TYPES (Updated with Quality Warning)
# ═══════════════════════════════════════════════════════

class StreamEventType(str, Enum):
    PROGRESS = "progress"
    TOKEN = "token"
    CITATIONS = "citations"
    METADATA = "metadata"
    ERROR = "error"
    DONE = "done"
    QUALITY_WARNING = "quality_warning"  # NEW: Quality monitoring event
    SAVED = "saved"  # NEW: Backend save confirmation event


def sse_event(event_type: StreamEventType, data: Dict[str, Any]) -> str:
    """Format an SSE event string."""
    data_str = json.dumps(data, ensure_ascii=False)
    return f"event: {event_type.value}\ndata: {data_str}\n\n"


# ═══════════════════════════════════════════════════════
# INTENT DETECTION (Bước ③) - LLM-Based with Direct Response
# ═══════════════════════════════════════════════════════

# Keyword lists for pre-filtering
KNOWLEDGE_KEYWORDS = [
    # Question words (multi-word only, safe from false positives)
    "là gì", "giải thích", "tại sao", "như thế nào", "làm sao",
    "what is", "explain", "define", "definition",
    # Summarization of CONTENT (not conversation)
    "tổng hợp kiến thức", "liệt kê", "summarize",
    # Technical terms (multi-word to avoid collisions)
    "machine learning", "deep learning", "neural network", "thuật toán",
    "artificial intelligence",
    # Academic terms (multi-word to avoid collisions)
    "ví dụ", "công thức", "định nghĩa", "khái niệm",
    "lý thuyết",
]

CONVERSATIONAL_KEYWORDS = [
    # Chat history / conversation recall
    "tóm tắt hội thoại", "tóm tắc hội thoại",
    "tóm tắt cuộc trò chuyện", "tóm tắc cuộc trò chuyện",
    "tóm tắt cuộc hội thoại",
    "tôi vừa nói gì", "tôi đã nói gì", "tôi đã hỏi gì",
    "nhắc lại câu trước", "nhắc lại cuộc trò chuyện",
    "lịch sử trò chuyện", "lịch sử chat",
    "từ đầu đến", "từ lúc đầu",
    # Thảo luận / discussion recall (must be about the conversation itself)
    "đã thảo luận gì", "thảo luận những gì",
    "mình đã nói", "ta đã nói", "chúng ta đã nói",
    "mình đã bàn", "ta đã bàn", "chúng ta đã bàn",
    "trước đó ta nói", "trước đó mình nói",
]

SCHEDULE_KEYWORDS = [
    "lịch thi", "lịch học", "thời khóa biểu", "khi nào thi", "lịch kiểm tra",
    "thi cuối kỳ", "thi giữa kỳ", "exam schedule",
]

QUIZ_KEYWORDS = [
    "tạo quiz", "câu hỏi trắc nghiệm", "cho tôi câu hỏi",
    "tạo bài trắc nghiệm", "tạo câu hỏi",
    "câu quiz", "làm quiz", "ra quiz", "bài quiz",
    "tạo bài kiểm tra", "tạo đề",
]


def _pre_filter_intent(query: str) -> Optional[str]:
    """
    Pre-filter intent using keyword matching (fast, deterministic).
    Returns intent if confident match, None otherwise.
    
    Uses multi-word keywords to avoid false positives like
    "ai" matching "Bạn là ai?" or "test" matching "contest".
    Only keywords that are 2+ words or very specific are used here.
    Ambiguous single words are left for LLM classification.
    """
    query_lower = query.lower()
    
    # Check GREETING first (exact match, highest confidence)
    greeting_only = query_lower.strip().rstrip("?!.") in [
        "xin chào", "hi", "hello", "chào bạn", "hey", "chào",
        "hi bạn", "hello bạn", "chào bot", "xin chào bạn","alo"
    ]
    if greeting_only:
        return "GREETING"
    
    # Check for quiz keywords FIRST (very explicit intent, avoid misroute)
    if any(kw in query_lower for kw in QUIZ_KEYWORDS):
        return "QUIZ_REQUEST"
    
    # Regex fallback for quiz patterns with numbers: "tạo 7 câu quiz", "cho 10 câu hỏi"
    import re
    if re.search(r'(?:tạo|tao|cho|generate)\s*\d+\s*(?:câu|quiz|question)', query_lower):
        return "QUIZ_REQUEST"
    
    # Check CONVERSATIONAL before knowledge (to catch "tóm tắt hội thoại" before "tóm tắt")
    if any(kw in query_lower for kw in CONVERSATIONAL_KEYWORDS):
        return "CONVERSATIONAL"
    
    # Check for schedule keywords (before knowledge to avoid collision)
    if any(kw in query_lower for kw in SCHEDULE_KEYWORDS):
        return "SCHEDULE_QUERY"
    
    # Check for knowledge keywords (safe multi-word matches)
    if any(kw in query_lower for kw in KNOWLEDGE_KEYWORDS):
        return "KNOWLEDGE_QA"
    
    # Let LLM decide for ambiguous cases (e.g. "bạn là ai?", "cách dùng X")
    return None


async def detect_intent_and_respond_llm(
    query: str,
    llm_service: 'LLMService',
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    LLM-based intent detection + direct response generation.
    
    Strategy: Keyword pre-filter + LLM classification for reliability.
      Step 0: Keyword pre-filter (fast, deterministic)
      Step 1: LLM classify intent (if not pre-filtered)
      Step 2: Generate response (only for GREETING/CHITCHAT)
    
    Args:
        query: User question
        llm_service: LLM service instance
        history: Conversation history for context (IMPORTANT for accurate classification)
    
    Returns: {
        "intent": "GREETING" | "CHITCHAT" | "KNOWLEDGE_QA" | "SCHEDULE_QUERY" | "QUIZ_REQUEST" | "CONVERSATIONAL",
        "response": str (only for non-KNOWLEDGE_QA),
        "confidence": float
    }
    """
    # ── STEP 0: KEYWORD PRE-FILTER (fast, deterministic) ─────
    # This prevents false positives from LLM misclassification
    pre_filtered_intent = _pre_filter_intent(query)
    if pre_filtered_intent:
        logger.info(f"Intent pre-filtered: {pre_filtered_intent} (keyword match)")
        
        # GREETING: skip classification, use LLM to generate a natural greeting (with short timeout)
        if pre_filtered_intent == "GREETING":
            import asyncio
            try:
                greeting_result = await asyncio.wait_for(
                    llm_service.chat_completion(
                        messages=[
                            {"role": "system", "content": "Bạn là trợ lý học tập AI thân thiện. Hãy chào hỏi ngắn gọn, tự nhiên và hỏi người dùng muốn tìm hiểu gì."},
                            {"role": "user", "content": query}
                        ],
                        max_tokens=80,
                        temperature=0.8,
                    ),
                    timeout=5.0  # 5s max — fallback if all keys rate-limited
                )
                return {
                    "intent": "GREETING",
                    "response": greeting_result["content"].strip(),
                    "confidence": 0.99,
                    "raw_llm_response": "PRE_FILTERED_GREETING",
                }
            except Exception:
                import random
                greetings = [
                    "Xin chào! 👋 Tôi có thể giúp gì cho bạn về tài liệu môn học?",
                    "Chào bạn! 👋 Bạn muốn tìm hiểu gì hôm nay?",
                    "Hello! 👋 Tôi sẵn sàng hỗ trợ bạn. Hãy hỏi tôi về tài liệu nhé!",
                ]
                return {
                    "intent": "GREETING",
                    "response": random.choice(greetings),
                    "confidence": 0.99,
                    "raw_llm_response": "PRE_FILTERED_FALLBACK",
                }
        
        # All other pre-filtered intents: return immediately
        return {
            "intent": pre_filtered_intent,
            "response": None,
            "confidence": 0.98,
            "raw_llm_response": "PRE_FILTERED",
        }
    
    # ── STEP 1: CLASSIFY INTENT (LLM-based) ──────────────────
    classify_prompt = """Bạn là bộ phân loại intent. Phân loại câu hỏi của người dùng vào MỘT trong 6 loại sau.

QUY TẮC QUAN TRỌNG:
- Nếu câu hỏi về NỘI DUNG HỌC TẬP, tài liệu, kiến thức → KNOWLEDGE_QA
- Nếu câu hỏi về CUỘC TRÒ CHUYỆN HIỆN TẠI ("tôi vừa nói gì", "tóm tắt hội thoại", "nhắc lại") → CONVERSATIONAL
- Chỉ chọn GREETING nếu là lời chào THUẦN TÚY, KHÔNG có câu hỏi
- Ưu tiên KNOWLEDGE_QA khi yêu cầu tóm tắt NỘI DUNG/TÀI LIỆU ("tóm tắt bài học", "tổng hợp kiến thức")
- Ưu tiên CONVERSATIONAL khi hỏi về LỊCH SỬ CHAT ("tôi đã hỏi gì", "tóm tắt cuộc trò chuyện")

CÁC LOẠI:
1. GREETING - Lời chào thuần túy: "xin chào", "hello", "hi" (KHÔNG có câu hỏi)
2. CHITCHAT - Hỏi tính năng bot hoặc trò chuyện phiếm: "bạn là ai", "bạn giúp gì", "khỏe không"
3. SCHEDULE_QUERY - Hỏi lịch: "lịch thi", "lịch học", "thời khóa biểu"
4. QUIZ_REQUEST - Yêu cầu quiz: "tạo quiz", "câu hỏi trắc nghiệm", "ôn tập"
5. CONVERSATIONAL - Hỏi về cuộc trò chuyện: "tôi vừa nói gì", "tóm tắt hội thoại", "nhắc lại câu trước"
6. KNOWLEDGE_QA - Yêu cầu kiến thức từ tài liệu (mặc định khi nghi ngờ)

VÍ DỤ:
- "Xin chào" → GREETING
- "Chào bạn, giải thích về ML" → KNOWLEDGE_QA
- "Tóm tắt bài học" → KNOWLEDGE_QA
- "Tóm tắt cuộc trò chuyện" → CONVERSATIONAL
- "Tôi vừa hỏi gì" → CONVERSATIONAL
- "Nhắc lại câu trước" → CONVERSATIONAL

CHỈ TRẢ LỜI DUY NHẤT MỘT TỪ (không giải thích):
GREETING hoặc CHITCHAT hoặc SCHEDULE_QUERY hoặc QUIZ_REQUEST hoặc CONVERSATIONAL hoặc KNOWLEDGE_QA"""

    try:
        classify_messages = [
            {"role": "system", "content": classify_prompt},
        ]
        # Include recent history so LLM has context for better classification
        if history:
            for h in history[-4:]:  # Last 2 exchanges max
                classify_messages.append({"role": h["role"], "content": h["content"][:100]})
        classify_messages.append({"role": "user", "content": query})
        # Use asyncio.wait_for to strictly enforce the intent timeout instead of hanging
        import asyncio
        classify_result = await asyncio.wait_for(
            llm_service.chat_completion(
                messages=classify_messages,
                model=settings.GEMINI_INTENT_MODEL,  # FIX 6: Use flash-lite for intent to reduce rate limits
                temperature=0.0,
                max_tokens=20,  # FIX 5: Increased from 10 to 20 to prevent truncation
            ),
            timeout=float(settings.INTENT_DETECT_TIMEOUT)
        )
        
        raw_intent = classify_result["content"].strip().upper()
        raw_intent = raw_intent.strip('"\'`., ')
        
        # Extract intent from response
        intent = _extract_intent(raw_intent)
        logger.info(f"Intent classified: '{classify_result['content']}' (raw) → '{raw_intent}' (cleaned) → {intent}")
        
        if intent in ("KNOWLEDGE_QA", "CONVERSATIONAL"):
            return {
                "intent": intent,
                "response": None,
                "confidence": 0.95,
                "raw_llm_response": classify_result["content"],  # DEBUG: Include raw response
            }
        
        # ── STEP 2: GENERATE RESPONSE (only for GREETING/CHITCHAT) ──
        if intent == "GREETING":
            respond_prompt = (
                "Bạn là trợ lý AI học tập thân thiện. "
                "Hãy chào lại người dùng một cách tự nhiên, thân thiện. "
                "Giới thiệu ngắn gọn rằng bạn có thể giúp tìm kiếm tài liệu và trả lời câu hỏi học tập. "
                "Trả lời bằng tiếng Việt, 2-3 câu."
            )
        else:  # CHITCHAT
            respond_prompt = (
                "Bạn là trợ lý AI học tập thân thiện. "
                "Người dùng đang hỏi về bạn hoặc khả năng của bạn. "
                "Hãy giới thiệu rằng bạn có thể: tìm kiếm thông tin trong tài liệu môn học, "
                "giải thích khái niệm, trả lời câu hỏi học tập. "
                "Trả lời bằng tiếng Việt, 2-3 câu, tự nhiên và thân thiện."
            )
        
        respond_messages = [
            {"role": "system", "content": respond_prompt},
            {"role": "user", "content": query}
        ]
        respond_result = await llm_service.chat_completion(
            messages=respond_messages,
            model=settings.GEMINI_INTENT_MODEL,  # FIX 6: Use flash-lite for greeting/chitchat responses too
            temperature=0.7,
            max_tokens=300,
        )
        
        response_text = _clean_response(respond_result["content"])
        logger.info(f"Generated {intent} response: '{response_text[:80]}...'")
        
        # If response is too short or empty, use a fallback
        if not response_text or len(response_text) < 10:
            response_text = _fallback_response(intent)
            logger.warning(f"Response too short, using fallback")
        
        return {
            "intent": intent,
            "response": response_text,
            "confidence": 0.92,
            "raw_llm_response": classify_result["content"],  # DEBUG: Include raw classification response
        }
            
    except Exception as e:
        logger.warning(f"Intent detection error: {e}, defaulting to KNOWLEDGE_QA")
        return {
            "intent": "KNOWLEDGE_QA",
            "response": None,
            "confidence": 0.5,
            "raw_llm_response": f"ERROR: {str(e)}",  # DEBUG: Include error
        }


def _extract_intent(raw: str) -> str:
    """Extract intent label from LLM classification response.
    
    FIX 4: Added SCHEDULE_QUERY and QUIZ_REQUEST patterns.
    FIX 5: Improved robustness - handle truncated/partial responses.
    """
    import re
    
    if not raw or len(raw.strip()) == 0:
        logger.warning(f"Intent detection returned empty string, defaulting to KNOWLEDGE_QA")
        return "KNOWLEDGE_QA"
    
    # Clean up the response
    raw = raw.strip().upper()
    
    # Direct match (most specific first)
    if "SCHEDULE_QUERY" in raw:
        return "SCHEDULE_QUERY"
    if "QUIZ_REQUEST" in raw:
        return "QUIZ_REQUEST"
    if "CONVERSATIONAL" in raw:
        return "CONVERSATIONAL"
    if "KNOWLEDGE_QA" in raw:
        return "KNOWLEDGE_QA"
    if "GREETING" in raw:
        return "GREETING"
    if "CHITCHAT" in raw:
        return "CHITCHAT"
    
    # FIX 5: Handle truncated responses (single letter or partial word)
    # If response is very short (1-2 chars), try to match prefix
    if len(raw) <= 2:
        if raw.startswith('G'):
            logger.warning(f"Intent truncated to '{raw}', assuming GREETING")
            return "GREETING"
        elif raw.startswith('C'):
            logger.warning(f"Intent truncated to '{raw}', assuming CHITCHAT")
            return "CHITCHAT"
        elif raw.startswith('S'):
            logger.warning(f"Intent truncated to '{raw}', assuming SCHEDULE_QUERY")
            return "SCHEDULE_QUERY"
        elif raw.startswith('Q'):
            logger.warning(f"Intent truncated to '{raw}', assuming QUIZ_REQUEST")
            return "QUIZ_REQUEST"
        elif raw.startswith('K'):
            logger.warning(f"Intent truncated to '{raw}', assuming KNOWLEDGE_QA")
            return "KNOWLEDGE_QA"
    
    # Fuzzy match for Vietnamese responses
    raw_lower = raw.lower()
    if any(w in raw_lower for w in ["lịch thi", "lịch học", "thời khóa biểu", "schedule", "lịch kiểm tra", "khi nào thi", "lịch thi cuối kỳ"]):
        return "SCHEDULE_QUERY"
    if any(w in raw_lower for w in ["quiz", "trắc nghiệm", "ôn tập", "tạo câu hỏi", "bài tập", "cho tôi câu hỏi"]):
        return "QUIZ_REQUEST"
    if any(w in raw_lower for w in ["chào", "greeting", "lời chào", "hello", "hi"]):
        return "GREETING"
    if any(w in raw_lower for w in ["chitchat", "hỏi về bot", "trò chuyện", "bạn là ai"]):
        return "CHITCHAT"
    
    # Default
    logger.warning(f"Could not extract intent from '{raw}', defaulting to KNOWLEDGE_QA")
    return "KNOWLEDGE_QA"


def _clean_response(text: str) -> str:
    """
    Clean LLM response text:
    - Strip leading/trailing quotes and backticks
    - Remove any leaked intent labels (INTENT:, GREETING:, CHITCHAT:, etc.)
    - Remove Output: prefix
    """
    import re
    
    if not text:
        return ""
    
    # Strip whitespace and outer quotes/backticks
    cleaned = text.strip().strip('"\'`')
    
    # Remove leading "INTENT: XXX\n" line if present
    cleaned = re.sub(
        r'^INTENT:\s*(GREETING|CHITCHAT|KNOWLEDGE_QA)\s*[\n\r]+',
        '', cleaned, flags=re.IGNORECASE
    ).strip()
    
    # Remove leading "GREETING:", "CHITCHAT:", etc. prefix
    cleaned = re.sub(
        r'^(GREETING|CHITCHAT|KNOWLEDGE_QA)\s*[:\-]\s*',
        '', cleaned, flags=re.IGNORECASE
    ).strip()
    
    # Remove "Output:" prefix
    cleaned = re.sub(r'^Output\s*:\s*', '', cleaned, flags=re.IGNORECASE).strip()
    
    # Strip remaining outer quotes
    cleaned = cleaned.strip('"\'`')
    
    return cleaned


def _fallback_response(intent: str) -> str:
    """Generate a fallback response when LLM response is too short or empty."""
    if intent == "GREETING":
        return (
            "Xin chào! 👋 Tôi là trợ lý học tập AI, sẵn sàng giúp bạn tìm hiểu "
            "và giải đáp thắc mắc về nội dung khóa học. Bạn cần hỗ trợ gì?"
        )
    elif intent == "CHITCHAT":
        return (
            "Tôi là trợ lý AI học tập. Tôi có thể giúp bạn tìm kiếm thông tin "
            "trong tài liệu môn học, giải thích khái niệm và trả lời các câu hỏi "
            "về nội dung khóa học. Hãy hỏi tôi bất cứ điều gì!"
        )
    return ""


# ═══════════════════════════════════════════════════════
# CHAT SERVICE
# ═══════════════════════════════════════════════════════

class ChatService:
    """
    Chat Pipeline Orchestrator — Full flow theo chat_workflow.puml:
    ①b Guardrails → ② Memory → ③ Intent → ④ RAG → ⑤ Citations → ⑥ Save → ⑦ Metadata
    """

    def __init__(self, db: Session):
        self.db = db
        self.rag_service = RAGService(db)
        self.llm_service = LLMService()
        self.prompt_service = PromptService()
        self.guardrails = GuardrailsService()
        # NEW: Initialize RollingSummaryService
        self.rolling_summary_service = RollingSummaryService(db, llm_service=self.llm_service)
        # Pass rolling_summary_service to MemoryManager
        self.memory_manager = MemoryManager(
            db, 
            llm_service=self.llm_service, 
            prompt_service=self.prompt_service,
            rolling_summary_service=self.rolling_summary_service  # NEW
        )

    # ═══════════════════════════════════════════════════════
    # EDIT MESSAGE & ROLLBACK
    # ═══════════════════════════════════════════════════════

    def rollback_after_message(self, conversation_id: int, message_id: int, user_id: int) -> int:
        """
        Delete all messages (and their citations) after the given message_id
        in the conversation. Returns count of deleted messages.
        """
        # Verify the message belongs to the user's conversation
        msg = self.db.query(Message).filter(
            Message.id == message_id,
            Message.conversation_id == conversation_id,
        ).first()
        if not msg:
            return -1

        conv = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        ).first()
        if not conv:
            return -1

        # Find all messages after this one
        later_messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.id > message_id,
        ).all()

        count = len(later_messages)
        if count > 0:
            later_ids = [m.id for m in later_messages]
            # Delete citations first (FK constraint)
            self.db.query(Citation).filter(
                Citation.message_id.in_(later_ids)
            ).delete(synchronize_session=False)
            # Delete messages
            self.db.query(Message).filter(
                Message.id.in_(later_ids)
            ).delete(synchronize_session=False)
            self.db.commit()
            logger.info(f"Rollback: deleted {count} messages after msg_id={message_id}")

        return count

    def update_message_content(self, message_id: int, new_content: str) -> bool:
        """Update the content of a user message."""
        msg = self.db.query(Message).filter(Message.id == message_id).first()
        if not msg or msg.role != MessageRole.user:
            return False
        msg.content = new_content
        self.db.commit()
        return True

    async def edit_and_reprocess(
        self,
        user_id: int,
        conversation_id: int,
        message_id: int,
        new_content: str,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Edit a user message, rollback all subsequent messages, and re-process.
        Yields SSE events just like process_message.
        """
        # 1. Rollback messages after the edited one
        rollback_count = self.rollback_after_message(conversation_id, message_id, user_id)
        if rollback_count < 0:
            yield sse_event(StreamEventType.ERROR, {
                "message": "Không tìm thấy tin nhắn để chỉnh sửa",
                "code": "NOT_FOUND",
            })
            return

        # 2. Update message content
        self.update_message_content(message_id, new_content)

        # 3. Invalidate memory cache
        try:
            from app.services.redis_manager import get_redis
            from app.services.memory_cache import MemoryCacheManager
            redis_client = await get_redis()
            if redis_client:
                memory_cache = MemoryCacheManager(redis_client)
                await memory_cache.invalidate(conversation_id)
        except Exception:
            pass

        # 4. Re-process — but skip saving user message (already exists)
        #    We do this by calling process_message which will create a NEW user msg
        #    Instead, we delete it right after and keep the edited one.
        #    Better approach: yield events from process_message_after_edit
        async for event in self._process_after_edit(
            user_id=user_id,
            conversation_id=conversation_id,
            content=new_content,
            model=model,
        ):
            yield event

    async def _process_after_edit(
        self,
        user_id: int,
        conversation_id: int,
        content: str,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Re-process after edit — delegates to process_message with skip_user_save=True."""
        async for event in self.process_message(
            user_id=user_id,
            conversation_id=conversation_id,
            content=content,
            model=model,
            skip_user_save=True,
        ):
            yield event

    async def process_message(
        self,
        user_id: int,
        conversation_id: int,
        content: str,
        model: Optional[str] = None,
        skip_user_save: bool = False,
    ) -> AsyncGenerator[str, None]:
        """
        Process a chat message and yield SSE events.

        Full pipeline:
        ⓪ Dedup Cache → ①b Guardrails+PII → ② Memory (cached) → ③ Intent → ④ RAG → ⑤ Citations → ⑥ Save → ⑦ Metadata
        """
        import asyncio
        
        print(f"🚀 process_message called: user={user_id}, conv={conversation_id}, content='{content[:50]}'", flush=True)
        
        trace_id = str(uuid.uuid4())[:12]
        start_time = time.time()
        guardrails_passed = True
        pii_redacted = False
        done_emitted = False  # Track whether done/error event was emitted
        
        # Pre-initialize variables used across try blocks to avoid NameError
        redis_client = None
        memory_cache = None
        answer_accumulator = ""  # Accumulated response text (for partial save on abort)

        logger.info(f"[{trace_id}] Chat start — q='{content[:50]}' conv={conversation_id}")

        try:
            # ── Progress: Starting ─────────────────────────
            yield sse_event(StreamEventType.PROGRESS, {
                "step": "starting",
                "progress": 5,
                "message": "Đang khởi tạo...",
                "trace_id": trace_id,
            })

            # ══════════════════════════════════════════════
            # ⓪ DEDUP CACHE CHECK (NEW OPTIMIZATION)
            # ══════════════════════════════════════════════
            
            dedup_cache = None
            try:
                from app.services.redis_manager import get_redis
                from app.services.dedup_cache import DedupCache
                
                redis_client = await get_redis()
                if redis_client:
                    # Get conversation to extract course_id
                    conversation = self.db.query(Conversation).filter(
                        Conversation.id == conversation_id,
                        Conversation.user_id == user_id,
                    ).first()
                    
                    if conversation:
                        dedup_cache = DedupCache(redis_client, ttl=5)
                        cached_result = await dedup_cache.get(user_id, conversation.course_id, content)
                        
                        if cached_result:
                            logger.info(f"[{trace_id}] ⚡ Dedup cache HIT — returning cached response")
                            
                            # Stream cached answer word-by-word for natural UX
                            cached_answer = cached_result.get("answer", "")
                            if cached_answer:
                                import re
                                # Split into words keeping whitespace/newlines attached
                                tokens = re.findall(r'\S+\s*|\n', cached_answer)
                                for i, token in enumerate(tokens):
                                    yield sse_event(StreamEventType.TOKEN, {
                                        "content": token,
                                        "index": i,
                                    })
                            
                            # Save to DB (same as normal flow) so frontend can find it
                            cache_time_ms = int((time.time() - start_time) * 1000)
                            if cached_answer:
                                assistant_msg = self._save_assistant_message(
                                    conversation_id, cached_answer, trace_id,
                                    "cache", len(cached_answer) // 3,
                                    total_time_ms=cache_time_ms,
                                )
                                
                                # Emit SAVED event so frontend knows message ID
                                yield sse_event(StreamEventType.SAVED, {
                                    "message_id": assistant_msg.id,
                                    "timestamp": assistant_msg.created_at.isoformat(),
                                    "trace_id": trace_id,
                                })
                            
                            # Send cached metadata
                            cached_metadata = cached_result.get("metadata", {})
                            cached_metadata["conversation_title"] = (
                                await self._refresh_conversation_title(conversation_id, content, trace_id)
                                or conversation.title
                            )
                            yield sse_event(StreamEventType.METADATA, cached_metadata)
                            
                            # Done
                            yield sse_event(StreamEventType.DONE, {
                                "total_time_ms": cache_time_ms,
                                "trace_id": trace_id,
                                "from_cache": True,
                            })
                            done_emitted = True
                            return
            except Exception as e:
                logger.debug(f"[{trace_id}] Dedup cache check failed: {e}")

            # ══════════════════════════════════════════════
            # ①b GUARDRAILS + PII CHECK (chat_workflow.puml)
            # ══════════════════════════════════════════════

            guard_result = self.guardrails.check_input(content)

            if not guard_result.passed:
                # Block immediately for any guardrail violation (jailbreak, toxic, PII)
                error_msg = "Nội dung không phù hợp. Vui lòng điều chỉnh câu hỏi."
                error_code = "GUARDRAIL_BLOCKED"
                
                if guard_result.violations:
                    error_msg = guard_result.violations[0].message
                    # Use specific error code for PII
                    if guard_result.violations[0].rail_name == "pii_detection":
                        error_code = "PII_DETECTED"
                
                yield sse_event(StreamEventType.ERROR, {
                    "message": error_msg,
                    "code": error_code,
                    "trace_id": trace_id,
                })
                done_emitted = True
                return

            guardrails_passed = True

            # ── Get Conversation ───────────────────────────
            conversation = self.db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            ).first()

            if not conversation:
                yield sse_event(StreamEventType.ERROR, {
                    "message": f"Không tìm thấy cuộc trò chuyện {conversation_id}",
                    "code": "NOT_FOUND",
                })
                return

            # ── Save User Message (skip if editing) ──────────────
            if not skip_user_save:
                user_msg = Message(
                    conversation_id=conversation_id,
                    role=MessageRole.user,
                    content=content,
                    trace_id=trace_id,
                )
                self.db.add(user_msg)
                self.db.commit()
                self.db.refresh(user_msg)
            else:
                user_msg = (
                    self.db.query(Message)
                    .filter(
                        Message.conversation_id == conversation_id,
                        Message.role == MessageRole.user,
                    )
                    .order_by(Message.created_at.desc())
                    .first()
                )

            # ══════════════════════════════════════════════
            # ② LOAD MEMORY — TRƯỚC Intent Detection (chat_workflow.puml)
            # FIX 1: Memory MUST load BEFORE Intent for context
            # ══════════════════════════════════════════════

            yield sse_event(StreamEventType.PROGRESS, {
                "step": "memory_load", "progress": 10, "message": "🧠 Đang tải ngữ cảnh...",
                "trace_id": trace_id,
            })

            # Try memory cache first (NEW OPTIMIZATION)
            memory_ctx = None
            try:
                from app.services.redis_manager import get_redis
                from app.services.memory_cache import MemoryCacheManager
                
                redis_client = await get_redis()
                if redis_client:
                    memory_cache = MemoryCacheManager(redis_client, ttl=settings.MEMORY_CACHE_TTL)
                    
                    # Try to get cached history
                    cached_history = await memory_cache.get_history(conversation_id)
                    if cached_history:
                        logger.info(f"[{trace_id}] ⚡ Memory cache HIT — {len(cached_history)} messages")
                        from app.services.memory_manager import MemoryContext
                        memory_ctx = MemoryContext(
                            history=cached_history,
                            rolling_summary_latest=None,
                            rolling_summary_old=[],
                            key_facts=[],
                        )
            except Exception as e:
                logger.debug(f"[{trace_id}] Memory cache check failed: {e}")
            
            # If no cache hit, load from DB with timeout
            if not memory_ctx:
                try:
                    memory_ctx = await self.memory_manager.get_context(
                        conversation_id=conversation_id,
                        current_query=content,  # NEW: Pass query for vector search
                        exclude_message_id=user_msg.id if user_msg else None,
                    )
                    
                    # Cache the result for next time
                    if redis_client and memory_cache:
                        try:
                            await memory_cache.set_history(conversation_id, memory_ctx.history)
                        except Exception:
                            pass
                            
                except Exception as e:
                    logger.warning(f"[{trace_id}] Memory recall error: {e}")
                    from app.services.memory_manager import MemoryContext
                    memory_ctx = MemoryContext(
                        history=[], 
                        rolling_summary_latest=None, 
                        rolling_summary_old=[],
                        key_facts=[]
                    )
            
            logger.info(f"[{trace_id}] ② Memory loaded: {len(memory_ctx.history)} msgs, "
                        f"rolling_summary={'yes' if memory_ctx.rolling_summary_latest else 'no'}, "
                        f"old_summaries={len(memory_ctx.rolling_summary_old)}, "
                        f"facts={memory_ctx.key_facts}")

            # ══════════════════════════════════════════════
            # ③ INTENT DETECTION (SAU Memory, có history context)
            # FIX 1: Now has memory_ctx.history for better classification
            # ══════════════════════════════════════════════

            yield sse_event(StreamEventType.PROGRESS, {
                "step": "intent_detection",
                "progress": 15,
                "message": "🤔 Phân tích câu hỏi...",
                "trace_id": trace_id,
            })

            try:
                intent_result = await asyncio.wait_for(
                    detect_intent_and_respond_llm(
                        content, self.llm_service, history=memory_ctx.history
                    ),
                    timeout=settings.INTENT_DETECT_TIMEOUT
                )
            except asyncio.TimeoutError:
                logger.warning(f"[{trace_id}] Intent detection timeout, defaulting to KNOWLEDGE_QA")
                intent_result = {
                    "intent": "KNOWLEDGE_QA",
                    "response": None,
                    "confidence": 0.5
                }
            
            intent = intent_result["intent"]
            direct_response = intent_result.get("response")
            
            logger.info(f"[{trace_id}] ③ Intent: {intent} (confidence={intent_result['confidence']:.2f})")

            # ── FAST PATH: Non-RAG intents ─────────────────
            if intent in ("GREETING", "CHITCHAT") and direct_response:
                yield sse_event(StreamEventType.PROGRESS, {
                    "step": "generating", "progress": 90, "message": "⚡ Trả lời trực tiếp..."
                })
                
                for i, char in enumerate(direct_response):
                    yield sse_event(StreamEventType.TOKEN, {
                        "content": char,
                        "index": i
                    })
                total_ms = int((time.time() - start_time) * 1000)
                assistant_msg = self._save_assistant_message(
                    conversation_id, direct_response, trace_id,
                    f"llm_intent_{intent.lower()}", len(direct_response) // 3,
                    total_time_ms=total_ms
                )
                
                # NEW: Emit "saved" event after DB commit
                yield sse_event(StreamEventType.SAVED, {
                    "message_id": assistant_msg.id,
                    "timestamp": assistant_msg.created_at.isoformat(),
                    "trace_id": trace_id,
                })
                
                # NEW: Create rolling summary if needed
                try:
                    if self.rolling_summary_service.should_create_new_version(conversation_id):
                        logger.info(f"[{trace_id}] Creating new rolling summary version...")
                        await self.rolling_summary_service.create_new_version(conversation_id)
                except Exception as e:
                    logger.warning(f"[{trace_id}] Failed to create rolling summary: {e}")
                conversation_title = (
                    await self._refresh_conversation_title(conversation_id, content, trace_id)
                    or conversation.title
                )
                yield sse_event(StreamEventType.METADATA, {
                    "model": f"llm_intent_{intent.lower()}",
                    "provider": "gemini",
                    "citations": [],
                    "trace_id": trace_id,
                    "total_time_ms": total_ms,  # FIX: Add total_time_ms to metadata
                    "conversation_title": conversation_title,
                    "quality_scores": {
                        "guardrails_passed": guardrails_passed,
                        "pii_redacted": pii_redacted,
                        "intent": intent,
                        "confidence": intent_result["confidence"],
                        "retrieval_fallback": False,  # FIX: No RAG used, no fallback
                        "raw_llm_response": intent_result.get("raw_llm_response", ""),  # 🔍 DEBUG
                    }
                })
                
                yield sse_event(StreamEventType.DONE, {
                    "total_time_ms": total_ms,
                    "trace_id": trace_id
                })
                done_emitted = True
                return

            # ── CONVERSATIONAL: Memory-based response (no RAG) ──
            if intent == "CONVERSATIONAL":
                yield sse_event(StreamEventType.PROGRESS, {
                    "step": "generating", "progress": 80, "message": "💬 Xem lại hội thoại..."
                })
                
                # Build context from memory
                memory_parts = []
                # Include old rolling summaries for full conversation context
                if memory_ctx.rolling_summary_old:
                    for i, old_sum in enumerate(memory_ctx.rolling_summary_old):
                        memory_parts.append(f"Tóm tắt phần {i+1}: {old_sum}")
                if memory_ctx.rolling_summary_latest:
                    memory_parts.append(f"Tóm tắt gần nhất: {memory_ctx.rolling_summary_latest}")
                if memory_ctx.history:
                    memory_parts.append("Lịch sử gần đây:")
                    for h in memory_ctx.history[-10:]:
                        role_label = "Người dùng" if h["role"] == "user" else "Bot"
                        memory_parts.append(f"  {role_label}: {h['content'][:500]}")
                
                memory_text = "\n".join(memory_parts) if memory_parts else "(Chưa có lịch sử hội thoại)"
                
                conv_prompt = (
                    "Bạn là trợ lý AI học tập. Người dùng đang hỏi về cuộc trò chuyện hiện tại.\n"
                    "Dựa trên lịch sử hội thoại bên dưới, hãy trả lời câu hỏi của người dùng.\n"
                    "Trả lời bằng tiếng Việt, chi tiết và đầy đủ.\n\n"
                    f"LỊCH SỬ HỘI THOẠI:\n{memory_text}"
                )
                
                conv_result = await self.llm_service.chat_completion(
                    messages=[
                        {"role": "system", "content": conv_prompt},
                        {"role": "user", "content": content}
                    ],
                    temperature=0.3,
                    max_tokens=2500,
                )
                
                conv_response = conv_result["content"].strip()
                
                # Stream word-by-word
                import re as _re
                tokens = _re.findall(r'\S+\s*|\n', conv_response)
                for i, token in enumerate(tokens):
                    yield sse_event(StreamEventType.TOKEN, {"content": token, "index": i})
                
                total_ms = int((time.time() - start_time) * 1000)
                assistant_msg = self._save_assistant_message(
                    conversation_id, conv_response, trace_id,
                    "llm_conversational", len(conv_response) // 3,
                    total_time_ms=total_ms
                )
                
                yield sse_event(StreamEventType.SAVED, {
                    "message_id": assistant_msg.id,
                    "timestamp": assistant_msg.created_at.isoformat(),
                    "trace_id": trace_id,
                })
                
                conversation_title = (
                    await self._refresh_conversation_title(conversation_id, content, trace_id)
                    or conversation.title
                )
                yield sse_event(StreamEventType.METADATA, {
                    "model": "llm_conversational",
                    "provider": "gemini",
                    "citations": [],
                    "trace_id": trace_id,
                    "total_time_ms": total_ms,
                    "conversation_title": conversation_title,
                    "quality_scores": {
                        "guardrails_passed": guardrails_passed,
                        "pii_redacted": pii_redacted,
                        "intent": "CONVERSATIONAL",
                        "confidence": intent_result["confidence"],
                        "retrieval_fallback": False,
                    }
                })
                
                yield sse_event(StreamEventType.DONE, {
                    "total_time_ms": total_ms,
                    "trace_id": trace_id
                })
                done_emitted = True
                return

            # ── AGENT FLOWS: SCHEDULE_QUERY / QUIZ_REQUEST ──
            if intent in ("SCHEDULE_QUERY", "QUIZ_REQUEST"):
                from app.services.agent_orchestrator import AgentOrchestrator
                
                yield sse_event(StreamEventType.PROGRESS, {
                    "step": "agent_processing",
                    "progress": 20,
                    "message": "🤖 Đang xử lý yêu cầu...",
                    "trace_id": trace_id,
                })
                
                try:
                    # Process via agent orchestrator
                    agent = AgentOrchestrator(self.db)
                    agent_result = await asyncio.wait_for(
                        agent.process(
                            intent=intent,
                            query=content,
                            course_id=conversation.course_id,
                            user_id=user_id,
                        ),
                        timeout=90.0  # 90s timeout for agent operations (quiz gen needs more)
                    )
                    
                    agent_response = agent_result["response"]
                    agent_metadata = agent_result.get("metadata", {})
                    tool_used = agent_result.get("tool_used", "unknown")
                    tool_selection = agent_metadata.get("tool_selection", {})
                    
                    # Stream response word-by-word for natural streaming UX
                    import re
                    tokens = re.findall(r'\S+\s*|\n', agent_response)
                    for i, token in enumerate(tokens):
                        yield sse_event(StreamEventType.TOKEN, {"content": token, "index": i})
                    
                    # Save message
                    total_ms = int((time.time() - start_time) * 1000)
                    assistant_msg = self._save_assistant_message(
                        conversation_id, agent_response, trace_id, 
                        f"agent_{tool_used}", len(agent_response) // 3,
                        total_time_ms=total_ms,
                        agent_metadata=agent_metadata
                    )
                    
                    # NEW: Emit "saved" event after DB commit
                    yield sse_event(StreamEventType.SAVED, {
                        "message_id": assistant_msg.id,
                        "timestamp": assistant_msg.created_at.isoformat(),
                        "trace_id": trace_id,
                    })
                    
                    # NEW: Create rolling summary if needed
                    try:
                        if self.rolling_summary_service.should_create_new_version(conversation_id):
                            logger.info(f"[{trace_id}] Creating new rolling summary version...")
                            await self.rolling_summary_service.create_new_version(conversation_id)
                    except Exception as e:
                        logger.warning(f"[{trace_id}] Failed to create rolling summary: {e}")
                    # Send metadata
                    conversation_title = (
                        await self._refresh_conversation_title(conversation_id, content, trace_id)
                        or conversation.title
                    )
                    yield sse_event(StreamEventType.METADATA, {
                        "model": f"agent_{tool_used}",
                        "provider": "agent",
                        "citations": [],
                        "trace_id": trace_id,
                        "total_time_ms": total_ms,  # FIX: Add total_time_ms to metadata
                        "conversation_title": conversation_title,
                        "quality_scores": {
                            "intent": intent,
                            "agent_flow": True,
                            "tool_used": tool_used,
                            "tool_selection_mode": tool_selection.get("mode"),
                            "retrieval_fallback": False,  # FIX: Agent flows don't use RAG
                        },
                        "agent_metadata": agent_metadata,
                    })
                    
                    yield sse_event(StreamEventType.DONE, {
                        "total_time_ms": total_ms,
                        "trace_id": trace_id
                    })
                    done_emitted = True
                    return
                    
                except asyncio.TimeoutError:
                    logger.error(f"[{trace_id}] Agent timeout after 90s")
                    error_msg = "⚠️ Xử lý yêu cầu quá lâu. Vui lòng thử lại."
                    yield sse_event(StreamEventType.ERROR, {
                        "message": error_msg,
                        "code": "AGENT_TIMEOUT",
                        "trace_id": trace_id,
                    })
                    done_emitted = True
                    return
                except Exception as e:
                    logger.error(f"[{trace_id}] Agent error: {e}", exc_info=True)
                    error_msg = f"⚠️ Lỗi khi xử lý: {str(e)[:100]}"
                    yield sse_event(StreamEventType.ERROR, {
                        "message": error_msg,
                        "code": "AGENT_ERROR",
                        "trace_id": trace_id,
                    })
                    done_emitted = True
                    return

            # ══════════════════════════════════════════════
            # KNOWLEDGE_QA — Full RAG Pipeline
            # ══════════════════════════════════════════════

            # ── Get effective configs ──────────────────
            eff_llm = await asyncio.to_thread(get_effective_llm_config, self.db)
            eff_rag = await asyncio.to_thread(get_effective_rag_config, self.db)

            # ══════════════════════════════════════════════
            # ④a RAG RETRIEVE — Parallel Hybrid Search (Bước ④a)
            # ══════════════════════════════════════════════
            
            # ── Query Contextualization (short/ambiguous queries) ──
            search_query = content
            if len(content.split()) <= 5 and memory_ctx.history:
                try:
                    # Build context from last 2 exchanges
                    recent = memory_ctx.history[-4:]
                    ctx_parts = []
                    for h in recent:
                        role = "User" if h["role"] == "user" else "Bot"
                        ctx_parts.append(f"{role}: {h['content'][:200]}")
                    ctx_text = "\n".join(ctx_parts)
                    
                    rewrite_result = await asyncio.wait_for(
                        self.llm_service.chat_completion(
                            messages=[
                                {"role": "system", "content": (
                                    "Bạn là bộ rewrite query. Dựa vào lịch sử hội thoại, "
                                    "viết lại câu hỏi ngắn gọn thành câu hỏi tìm kiếm đầy đủ, tự chứa ngữ cảnh.\n"
                                    "CHỈ trả lại câu hỏi đã rewrite, không giải thích.\n"
                                    f"Lịch sử:\n{ctx_text}"
                                )},
                                {"role": "user", "content": content}
                            ],
                            model=settings.GEMINI_INTENT_MODEL,
                            temperature=0.0,
                            max_tokens=100,
                        ),
                        timeout=5.0
                    )
                    search_query = rewrite_result["content"].strip().strip('"\'')
                    if search_query and len(search_query) > len(content):
                        logger.info(f"[{trace_id}] Query rewrite: '{content}' → '{search_query}'")
                    else:
                        search_query = content
                except Exception as e:
                    logger.debug(f"[{trace_id}] Query rewrite failed, using original: {e}")
                    search_query = content
            
            yield sse_event(StreamEventType.PROGRESS, {
                "step": "retrieving", "progress": 30, "message": "🔍 Đang tìm kiếm tài liệu...",
                "trace_id": trace_id,
            })

            logger.info(f"[{trace_id}] Starting RAG retrieve for course_id={conversation.course_id}, query='{search_query[:80]}'")
            
            try:
                # RAG retrieve with parallel hybrid search (Vector + BM25)
                rag_result = await asyncio.wait_for(
                    self.rag_service.retrieve(
                        query=search_query,
                        course_id=conversation.course_id,
                        top_k=eff_rag["top_k"],
                    ),
                    timeout=settings.RAG_RETRIEVE_TIMEOUT
                )
                logger.info(f"[{trace_id}] RAG retrieve completed: {len(rag_result.retrieved_chunks)} chunks")
                
                # Check if fallback ladder was triggered
                if rag_result.retrieval_fallback:
                    logger.warning(f"[{trace_id}] ⚠️ Retrieval fallback triggered — low confidence or no results")
                    
            except asyncio.TimeoutError:
                logger.error(f"[{trace_id}] RAG retrieve timeout after {settings.RAG_RETRIEVE_TIMEOUT}s")
                yield sse_event(StreamEventType.ERROR, {
                    "message": "Tìm kiếm tài liệu quá lâu. Vui lòng thử lại.",
                    "code": "RAG_TIMEOUT",
                    "trace_id": trace_id,
                })
                done_emitted = True
                return
            except Exception as e:
                logger.error(f"[{trace_id}] RAG retrieve error: {e}", exc_info=True)
                yield sse_event(StreamEventType.ERROR, {
                    "message": f"Lỗi khi tìm kiếm tài liệu: {str(e)[:200]}",
                    "code": "RAG_ERROR",
                    "trace_id": trace_id,
                })
                done_emitted = True
                return

            # ══════════════════════════════════════════════
            # ④b RERANK — Cross-encoder (Bước ④b)
            # ══════════════════════════════════════════════
            # Reranking already done in rag_service.retrieve()
            # Results are in rag_result.retrieved_chunks (top 5 after rerank)
            
            # ══════════════════════════════════════════════
            # ④c BUILD CONTEXT & PROMPT (Bước ④c — PromptService)
            # ══════════════════════════════════════════════
            yield sse_event(StreamEventType.PROGRESS, {
                "step": "generating", "progress": 50, "message": "⚡ Đang tạo câu trả lời...",
                "trace_id": trace_id,
            })

            # Lấy tên course (nếu có)
            course_name = ""
            if conversation.course and hasattr(conversation.course, 'name'):
                course_name = conversation.course.name

            # Build chunks dạng dict cho PromptService
            chunks_for_prompt = []
            for chunk in rag_result.retrieved_chunks:
                chunks_for_prompt.append({
                    "document_title": chunk.document_title,
                    "page_number": chunk.page_number,
                    "content": chunk.content,
                })

            # Prepare memory context variables for prompt
            # Use rolling summaries (new) with fallback to old summary field for compatibility
            rolling_summary_latest = memory_ctx.rolling_summary_latest
            rolling_summary_old = memory_ctx.rolling_summary_old
            key_facts = memory_ctx.key_facts
            course = conversation.course

            # Build prompt context with all components
            prompt_ctx = PromptContext(
                question=content,
                chunks=chunks_for_prompt,
                history=memory_ctx.history,
                course_name=course.name if course else "",
                # NEW: Rolling summaries
                rolling_summary_latest=rolling_summary_latest,
                rolling_summary_old=rolling_summary_old,
                key_facts=key_facts,
                retrieval_fallback=rag_result.retrieval_fallback,
                custom_system_prompt=eff_llm["system_prompt"] or None,
                system_prompt_override=bool(eff_llm["system_prompt_override"]),
            )

            system_prompt, user_prompt = self.prompt_service.build_rag_prompt(prompt_ctx)
            
            logger.info(f"[{trace_id}] ④c Prompt built: {len(chunks_for_prompt)} chunks, "
                       f"history={len(memory_ctx.history)} msgs, "
                       f"summary={'yes' if rolling_summary_latest else 'no'}, "
                       f"facts={len(key_facts) if key_facts else 0}")

            # ══════════════════════════════════════════════
            # ④d STREAM LLM RESPONSE (Bước ④d)
            # ══════════════════════════════════════════════
            # Build LLM Messages
            llm_messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history
            for h in memory_ctx.history:
                llm_messages.append({"role": h["role"], "content": h["content"]})

            # Add user prompt (with context + question)
            llm_messages.append({"role": "user", "content": user_prompt})

            # Stream LLM response
            use_model = model or self.llm_service.model
            answer_accumulator = ""
            token_index = 0

            logger.info(f"[{trace_id}] ④d Starting LLM stream: model={use_model}, "
                       f"temp={eff_llm['temperature']}, max_tokens={eff_llm['max_tokens']}")

            try:
                async for token in self.llm_service.stream_completion(
                    messages=llm_messages,
                    model=use_model,
                    temperature=eff_llm["temperature"],
                    max_tokens=eff_llm["max_tokens"],
                ):
                    answer_accumulator += token
                    yield sse_event(StreamEventType.TOKEN, {
                        "content": token,
                        "index": token_index,
                    })
                    token_index += 1
                    
            except Exception as stream_error:
                logger.error(f"[{trace_id}] LLM streaming error: {stream_error}")
                # Fallback: try non-streaming
                try:
                    result = await self.llm_service.chat_completion(
                        messages=llm_messages,
                        model=use_model,
                        temperature=eff_llm["temperature"],
                        max_tokens=eff_llm["max_tokens"],
                    )
                    answer_accumulator = result["content"]
                    yield sse_event(StreamEventType.TOKEN, {
                        "content": answer_accumulator,
                        "index": 0,
                    })
                    token_index = 1
                except Exception as fallback_error:
                    logger.error(f"[{trace_id}] Fallback LLM error: {fallback_error}")
                    raise

            logger.info(f"[{trace_id}] ④d LLM stream complete: {token_index} tokens, "
                       f"{len(answer_accumulator)} chars")

            # ══════════════════════════════════════════════
            # ⑤ CITATION ATTACHMENT (Bước ⑤)
            # ══════════════════════════════════════════════
            yield sse_event(StreamEventType.CITATIONS, {
                "citations": rag_result.citations,
                "trace_id": trace_id,
            })
            
            logger.info(f"[{trace_id}] ⑤ Citations sent: {len(rag_result.citations)} sources")

            # ══════════════════════════════════════════════
            # ⑥ SAVE HISTORY (Bước ⑥)
            # ══════════════════════════════════════════════
            tokens_used = len(answer_accumulator) // 3  # Rough estimate
            total_ms = int((time.time() - start_time) * 1000)
            assistant_msg = self._save_assistant_message(
                conversation_id, answer_accumulator, trace_id, use_model, tokens_used,
                total_time_ms=total_ms,
                retrieval_fallback=1 if rag_result.retrieval_fallback else 0
            )

            # NEW: Emit "saved" event after DB commit
            yield sse_event(StreamEventType.SAVED, {
                "message_id": assistant_msg.id,
                "timestamp": assistant_msg.created_at.isoformat(),
                "trace_id": trace_id,
            })

            # Save citations to DB
            for cit in rag_result.citations:
                db_citation = Citation(
                    message_id=assistant_msg.id,
                    chunk_id=cit.get("chunk_id"),
                    relevance_score=cit.get("relevance_score"),
                    quote=cit.get("quote"),
                )
                self.db.add(db_citation)
            self.db.commit()
            
            logger.info(f"[{trace_id}] ⑥ History saved: msg_id={assistant_msg.id}, "
                       f"citations={len(rag_result.citations)}")

            # Invalidate memory cache after saving new message
            if redis_client and memory_cache:
                try:
                    await memory_cache.invalidate(conversation_id)
                    logger.debug(f"[{trace_id}] Memory cache invalidated")
                except Exception as e:
                    logger.debug(f"[{trace_id}] Cache invalidation failed: {e}")

            # NEW: Create rolling summary if needed
            try:
                if self.rolling_summary_service.should_create_new_version(conversation_id):
                    logger.info(f"[{trace_id}] Creating new rolling summary version...")
                    await self.rolling_summary_service.create_new_version(conversation_id)
            except Exception as e:
                logger.warning(f"[{trace_id}] Failed to create rolling summary: {e}")

            # Auto-generate title after first Q&A exchange
            msg_count = self.db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).count()
            
            # Generate title for new conversations (first few exchanges)
            if msg_count <= 4 and conversation.title in ("Cuộc hội thoại mới", "Cuộc trò chuyện mới"):
                try:
                    logger.info(f"[{trace_id}] Auto-generating conversation title...")
                    title = await self.llm_service.generate_title(content)
                    conversation.title = title
                    self.db.commit()
                    logger.info(f"[{trace_id}] Title generated: '{title}'")
                except Exception as e:
                    logger.warning(f"[{trace_id}] Error auto-titling: {e}")
            
            # Re-titling by message milestones is handled centrally in _refresh_conversation_title().

            # ── ⑦ METADATA SSE (Bước ⑦) ────────────────
            
            metadata = {
                "trace_id": trace_id,
                "model": use_model,
                "provider": self.llm_service.provider,
                "tokens_used": tokens_used,
                "total_time_ms": total_ms,
                "chunks_retrieved": len(rag_result.retrieved_chunks),
                "conversation_title": (
                    await self._refresh_conversation_title(conversation_id, content, trace_id)
                    or conversation.title
                ),  # For FE sidebar update
                "quality_scores": {
                    "guardrails_passed": guardrails_passed,
                    "pii_redacted": pii_redacted,
                    "retrieval_fallback": rag_result.retrieval_fallback,
                    "intent": intent,  # 🔍 DEBUG: Include detected intent
                    "raw_llm_response": intent_result.get("raw_llm_response", ""),  # 🔍 DEBUG
                },
            }
            
            yield sse_event(StreamEventType.METADATA, metadata)
            
            # ══════════════════════════════════════════════
            # ⓪ STORE IN DEDUP CACHE (NEW OPTIMIZATION)
            # ══════════════════════════════════════════════
            if dedup_cache and conversation:
                try:
                    await dedup_cache.set(
                        user_id=user_id,
                        course_id=conversation.course_id,
                        query=content,
                        answer=answer_accumulator,
                        metadata=metadata,
                    )
                    logger.debug(f"[{trace_id}] Stored in dedup cache")
                except Exception as e:
                    logger.debug(f"[{trace_id}] Failed to store in dedup cache: {e}")

            # ── DONE ──────────────────────────────────────
            logger.info(f"[{trace_id}] Chat complete — {total_ms}ms, {token_index} tokens")
            yield sse_event(StreamEventType.DONE, {
                "total_time_ms": total_ms,
                "trace_id": trace_id,
            })
            done_emitted = True

            # ── Auto-title conversation (fire-and-forget) ────
            try:
                await self._refresh_conversation_title(conversation_id, content, trace_id)
            except Exception as e:
                logger.debug(f"[{trace_id}] Auto-title error: {e}")

        except Exception as e:
            logger.error(f"[{trace_id}] Chat error: {e}", exc_info=True)
            error_msg = str(e)
            # Simplify common errors for user
            if "404" in error_msg and "gemini" in error_msg.lower():
                user_msg = "Model AI không hợp lệ. Vui lòng kiểm tra cấu hình GEMINI_MODEL."
            elif "429" in error_msg or "rate limit" in error_msg.lower():
                user_msg = "API bị giới hạn tốc độ. Vui lòng thử lại sau ít phút."
            elif "api key" in error_msg.lower() or "401" in error_msg:
                user_msg = "API key không hợp lệ. Vui lòng kiểm tra cấu hình."
            else:
                user_msg = f"Đã xảy ra lỗi khi xử lý: {error_msg[:200]}"
            yield sse_event(StreamEventType.ERROR, {
                "message": user_msg,
                "code": "STREAM_ERROR",
                "trace_id": trace_id,
            })
            done_emitted = True  # Error event counts as terminal

        finally:
            # ── SAFETY NET: Save partial response if connection was cut mid-stream ──
            if not done_emitted:
                logger.warning(f"[{trace_id}] Connection interrupted — attempting to save partial response")
                total_ms = int((time.time() - start_time) * 1000)
                
                # Save partial response if we accumulated any content
                partial = answer_accumulator
                
                if partial and partial.strip() and not getattr(self, '_message_saved_' + trace_id, False):
                    try:
                        self._save_assistant_message(
                            conversation_id, partial, trace_id,
                            model or 'unknown', len(partial) // 3,
                            total_time_ms=total_ms,
                        )
                        logger.info(f"[{trace_id}] ✅ Partial response saved ({len(partial)} chars)")
                    except Exception as save_err:
                        logger.error(f"[{trace_id}] Failed to save partial response: {save_err}")
                
                # Try to emit done (may fail if connection already closed)
                try:
                    yield sse_event(StreamEventType.DONE, {
                        "total_time_ms": total_ms,
                        "trace_id": trace_id,
                        "safety_net": True,
                    })
                except Exception:
                    pass  # Connection already closed, can't send

    def _save_assistant_message(
        self,
        conversation_id: int,
        content: str,
        trace_id: str,
        model_used: str,
        tokens_used: int,
        total_time_ms: int = None,
        retrieval_fallback: int = 0,
        agent_metadata: dict = None
    ) -> Message:
        """Save assistant message to DB and invalidate memory cache."""
        msg = Message(
            conversation_id=conversation_id,
            role=MessageRole.assistant,
            content=content,
            trace_id=trace_id,
            model_used=model_used,
            tokens_used=tokens_used,
            total_time_ms=total_time_ms,
            retrieval_fallback=retrieval_fallback,
            agent_metadata=agent_metadata
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        
        logger.info(f"[{trace_id}] ✅ Assistant message saved: msg_id={msg.id}")
        
        # Invalidate memory cache (async, fire-and-forget)
        try:
            import asyncio
            from app.services.redis_manager import get_redis
            from app.services.memory_cache import MemoryCacheManager
            
            async def _invalidate():
                try:
                    redis_client = await get_redis()
                    if redis_client:
                        cache = MemoryCacheManager(redis_client)
                        await cache.invalidate(conversation_id)
                except Exception as e:
                    logger.debug(f"Cache invalidation error: {e}")
            
            # Use asyncio.create_task if we're in an async context
            try:
                asyncio.create_task(_invalidate())
            except RuntimeError:
                # Not in async context, skip cache invalidation
                pass
        except Exception as e:
            logger.debug(f"Memory cache invalidation setup failed: {e}")
        
        return msg

    async def _auto_title_conversation(self, conversation_id: int, user_message: str, trace_id: str) -> Optional[str]:
        """Auto-generate or repair a weak conversation title."""
        try:
            conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conv:
                return None

            if _is_auto_title_candidate(conv.title):
                conv.title = "New conversation"
            
            # Only auto-title if still using default name
            default_titles = {"Cuộc hội thoại mới", "Cuộc trò chuyện mới", "New conversation"}
            if conv.title not in default_titles:
                return
            
            # Count messages - only auto-title after first exchange (2 messages)
            msg_count = self.db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).count()
            if msg_count < 2:
                return

            if msg_count >= 4:
                recent_msgs = self.db.query(Message).filter(
                    Message.conversation_id == conversation_id
                ).order_by(Message.created_at.desc()).limit(8).all()
                history_lines = []
                for msg in reversed(recent_msgs):
                    role_label = "User" if msg.role == MessageRole.user else "Bot"
                    history_lines.append(f"{role_label}: {msg.content[:160]}")
                if history_lines:
                    user_message = "\n".join(history_lines)
            
            # Try LLM-generated title with fast timeout
            try:
                import asyncio
                llm_service = LLMService()
                title = await asyncio.wait_for(
                    llm_service.generate_title(user_message),
                    timeout=5.0
                )
                if not title or title in default_titles:
                    raise ValueError("Empty/default title")
            except Exception:
                # Fallback: use first user message as title
                title = user_message[:50].strip()
                if len(user_message) > 50:
                    title += "..."
            
            title = _clean_generated_title(title) or _clean_generated_title(user_message[:50]) or "Cuộc trò chuyện mới"
            conv.title = title
            self.db.commit()
            logger.info(f"[{trace_id}] 📝 Auto-titled conversation {conversation_id}: '{title}'")
            return title
        except Exception as e:
            logger.debug(f"Auto-title failed: {e}")
            return None

    async def _refresh_conversation_title(self, conversation_id: int, user_message: str, trace_id: str) -> Optional[str]:
        """Refresh title for weak/default chats and every 20 saved messages."""
        try:
            conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conv:
                return None

            messages = (
                self.db.query(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
                .all()
            )
            msg_count = len(messages)
            if msg_count < 2:
                return conv.title

            should_repair_weak_title = _is_auto_title_candidate(conv.title)
            should_refresh_from_history = msg_count >= 20 and msg_count % 20 == 0
            if not should_repair_weak_title and not should_refresh_from_history:
                return conv.title

            llm_service = LLMService()
            candidate_title: Optional[str] = None

            try:
                import asyncio

                if should_refresh_from_history:
                    recent_msgs = messages[-10:]
                    history = [
                        {"role": msg.role.value, "content": msg.content[:200]}
                        for msg in recent_msgs
                    ]
                    candidate_title = await asyncio.wait_for(
                        llm_service.generate_title_from_history(history),
                        timeout=6.0,
                    )
                else:
                    candidate_title = await asyncio.wait_for(
                        llm_service.generate_title(user_message),
                        timeout=5.0,
                    )
            except Exception:
                candidate_title = None

            if not candidate_title and should_refresh_from_history:
                recent_user_messages = [
                    msg.content.strip()
                    for msg in messages[-10:]
                    if msg.role == MessageRole.user and msg.content.strip()
                ]
                if recent_user_messages:
                    candidate_title = recent_user_messages[-1][:50]

            if not candidate_title:
                first_user_message = next(
                    (msg.content.strip() for msg in messages if msg.role == MessageRole.user and msg.content.strip()),
                    user_message.strip(),
                )
                candidate_title = first_user_message[:50]
                if len(first_user_message) > 50:
                    candidate_title += "..."

            cleaned_title = _clean_generated_title(candidate_title)
            if not cleaned_title or cleaned_title == conv.title:
                return conv.title

            conv.title = cleaned_title
            self.db.commit()
            logger.info(f"[{trace_id}] Refreshed conversation {conversation_id}: '{cleaned_title}'")
            return cleaned_title
        except Exception as e:
            logger.debug(f"Refresh title failed: {e}")
            return None

    # ─── Conversation CRUD ──

    def create_conversation(self, user_id: int, course_id: int, title: Optional[str] = None) -> Conversation:
        conv = Conversation(
            user_id=user_id,
            course_id=course_id,
            title=title or "Cuộc hội thoại mới",
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        logger.info(f"Created conversation {conv.id} for user {user_id}")
        return conv

    def list_conversations(self, user_id: int, limit: int = 50, offset: int = 0) -> List[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_conversation(self, conversation_id: int, user_id: int) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        ).first()

    def get_messages(self, conversation_id: int, limit: int = 100) -> List[Message]:
        return (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
            .all()
        )

    def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        conv = self.get_conversation(conversation_id, user_id)
        if not conv:
            return False
        self.db.delete(conv)
        self.db.commit()
        logger.info(f"Deleted conversation {conversation_id}")
        return True

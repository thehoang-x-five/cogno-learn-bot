"""
Prompt Service — Chuẩn hóa prompt cho RAG pipeline.

Tính năng:
- System prompt chuẩn theo vai trò (trợ giảng môn học)
- Context budget management (giới hạn token)
- Tích hợp memory summary + facts vào prompt
- Build user prompt với document context + history
"""
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# CONTEXT BUDGET
# ═══════════════════════════════════════════════════════

MAX_CONTEXT_TOKENS = 3000  # ~9000 ký tự tiếng Việt
MAX_HISTORY_MESSAGES = 10
MAX_CHUNK_LENGTH = 1500  # Ký tự tối đa mỗi chunk


def estimate_tokens(text: str) -> int:
    """Ước tính tokens (~3 ký tự/token cho tiếng Việt)."""
    return len(text) // 3


@dataclass
class PromptContext:
    """Dữ liệu đầu vào để build prompt."""
    question: str
    chunks: List[Dict] = field(default_factory=list)  # RetrievedChunk dạng dict
    history: List[Dict[str, str]] = field(default_factory=list)  # [{role, content}]
    course_name: str = ""
    # NEW: Rolling Summary Support
    rolling_summary_latest: Optional[str] = None  # Latest rolling summary (full context)
    rolling_summary_old: Optional[List[str]] = None  # Old relevant summaries
    # Legacy support (deprecated)
    memory_summary: Optional[str] = None  # DEPRECATED: use rolling_summary_latest
    key_facts: Optional[List[str]] = None  # Từ khóa/facts quan trọng
    retrieval_fallback: bool = False  # Bật nếu confidence quá thấp
    custom_system_prompt: Optional[str] = None  # Từ DB / admin settings
    system_prompt_override: bool = False  # True: chỉ dùng custom, bỏ template mặc định
    
    def __post_init__(self):
        if self.rolling_summary_old is None:
            self.rolling_summary_old = []


# ═══════════════════════════════════════════════════════
# SYSTEM PROMPTS (Chuẩn hóa theo RAG-Anything pattern)
# ═══════════════════════════════════════════════════════

SYSTEM_PROMPT_TEMPLATE = """Bạn là trợ lý AI chuyên trả lời câu hỏi cho sinh viên môn **{course_name}**.

**Vai trò**: Trợ giảng thông minh
**Mục tiêu**: Trả lời chính xác dựa trên tài liệu môn học được cung cấp
**Ràng buộc**:
- CHỈ sử dụng thông tin từ ngữ cảnh tài liệu bên dưới
- Nếu không đủ thông tin → nói rõ "Tôi không tìm thấy thông tin liên quan trong tài liệu môn học"
- **TRÍCH DẪN NGUỒN** (BẮT BUỘC tuân thủ):
  * Mỗi nguồn tài liệu bên dưới có header dạng: [Nguồn N: TÊN_FILE, trang X]
  * Khi trích dẫn, PHẢI dùng format: [TÊN_FILE, trang X] — copy CHÍNH XÁC tên file từ header
  * ✅ Đúng: [DeepLearning_Core_Only.md, trang 3] (lấy đúng tên từ header nguồn)
  * ❌ Sai: [Image 1, trang 3], [Nguồn 1, trang 3], [Tài liệu, trang 3] (KHÔNG được tự đặt tên)
  * Chỉ trích dẫn thông tin THỰC SỰ có trong tài liệu cung cấp
- Trả lời rõ ràng, có cấu trúc (sử dụng bullet points, heading khi cần)
- Giải thích dễ hiểu, phù hợp cho sinh viên
- Không bịa đặt thông tin (anti-hallucination)"""

SYSTEM_PROMPT_GENERAL = """Bạn là trợ lý AI hữu ích trong hệ thống học tập trực tuyến.

**Vai trò**: Trợ lý đa năng
**Mục tiêu**: Hỗ trợ người dùng hiệu quả
**Ràng buộc**:
- Trả lời ngắn gọn, súc tích
- Lịch sự, chuyên nghiệp
- Nếu câu hỏi không liên quan đến học tập, nhắc nhở người dùng sử dụng đúng mục đích"""


class PromptService:
    """
    Build prompt chuẩn cho RAG pipeline (chat_workflow.puml - Bước ④c).
    Tham khảo cấu trúc từ RAG-Anything's PromptBuilder.
    """

    def build_rag_prompt(self, ctx: PromptContext) -> tuple:
        """
        Build (system_prompt, user_prompt) cho LLM.

        Returns:
            (system_prompt, user_prompt)
        """
        # ── System Prompt ──────────────────────────────
        if ctx.course_name:
            system_prompt = SYSTEM_PROMPT_TEMPLATE.format(course_name=ctx.course_name)
        else:
            system_prompt = SYSTEM_PROMPT_GENERAL

        custom = (ctx.custom_system_prompt or "").strip()
        if custom:
            if ctx.system_prompt_override:
                system_prompt = custom
            else:
                system_prompt = (
                    system_prompt
                    + "\n\n---\n**Hướng dẫn bổ sung từ quản trị viên:**\n"
                    + custom
                )

        # ── Build Context from Chunks ──────────────────
        context_parts = []
        total_context_chars = 0

        for i, chunk in enumerate(ctx.chunks, 1):
            title = chunk.get("document_title", "Tài liệu")
            page = chunk.get("page_number")
            content = chunk.get("content", "")

            # Truncate chunk nếu quá dài
            if len(content) > MAX_CHUNK_LENGTH:
                content = content[:MAX_CHUNK_LENGTH] + "..."

            # Context budget check
            if total_context_chars + len(content) > MAX_CONTEXT_TOKENS * 3:
                logger.info(f"Context budget reached at chunk {i}")
                break

            header = f"[Nguồn {i}: {title}"
            if page:
                header += f", trang {page}"
            header += "]"
            context_parts.append(f"{header}\n{content}")
            total_context_chars += len(content)

        context = "\n\n---\n\n".join(context_parts) if context_parts else "(Không tìm thấy tài liệu liên quan)"

        # ── Build User Prompt ──────────────────────────
        prompt_parts = []

        # NEW: Rolling Summary Context (Bước ②b - Enhanced)
        # Priority: rolling_summary_latest > memory_summary (legacy)
        latest_summary = ctx.rolling_summary_latest or ctx.memory_summary
        
        if latest_summary:
            prompt_parts.append(f"**📝 Tóm tắt hội thoại (Context đầy đủ):**\n{latest_summary}\n")
        
        # Old relevant summaries (chi tiết từ các version cũ)
        if ctx.rolling_summary_old:
            old_summaries_text = "\n\n".join([
                f"• Version cũ (liên quan):\n{summary}" 
                for summary in ctx.rolling_summary_old
            ])
            prompt_parts.append(f"**📚 Chi tiết từ các phiên trước (liên quan đến câu hỏi):**\n{old_summaries_text}\n")

        # Key Facts (nếu có — Bước ②b)
        if ctx.key_facts:
            facts_str = ", ".join(ctx.key_facts[:10])
            prompt_parts.append(f"**🔑 Từ khóa/chủ đề đã thảo luận:** {facts_str}\n")

        # Conversation History
        # FIX 4: Better formatting for conversation history
        if ctx.history:
            recent = ctx.history[-MAX_HISTORY_MESSAGES:]
            # Trim history nếu tổng quá dài
            history_lines = []
            history_tokens = 0
            for m in reversed(recent):
                # FIX 4: Show full content for recent messages (not truncated)
                content = m['content'][:500] if len(m['content']) > 500 else m['content']
                line = f"- **{m['role'].upper()}**: {content}"
                line_tokens = estimate_tokens(line)
                if history_tokens + line_tokens > 1200:  # FIX 4: Increased from 800 to 1200 tokens
                    break
                history_lines.insert(0, line)
                history_tokens += line_tokens
            if history_lines:
                prompt_parts.append(f"**💬 Lịch sử hội thoại gần đây:**\n" + "\n".join(history_lines) + "\n")

        # Document Context
        if ctx.retrieval_fallback:
            prompt_parts.append("**CẢNH BÁO TỪ HỆ THỐNG:**\nKhông tìm thấy thông tin nào phù hợp với câu hỏi trong tài liệu môn học (Độ tin cậy quá thấp). Hãy nói rõ với sinh viên rằng bạn không tìm thấy dữ liệu, không được tự bịa ra kiến thức ngoài.")
        else:
            prompt_parts.append(f"**Ngữ cảnh từ tài liệu:**\n\n{context}")

        # User Question
        prompt_parts.append(f"**Câu hỏi:** {ctx.question}")
        prompt_parts.append("**Trả lời:**")

        user_prompt = "\n\n---\n\n".join(prompt_parts)

        return system_prompt, user_prompt

    def build_summary_prompt(self, messages: List[Dict[str, str]]) -> str:
        """
        Build prompt để tóm tắt hội thoại (Memory Summary - Bước ②b).
        
        FIX 4: Improved prompt for better conversation summarization.
        """
        conversation_text = []
        for msg in messages:
            role = msg.get("role", "user").upper()
            content = msg.get("content", "")[:500]  # FIX 4: Increased from 300 to 500
            conversation_text.append(f"{role}: {content}")

        full_text = "\n".join(conversation_text)

        return f"""Hãy tóm tắt cuộc hội thoại sau một cách chi tiết và có cấu trúc.

YÊU CẦU:
- Trích xuất các chủ đề chính đã thảo luận
- Ghi nhận các câu hỏi quan trọng và câu trả lời chính
- Nêu rõ ngữ cảnh và luồng hội thoại
- Tóm tắt bằng tiếng Việt, rõ ràng và dễ hiểu
- Sử dụng bullet points để dễ đọc

CUỘC HỘI THOẠI:
{full_text}

TÓM TẮT (tối đa 300 từ):"""

    def build_facts_extraction_prompt(self, messages: List[Dict[str, str]]) -> str:
        """
        Build prompt để trích xuất key terms/facts (Memory Facts - Bước ②b).
        """
        conversation_text = []
        for msg in messages[-6:]:  # Chỉ 3 cặp gần nhất
            conversation_text.append(f"{msg['role']}: {msg['content'][:200]}")

        full_text = "\n".join(conversation_text)

        return f"""Từ cuộc hội thoại sau, hãy trích xuất 3-5 từ khóa/thuật ngữ quan trọng nhất.
Chỉ trả về danh sách từ khóa cách nhau bằng dấu phẩy, KHÔNG giải thích.

HỘI THOẠI:
{full_text}

TỪ KHÓA:"""

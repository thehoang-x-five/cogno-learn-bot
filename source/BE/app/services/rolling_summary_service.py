"""
Rolling Summary Service — Incremental conversation summarization.

Concept:
- Cứ sau mỗi 2 messages (1 user + 1 assistant) → tạo summary version mới
- Summary_new = LLM(summary_old + new_messages)
- Lưu tất cả versions vào VectorDB (không update, chỉ tạo mới)
- Khi chat: search old versions (relevant) + include latest version (full context)

Benefits:
- Giữ lại chi tiết từ các version cũ (tránh mất thông tin qua nhiều lần rolling)
- Semantic search tìm version cũ có liên quan
- Latest version luôn có context đầy đủ
"""
import logging
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.chat import (
    Message, MessageRole, ConversationSummary, ConversationSummaryMetadata
)
from app.services.llm_service import LLMService
from app.services.vector_service import get_vector_service

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════

ROLLING_INTERVAL = 2  # Tạo summary mới sau mỗi 2 messages (1 user + 1 assistant)
MIN_MESSAGES_FOR_SUMMARY = 4  # Cần ít nhất 4 messages để bắt đầu summarize


@dataclass
class SummaryVersion:
    """Một version của rolling summary."""
    version: int
    summary_text: str
    message_count: int
    relevance_score: float = 0.0  # Score từ vector search (nếu có)


@dataclass
class RollingSummaryContext:
    """Context từ rolling summaries cho prompt."""
    latest_summary: Optional[SummaryVersion] = None  # Version mới nhất (full context)
    relevant_old_summaries: List[SummaryVersion] = None  # Old versions có liên quan
    
    def __post_init__(self):
        if self.relevant_old_summaries is None:
            self.relevant_old_summaries = []


class RollingSummaryService:
    """
    Service quản lý rolling summaries.
    
    Workflow:
    1. Sau mỗi 2 messages → check if should create new version
    2. Generate summary_new = LLM(summary_old + new_messages)
    3. Save to DB + embed to VectorDB
    4. When chat: search old versions + include latest
    """
    
    VECTOR_COLLECTION = "conversation_summaries"  # Separate collection for summaries
    
    def __init__(self, db: Session, llm_service: Optional[LLMService] = None):
        self.db = db
        self.llm_service = llm_service
        self.vector_service = get_vector_service()
    
    def should_create_new_version(self, conversation_id: int) -> bool:
        """
        Check if should create new summary version.
        
        Điều kiện:
        - Có ít nhất MIN_MESSAGES_FOR_SUMMARY messages
        - Số messages mới >= ROLLING_INTERVAL kể từ lần summarize cuối
        """
        # Get metadata
        metadata = self.db.query(ConversationSummaryMetadata).filter(
            ConversationSummaryMetadata.conversation_id == conversation_id
        ).first()
        
        # Count total messages
        total_messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).count()
        
        # First time: need at least MIN_MESSAGES_FOR_SUMMARY
        if not metadata:
            return total_messages >= MIN_MESSAGES_FOR_SUMMARY
        
        # Subsequent times: check if enough new messages
        new_messages = total_messages - metadata.last_summarized_message_count
        return new_messages >= ROLLING_INTERVAL
    
    async def create_new_version(self, conversation_id: int) -> Optional[ConversationSummary]:
        """
        Tạo version mới của rolling summary.
        
        Steps:
        1. Load previous summary (if exists)
        2. Load new messages since last summary
        3. LLM generate new summary
        4. Save to DB
        5. Embed to VectorDB
        
        Returns:
            ConversationSummary object or None if failed
        """
        if not self.llm_service:
            logger.warning("LLM service not available, cannot create summary")
            return None
        
        # Get metadata
        metadata = self.db.query(ConversationSummaryMetadata).filter(
            ConversationSummaryMetadata.conversation_id == conversation_id
        ).first()
        
        # Get previous summary (if exists)
        previous_summary = None
        if metadata and metadata.latest_version > 0:
            previous_summary = self.db.query(ConversationSummary).filter(
                ConversationSummary.conversation_id == conversation_id,
                ConversationSummary.version == metadata.latest_version
            ).first()
        
        # Get all messages
        all_messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).all()
        
        if len(all_messages) < MIN_MESSAGES_FOR_SUMMARY:
            logger.info(f"Not enough messages ({len(all_messages)}) to create summary")
            return None
        
        # Determine which messages to summarize
        if metadata:
            # Get new messages since last summary
            new_messages = all_messages[metadata.last_summarized_message_count:]
        else:
            # First time: summarize all messages
            new_messages = all_messages
        
        # Build prompt for LLM
        prompt = self._build_rolling_summary_prompt(
            previous_summary=previous_summary.summary_text if previous_summary else None,
            new_messages=new_messages
        )
        
        # Generate summary with LLM
        try:
            result = await self.llm_service.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500  # Longer for rolling summary
            )
            new_summary_text = result["content"].strip()
        except Exception as e:
            logger.error(f"Failed to generate rolling summary: {e}")
            return None
        
        # Create new version
        new_version = (metadata.latest_version + 1) if metadata else 1
        
        summary = ConversationSummary(
            conversation_id=conversation_id,
            version=new_version,
            summary_text=new_summary_text,
            message_count=len(all_messages),
            parent_version=metadata.latest_version if metadata else None
        )
        
        self.db.add(summary)
        
        # Update or create metadata
        if metadata:
            metadata.latest_version = new_version
            metadata.last_summarized_message_count = len(all_messages)
        else:
            metadata = ConversationSummaryMetadata(
                conversation_id=conversation_id,
                latest_version=new_version,
                last_summarized_message_count=len(all_messages)
            )
            self.db.add(metadata)
        
        self.db.commit()
        self.db.refresh(summary)
        
        logger.info(f"✅ Created rolling summary v{new_version} for conversation {conversation_id}")
        
        # Embed to VectorDB (async, non-blocking)
        try:
            await self._embed_summary_to_vector(summary)
        except Exception as e:
            logger.warning(f"Failed to embed summary to VectorDB: {e}")
        
        return summary
    
    def _build_rolling_summary_prompt(
        self,
        previous_summary: Optional[str],
        new_messages: List[Message]
    ) -> str:
        """Build prompt for rolling summary generation."""
        
        # Format new messages
        messages_text = []
        for msg in new_messages:
            role_label = "Sinh viên" if msg.role == MessageRole.user else "Trợ lý"
            messages_text.append(f"{role_label}: {msg.content}")
        
        messages_str = "\n".join(messages_text)
        
        if previous_summary:
            # Rolling: update previous summary with new messages
            prompt = f"""Bạn là trợ lý tóm tắt hội thoại. Nhiệm vụ: CẬP NHẬT tóm tắt cũ với thông tin mới.

TÓM TẮT CŨ:
{previous_summary}

TIN NHẮN MỚI:
{messages_str}

YÊU CẦU:
1. Kết hợp tóm tắt cũ với tin nhắn mới
2. Giữ lại thông tin quan trọng từ tóm tắt cũ
3. Thêm thông tin mới từ tin nhắn mới
4. Nếu có xung đột: ưu tiên thông tin mới hơn
5. Tóm tắt ngắn gọn, súc tích (tối đa 400 từ)
6. Sử dụng bullet points để dễ đọc

TÓM TẮT CẬP NHẬT:"""
        else:
            # First version: summarize from scratch
            prompt = f"""Bạn là trợ lý tóm tắt hội thoại. Nhiệm vụ: TÓM TẮT cuộc hội thoại sau.

HỘI THOẠI:
{messages_str}

YÊU CẦU:
1. Tóm tắt các chủ đề chính đã thảo luận
2. Ghi lại các câu hỏi quan trọng và câu trả lời
3. Liệt kê các khái niệm/thuật ngữ chính
4. Tóm tắt ngắn gọn, súc tích (tối đa 400 từ)
5. Sử dụng bullet points để dễ đọc

TÓM TẮT:"""
        
        return prompt
    
    async def _embed_summary_to_vector(self, summary: ConversationSummary) -> None:
        """Embed summary to VectorDB for semantic search."""
        try:
            # Generate embedding
            from app.services.rag_service import _embed_query
            import asyncio
            
            embedding = await asyncio.to_thread(_embed_query, summary.summary_text)
            
            # Store in VectorDB with metadata
            self.vector_service.add_chunks(
                ids=[f"summary_{summary.conversation_id}_v{summary.version}"],
                embeddings=[embedding],
                documents=[summary.summary_text],
                metadatas=[{
                    "type": "conversation_summary",
                    "conversation_id": summary.conversation_id,
                    "version": summary.version,
                    "message_count": summary.message_count,
                }]
            )
            
            logger.info(f"✅ Embedded summary v{summary.version} to VectorDB")
        except Exception as e:
            logger.error(f"Failed to embed summary: {e}", exc_info=True)
            raise
    
    async def get_summary_context(
        self,
        conversation_id: int,
        current_query: str,
        top_k_old: int = 2
    ) -> RollingSummaryContext:
        """
        Get rolling summary context for prompt.
        
        Returns:
        - latest_summary: Version mới nhất (full context)
        - relevant_old_summaries: Old versions có liên quan (semantic search)
        
        Args:
            conversation_id: ID cuộc hội thoại
            current_query: Câu hỏi hiện tại (để search old versions)
            top_k_old: Số old versions tối đa
        """
        # Get latest summary
        metadata = self.db.query(ConversationSummaryMetadata).filter(
            ConversationSummaryMetadata.conversation_id == conversation_id
        ).first()
        
        if not metadata or metadata.latest_version == 0:
            return RollingSummaryContext()  # No summaries yet
        
        latest = self.db.query(ConversationSummary).filter(
            ConversationSummary.conversation_id == conversation_id,
            ConversationSummary.version == metadata.latest_version
        ).first()
        
        if not latest:
            return RollingSummaryContext()
        
        latest_version = SummaryVersion(
            version=latest.version,
            summary_text=latest.summary_text,
            message_count=latest.message_count
        )
        
        # Search old versions (if more than 1 version exists)
        relevant_old = []
        if metadata.latest_version > 1:
            try:
                relevant_old = await self._search_old_summaries(
                    conversation_id=conversation_id,
                    query=current_query,
                    exclude_version=metadata.latest_version,
                    top_k=top_k_old
                )
            except Exception as e:
                logger.warning(f"Failed to search old summaries: {e}")
        
        return RollingSummaryContext(
            latest_summary=latest_version,
            relevant_old_summaries=relevant_old
        )
    
    async def _search_old_summaries(
        self,
        conversation_id: int,
        query: str,
        exclude_version: int,
        top_k: int = 2
    ) -> List[SummaryVersion]:
        """
        Search old summary versions using semantic search.
        
        Returns old versions có liên quan đến query hiện tại.
        """
        try:
            from app.services.rag_service import _embed_query
            import asyncio
            
            # Embed query
            query_embedding = await asyncio.to_thread(_embed_query, query)
            
            # Search in VectorDB
            results = self.vector_service.search(
                query_embedding=query_embedding,
                course_id=None,  # Don't filter by course for summaries
                top_k=top_k * 2  # Get more, then filter
            )
            
            # Filter: only summaries from this conversation, exclude latest
            filtered = []
            for result in results:
                metadata = result.get("metadata", {})
                if (metadata.get("type") == "conversation_summary" and
                    metadata.get("conversation_id") == conversation_id and
                    metadata.get("version") != exclude_version):
                    
                    filtered.append(SummaryVersion(
                        version=metadata.get("version"),
                        summary_text=result.get("content", ""),
                        message_count=metadata.get("message_count", 0),
                        relevance_score=result.get("score", 0.0)
                    ))
            
            # Sort by relevance and return top_k
            filtered.sort(key=lambda x: x.relevance_score, reverse=True)
            return filtered[:top_k]
            
        except Exception as e:
            logger.error(f"Error searching old summaries: {e}", exc_info=True)
            return []

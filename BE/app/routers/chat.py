
import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.dependencies.deps import get_current_user, check_enrollment
from app.models.user import User
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    ConversationDetailResponse,
    MessageCreate,
    MessageResponse,
    CitationResponse,
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/conversations", tags=["Chat"])


def _normalize_saved_citation_scores(citations) -> List[Optional[float]]:
    """Normalize stored citation scores so legacy messages render stable percentages in the UI."""
    if not citations:
        return []

    raw_scores: List[Optional[float]] = []
    for citation in citations:
        value = citation.relevance_score
        if value is None:
            raw_scores.append(None)
            continue
        try:
            raw_scores.append(float(value))
        except (TypeError, ValueError):
            raw_scores.append(None)

    valid_scores = [score for score in raw_scores if score is not None]
    if not valid_scores:
        return [None] * len(citations)

    score_min = min(valid_scores)
    score_max = max(valid_scores)
    total = max(len(citations) - 1, 1)

    normalized_scores: List[Optional[float]] = []
    for index, score in enumerate(raw_scores):
        if score is None:
            normalized_scores.append(None)
            continue

        rank_score = 1.0 if len(citations) == 1 else 1 - (index / total)
        bounded_score = max(-12.0, min(12.0, score))
        sigmoid_score = 1 / (1 + math.exp(-bounded_score))

        if score_max - score_min > 1e-6:
            relative_score = (score - score_min) / (score_max - score_min)
        else:
            relative_score = rank_score

        display_score = 0.15 + 0.85 * ((0.7 * relative_score) + (0.3 * rank_score))
        if 0 <= score <= 1:
            display_score = max(display_score, sigmoid_score)

        normalized_scores.append(round(min(0.99, max(0.01, display_score)), 4))

    return normalized_scores


# ═══════════════════════════════════════════════════════
# CONVERSATION CRUD
# ═══════════════════════════════════════════════════════

@router.get("", response_model=ConversationListResponse)
def list_conversations(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liệt kê cuộc hội thoại của user hiện tại."""
    chat_service = ChatService(db)
    conversations = chat_service.list_conversations(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    results = []
    for conv in conversations:
        msg_count = len(conv.messages) if conv.messages else 0
        results.append(ConversationResponse(
            id=conv.id,
            user_id=conv.user_id,
            course_id=conv.course_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=msg_count,
        ))

    return ConversationListResponse(results=results, total=len(results))


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo cuộc hội thoại mới."""
    # ① Enrollment Check (chat_workflow.puml - Bước ①)
    if not check_enrollment(db, current_user, data.course_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa được ghi danh vào môn học này",
        )

    chat_service = ChatService(db)
    conv = chat_service.create_conversation(
        user_id=current_user.id,
        course_id=data.course_id,
        title=data.title,
    )
    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        course_id=conv.course_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy chi tiết cuộc hội thoại + danh sách messages."""
    chat_service = ChatService(db)
    conv = chat_service.get_conversation(conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")

    messages = chat_service.get_messages(conversation_id)
    msg_responses = []
    for msg in messages:
        citations = []
        normalized_scores = _normalize_saved_citation_scores(msg.citations or [])
        if msg.citations:
            for index, c in enumerate(msg.citations):
                doc_title = ""
                page_num = None
                if c.chunk and c.chunk.document:
                    doc_title = c.chunk.document.filename
                    page_num = c.chunk.page_number
                if not page_num or page_num <= 0:
                    page_num = None
                citations.append(CitationResponse(
                    id=c.id,
                    chunk_id=c.chunk_id,
                    document_title=doc_title,
                    page_number=page_num,
                    relevance_score=normalized_scores[index],
                    quote=c.quote,
                ))
        msg_responses.append(MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role.value,
            content=msg.content,
            tokens_used=msg.tokens_used,
            model_used=msg.model_used,
            trace_id=msg.trace_id,
            citations=citations,
            created_at=msg.created_at,
            total_time_ms=msg.total_time_ms,  # Include time info
            retrieval_fallback=msg.retrieval_fallback,  # Include fallback flag
            agent_metadata=msg.agent_metadata,  # Include agent/quiz metadata
        ))

    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        course_id=conv.course_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msg_responses,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa cuộc hội thoại."""
    chat_service = ChatService(db)
    success = chat_service.delete_conversation(conversation_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")
    return None

# ═══════════════════════════════════════════════════════
# EDIT MESSAGE & ROLLBACK
# ═══════════════════════════════════════════════════════

@router.put("/{conversation_id}/messages/{message_id}/edit")
async def edit_message(
    conversation_id: int,
    message_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Edit a user message, rollback all subsequent messages, and re-process.
    Returns SSE streaming response (same format as send_message).
    """
    import json

    print(f"✏️ Edit message: conv={conversation_id}, msg={message_id}, new='{data.content[:50]}'", flush=True)

    try:
        chat_service = ChatService(db)

        # Verify conversation
        conv = chat_service.get_conversation(conversation_id, current_user.id)
        if not conv:
            raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")

        # Enrollment check
        if not check_enrollment(db, current_user, conv.course_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa được ghi danh vào môn học này",
            )

        async def event_generator():
            try:
                async for event in chat_service.edit_and_reprocess(
                    user_id=current_user.id,
                    conversation_id=conversation_id,
                    message_id=message_id,
                    new_content=data.content,
                    model=data.model,
                ):
                    yield event
            except Exception as e:
                print(f"❌ Edit event generator error: {e}", flush=True)
                error_event = f"event: error\ndata: {json.dumps({'message': str(e), 'code': 'EDIT_ERROR'}, ensure_ascii=False)}\n\n"
                yield error_event

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════
# SSE STREAMING MESSAGE (Core Endpoint — Member C)
# ═══════════════════════════════════════════════════════

@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gửi tin nhắn và nhận phản hồi SSE streaming.

   
    1. Save user message
    2. Intent detection (GREETING/CHITCHAT → fast path)
    3. RAG Pipeline: Retrieve → Rerank → Build Prompt
    4. Stream LLM response (SSE events)
    5. Save assistant message + citations

    SSE Events:
    - progress: {step, progress, message}
    - token: {content, index}
    - citations: {citations: [...], trace_id}
    - metadata: {model, tokens_used, total_time_ms, trace_id}
    - done: {total_time_ms, trace_id}
    - error: {message, code}
    """
    import json
    
    print(f"📨 SSE Request: conv={conversation_id}, user={current_user.id}, content='{data.content[:50]}'", flush=True)
    
    try:
        chat_service = ChatService(db)

        # Verify conversation exists and belongs to user
        conv = chat_service.get_conversation(conversation_id, current_user.id)
        if not conv:
            print(f"❌ Conversation {conversation_id} not found", flush=True)
            raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")

        # ① Enrollment Check (chat_workflow.puml - Bước ①)
        if not check_enrollment(db, current_user, conv.course_id):
            print(f"❌ User {current_user.id} not enrolled in course {conv.course_id}", flush=True)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa được ghi danh vào môn học này",
            )

        print(f"✅ Starting SSE stream for conv={conversation_id}", flush=True)

        async def event_generator():
            try:
                print(f"🔄 Event generator started", flush=True)
                async for event in chat_service.process_message(
                    user_id=current_user.id,
                    conversation_id=conversation_id,
                    content=data.content,
                    model=data.model,
                ):
                    yield event
                print(f"✅ Event generator completed", flush=True)
            except Exception as e:
                print(f"❌ Event generator error: {e}", flush=True)
                import traceback
                traceback.print_exc()
                # Send error event
                error_event = f"event: error\ndata: {json.dumps({'message': str(e), 'code': 'GENERATOR_ERROR'}, ensure_ascii=False)}\n\n"
                yield error_event

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ SSE endpoint error: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float, Enum,
    ForeignKey, func, JSON,
)
from sqlalchemy.orm import relationship
from app.database.db import Base


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=True, default="Cuộc hội thoại mới")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User")
    course = relationship("Course", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",
                            order_by="Message.created_at")

    def __repr__(self):
        return f"<Conversation(id={self.id}, user_id={self.user_id}, title={self.title})>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)
    model_used = Column(String(50), nullable=True)
    trace_id = Column(String(12), nullable=True, index=True)
    total_time_ms = Column(Integer, nullable=True)  # Total processing time
    retrieval_fallback = Column(Integer, nullable=True, default=False)  # SQLite uses INTEGER for BOOLEAN
    agent_metadata = Column(JSON, nullable=True)  # Quiz/Agent metadata (quiz_id, quiz_title, etc.)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Message(id={self.id}, role={self.role}, conv_id={self.conversation_id})>"


class Citation(Base):
    __tablename__ = "citations"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_id = Column(Integer, ForeignKey("document_chunks.id", ondelete="SET NULL"), nullable=True)
    relevance_score = Column(Float, nullable=True)
    quote = Column(Text, nullable=True)

    # Relationships
    message = relationship("Message", back_populates="citations")
    chunk = relationship("DocumentChunk", back_populates="citations")

    def __repr__(self):
        return f"<Citation(id={self.id}, msg_id={self.message_id}, score={self.relevance_score})>"


class ConversationSummary(Base):
    """
    Rolling Summary - Lưu các version summary theo thời gian.
    Mỗi lần có 2 message mới (user + assistant) → tạo version mới.
    Không update, chỉ tạo mới → giữ lại history.
    """
    __tablename__ = "conversation_summaries"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)  # Version number (1, 2, 3, ...)
    summary_text = Column(Text, nullable=False)  # Summary content
    message_count = Column(Integer, nullable=False)  # Số message đã summarize
    parent_version = Column(Integer, nullable=True)  # Version trước đó (NULL nếu v1)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    conversation = relationship("Conversation")

    def __repr__(self):
        return f"<ConversationSummary(id={self.id}, conv_id={self.conversation_id}, v={self.version})>"


class ConversationSummaryMetadata(Base):
    """Metadata để track rolling summary state."""
    __tablename__ = "conversation_summary_metadata"

    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    latest_version = Column(Integer, nullable=False, default=0)
    last_summarized_message_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    conversation = relationship("Conversation")

    def __repr__(self):
        return f"<SummaryMetadata(conv_id={self.conversation_id}, v={self.latest_version})>"

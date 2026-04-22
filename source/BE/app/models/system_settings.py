"""Singleton application settings stored in DB (LLM / RAG)."""
from sqlalchemy import Column, Integer, Text

from app.database.db import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    # JSON blob: provider, model, keys, rag params, etc.
    config_json = Column(Text, nullable=False)

    def __repr__(self):
        return f"<SystemSettings id={self.id}>"

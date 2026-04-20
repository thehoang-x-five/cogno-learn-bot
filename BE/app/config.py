import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(dotenv_path=env_path, override=False)

class Settings:
    # MySQL
    MYSQL_USER: str = os.getenv("MYSQL_USER", "chatuser")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "123456")
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "chatbox")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "74_rlUl35ARZKLXOmBZbdUROTuo5wHC2eWuq8WcLrTDKwy2u-NkfHXS2BLSvV2M0_lx-zL0JRpYQpLkV_5A4aw")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # CORS — comma-separated origins (e.g. dev server, HTTPS proxy on 8080)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,https://localhost:8080",
    )

    # ─── Gemini LLM (Google AI — Free Tier) ────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_INTENT_MODEL: str = os.getenv("GEMINI_INTENT_MODEL", "gemini-2.5-flash-lite")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")

    # ─── Embedding ──────────────────────────────────────────
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))

    # ─── ChromaDB (Vector Database) ─────────────────────────
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "")  # empty = in-process persistent
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8100"))
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
    CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "edu_chunks")

    # ─── Celery & Redis (Background Tasks) ──────────────────
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    CELERY_BROKER_URL: str = os.getenv(
        "CELERY_BROKER_URL",
        f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/0"
    )
    CELERY_RESULT_BACKEND: str = os.getenv(
        "CELERY_RESULT_BACKEND",
        f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/1"
    )
    
    # ─── Redis Caching (Dedup & Memory Cache) ───────────────
    REDIS_URL: str = os.getenv(
        "REDIS_URL",
        f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/2"
    )
    DEDUP_CACHE_TTL: int = int(os.getenv("DEDUP_CACHE_TTL", "5"))  # seconds
    MEMORY_CACHE_TTL: int = int(os.getenv("MEMORY_CACHE_TTL", "60"))  # seconds
    
    # ─── RAG Timeout Settings ────────────────────────────────
    # FIX: Increased RAG_RETRIEVE_TIMEOUT from 15.0 to 30.0 seconds
    # Reason: Reranking takes ~6s (model loading 3.5s + inference 2.5s) on first request
    #         + Fallback ladder can retry multiple times (3 steps)
    #         + Parallel search + RRF fusion + reranking can take 10-15s total
    RAG_RETRIEVE_TIMEOUT: float = float(os.getenv("RAG_RETRIEVE_TIMEOUT", "30.0"))  # seconds
    RAG_RERANK_TIMEOUT: float = float(os.getenv("RAG_RERANK_TIMEOUT", "10.0"))  # seconds
    INTENT_DETECT_TIMEOUT: float = float(os.getenv("INTENT_DETECT_TIMEOUT", "15.0"))  # seconds - increased to handle rate limits
    MEMORY_RECALL_TIMEOUT: float = float(os.getenv("MEMORY_RECALL_TIMEOUT", "5.0"))  # seconds

    def validate(self):
        """Validate required environment variables."""
        errors = []
        if not self.SECRET_KEY:
            errors.append("SECRET_KEY is required")
        if not self.GOOGLE_CLIENT_ID:
            errors.append("GOOGLE_CLIENT_ID is required")
        if not self.GOOGLE_CLIENT_SECRET:
            errors.append("GOOGLE_CLIENT_SECRET is required")
        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is required (get free key at https://aistudio.google.com/apikey)")
        if errors:
            raise ValueError("Missing required env vars:\n" + "\n".join(f"  - {e}" for e in errors))


settings = Settings()

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db
from app.routers import auth
from app.routers import chat
from app.routers import admin
from app.routers import documents
from app.routers import courses
from app.routers import me
from app.routers import quiz
from app.routers import notifications

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Set specific loggers to INFO
logging.getLogger("app.routers.chat").setLevel(logging.INFO)
logging.getLogger("app.services.chat_service").setLevel(logging.INFO)
logging.getLogger("app.services.rag_service").setLevel(logging.INFO)
logging.getLogger("app.services.llm_service").setLevel(logging.INFO)

app = FastAPI(
    title="Chatbot Backend",
    description="AI Chatbot with RAG - Full Stack Project",
    version="1.0.0",
)

# CORS — allow origins from env (comma-separated) for local dev / reverse proxy
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(documents.router)
app.include_router(courses.router)
app.include_router(me.router)
app.include_router(quiz.router)
app.include_router(notifications.router)


@app.on_event("startup")
async def on_startup():
    # Initialize MySQL tables (imports models internally)
    try:
        db.init_mysql()
    except Exception as e:
        print("Error during DB initialization:", e)

    # Initialize ChromaDB collection
    try:
        from app.services.vector_service import _get_collection
        _get_collection()
    except Exception as e:
        print("ChromaDB initialization skipped (optional):", e)
        
    # Pre-load models in BACKGROUND THREADS (non-blocking)
    # Server starts accepting requests immediately while models load
    import asyncio
    
    async def _warmup_all():
        """Warm up ML models in background threads."""
        try:
            from app.services.rag_service import _get_embedding_model
            await asyncio.to_thread(_get_embedding_model)
            print("🔥 Embedding model warmed up")
        except Exception as e:
            print(f"Embedding warmup skipped: {e}")
        
        try:
            from app.services.rag_service import RerankerService
            
            def _load_reranker():
                reranker = RerankerService.get_instance()
                reranker._load_model()
                if reranker._model is not None:
                    reranker._model.predict([("warmup", "warmup")])
                    print("🔥 Cross-encoder reranker warmed up")
            
            await asyncio.to_thread(_load_reranker)
        except Exception as e:
            print(f"Cross-encoder warmup skipped: {e}")
    
    # Fire and forget — doesn't block server startup
    asyncio.create_task(_warmup_all())


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "chatbot-backend", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}

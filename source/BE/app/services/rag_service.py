"""
RAG Service — Two-Phase Pipeline (chat_workflow.puml ④a→④b):
  Phase A: Retrieve — Hybrid Search (Vector + BM25 → RRF fusion → top 20)
  Phase B: Rerank — Cross-encoder score → top 5
  + Fallback Ladder + Citations

Prompt building đã được chuyển sang prompt_service.py (④c).
"""
import logging
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.config import settings
from app.models.document import DocumentChunk, Document
from app.services.vector_service import get_vector_service

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
# EMBEDDING MODEL (lazy load per server process)
# ═══════════════════════════════════════════════════════

_embedding_model = None


def _get_embedding_model():
    """Lazy load sentence-transformers embedding model (singleton per process)."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            model_name = settings.EMBEDDING_MODEL
            logger.info(f"Loading embedding model: {model_name}")
            _embedding_model = SentenceTransformer(model_name)
            logger.info(f"✅ Embedding model loaded: {model_name} (dim={_embedding_model.get_sentence_embedding_dimension()})")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    return _embedding_model


def _embed_query(query: str) -> list:
    """Embed a single query text. Used by RAG search."""
    if not query or not query.strip():
        return [0.0] * int(settings.EMBEDDING_DIMENSION)
    model = _get_embedding_model()
    embedding = model.encode(
        query,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embedding.tolist()


def _extract_quote(content: str, max_length: int = 5000) -> str:
    """Extract a meaningful quote from chunk content, skipping headers/metadata."""
    if not content:
        return ""
    
    lines = content.split("\n")
    substantive_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Skip markdown headers
        if stripped.startswith("#"):
            continue
        # Skip very short lines (likely metadata/labels)
        if len(stripped) < 15:
            continue
        # Skip lines that are just separators
        if stripped in ("---", "***", "===", "```"):
            continue
        substantive_lines.append(stripped)
    
    if not substantive_lines:
        return content[:max_length]
    
    quote = " ".join(substantive_lines)
    if len(quote) > max_length:
        quote = quote[:max_length - 3] + "..."
    return quote


def _display_relevance_scores(chunks: List["RetrievedChunk"]) -> List[float]:
    """Convert raw reranker scores into stable UI-friendly relevance scores in [0, 1]."""
    if not chunks:
        return []

    sigmoid_scores = [1 / (1 + math.exp(-chunk.score)) for chunk in chunks]
    score_min = min(sigmoid_scores)
    score_max = max(sigmoid_scores)
    total = max(len(sigmoid_scores) - 1, 1)

    display_scores: List[float] = []
    for index, sigmoid_score in enumerate(sigmoid_scores):
        rank_score = 1.0 if len(sigmoid_scores) == 1 else 1 - (index / total)
        if score_max - score_min > 1e-6:
            relative_score = (sigmoid_score - score_min) / (score_max - score_min)
        else:
            relative_score = rank_score

        display_score = 0.15 + 0.85 * ((0.7 * relative_score) + (0.3 * rank_score))
        display_scores.append(round(min(0.99, max(0.01, display_score)), 4))

    return display_scores


def build_citations(chunks: List["RetrievedChunk"]) -> List[Dict]:
    """Build citation payloads from retrieved chunks."""
    citations = []
    display_scores = _display_relevance_scores(chunks)
    for chunk, relevance_score in zip(chunks, display_scores):
        citations.append({
            "chunk_id": chunk.chunk_id,
            "document_id": chunk.document_id,
            "document_title": chunk.document_title,
            "page_number": chunk.page_number if chunk.page_number and chunk.page_number > 0 else None,
            "relevance_score": relevance_score,
            "quote": _extract_quote(chunk.content),
        })
    return citations


# ═══════════════════════════════════════════════════════
# BM25 Keyword Search
# ═══════════════════════════════════════════════════════

VIETNAMESE_STOPWORDS: Set[str] = {
    "và", "của", "là", "có", "được", "cho", "với", "trong", "này",
    "đã", "để", "các", "một", "những", "không", "từ", "như", "khi",
    "về", "theo", "trên", "đến", "ra", "vào", "còn", "cũng", "nên",
    "thì", "mà", "hay", "hoặc", "nếu", "vì", "do", "bởi", "tại",
}


def tokenize(text: str) -> List[str]:
    """Simple whitespace tokenizer with Vietnamese stopword removal."""
    if not text:
        return []
    tokens = text.lower().split()
    return [t for t in tokens if t not in VIETNAMESE_STOPWORDS and len(t) > 1]


@dataclass
class BM25Result:
    chunk_id: int
    content: str
    score: float
    page_number: Optional[int] = None
    document_id: Optional[int] = None
    document_title: str = ""


def bm25_search(
    query: str,
    chunks: List[DocumentChunk],
    top_k: int = 10,
    k1: float = 1.5,
    b: float = 0.75,
) -> List[BM25Result]:
    """
    BM25 keyword search over chunks.
    k1=1.5, b=0.75 (same as RAG-Anything BM25Index).
    """
    query_terms = tokenize(query)
    if not query_terms or not chunks:
        return []

    # Pre-tokenize all chunks
    chunk_tokens = [(c, tokenize(c.content)) for c in chunks]
    doc_count = len(chunk_tokens)
    total_len = sum(len(tokens) for _, tokens in chunk_tokens)
    avg_doc_len = total_len / doc_count if doc_count > 0 else 1

    # Document frequency for query terms
    df: Dict[str, int] = {}
    for term in set(query_terms):
        df[term] = sum(1 for _, tokens in chunk_tokens if term in tokens)

    results = []
    for chunk, doc_tokens in chunk_tokens:
        doc_len = len(doc_tokens)
        term_freq: Dict[str, int] = {}
        for t in doc_tokens:
            term_freq[t] = term_freq.get(t, 0) + 1

        score = 0.0
        for term in query_terms:
            if term not in term_freq:
                continue
            tf = term_freq[term]
            doc_freq = df.get(term, 0)
            idf = math.log((doc_count - doc_freq + 0.5) / (doc_freq + 0.5) + 1)
            tf_norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc_len / avg_doc_len))
            score += idf * tf_norm

        if score > 0:
            doc_title = ""
            if hasattr(chunk, 'document') and chunk.document:
                doc_title = chunk.document.filename
            results.append(BM25Result(
                chunk_id=chunk.id,
                content=chunk.content,
                score=score,
                page_number=chunk.page_number,
                document_id=chunk.document_id,
                document_title=doc_title,
            ))

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:top_k]


# ═══════════════════════════════════════════════════════
# CROSS-ENCODER RERANKER (④b — chat_workflow.puml)
# ═══════════════════════════════════════════════════════

class RerankerService:
    """
    Cross-encoder Reranker (chat_workflow.puml - Bước ④b).

    Sử dụng sentence-transformers CrossEncoder để tính relevance score
    chính xác hơn RRF sort. Chạy TRƯỚC generation (Phase B).

    Model: cross-encoder/ms-marco-MiniLM-L-6-v2 (~80MB, fast inference)
    """

    _instance = None  # Singleton — tránh load model nhiều lần

    def __init__(self):
        self._model = None

    @classmethod
    def get_instance(cls) -> "RerankerService":
        """Singleton pattern — load model 1 lần duy nhất."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self):
        """Lazy load cross-encoder model."""
        if self._model is not None:
            return

        try:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(
                "cross-encoder/ms-marco-MiniLM-L-6-v2",
                max_length=512,
            )
            logger.info("✅ Cross-encoder reranker loaded: ms-marco-MiniLM-L-6-v2")
        except ImportError:
            logger.warning("⚠️ sentence-transformers not installed, rerank disabled")
            self._model = None
        except Exception as e:
            logger.warning(f"⚠️ Failed to load cross-encoder: {e}")
            self._model = None

    def rerank(
        self,
        query: str,
        chunks: List["RetrievedChunk"],
        top_k: int = 5,
    ) -> List["RetrievedChunk"]:
        """
        Rerank chunks bằng cross-encoder model.

        Args:
            query: Câu hỏi gốc
            chunks: Candidates từ Phase A (RRF fusion)
            top_k: Số chunks trả về sau rerank

        Returns:
            Top-K chunks đã rerank theo cross-encoder score
        """
        if not chunks:
            return []

        # Lazy load model
        self._load_model()

        # Fallback: nếu model không load được → giữ nguyên RRF order
        if self._model is None:
            logger.info("Rerank fallback: using RRF score order")
            return chunks[:top_k]

        try:
            # Build query-document pairs cho cross-encoder
            pairs = [(query, chunk.content[:512]) for chunk in chunks]

            # Cross-encoder predict relevance scores
            scores = self._model.predict(pairs)

            # Gán score mới và sort
            for chunk, score in zip(chunks, scores):
                chunk.score = float(score)

            chunks.sort(key=lambda x: x.score, reverse=True)
            logger.info(
                f"🔄 Reranked {len(chunks)} → top {top_k} "
                f"(best={chunks[0].score:.4f} if chunks else 'N/A')"
            )
            return chunks[:top_k]

        except Exception as e:
            logger.warning(f"Rerank error, fallback to RRF: {e}")
            return chunks[:top_k]


# ═══════════════════════════════════════════════════════
# RAG PIPELINE RESULT
# ═══════════════════════════════════════════════════════

@dataclass
class RetrievedChunk:
    """A retrieved chunk with metadata."""
    chunk_id: int
    content: str
    score: float
    page_number: Optional[int] = None
    document_id: Optional[int] = None
    document_title: str = ""
    heading: Optional[str] = None
    source: str = ""  # "vector" | "bm25" | "hybrid"


@dataclass
class RAGResult:
    """Output of RAG pipeline (Phase A+B). Prompt building in prompt_service.py."""
    retrieved_chunks: List[RetrievedChunk] = field(default_factory=list)
    citations: List[Dict] = field(default_factory=list)
    retrieval_fallback: bool = False


# ═══════════════════════════════════════════════════════
# RAG SERVICE
# ═══════════════════════════════════════════════════════

class RAGService:
    """
    Two-Phase RAG Pipeline (chat_workflow.puml ④a→④b):
      Phase A: Retrieve — Vector + BM25 → RRF fusion → top 20 candidates
      Phase B: Rerank — Cross-encoder → top 5 chunks
      + Fallback Ladder + Citations

    Prompt building (④c) đã chuyển sang PromptService.
    """

    RRF_K = 60  # Same as RAG-Anything

    def __init__(self, db: Session):
        self.db = db
        
        # Defensive init — allow RAGService to be created even if
        # ChromaDB isn't available yet.
        # Failures will surface at query time with clear error messages.
        try:
            self.vector_service = get_vector_service()
        except Exception as e:
            logger.warning(f"⚠️ Vector service init failed: {e}")
            self.vector_service = None
        
        self.reranker = RerankerService.get_instance()

    async def retrieve(
        self,
        query: str,
        course_id: int,
        top_k: int = 5,
    ) -> RAGResult:
        """
        Full RAG pipeline: Retrieve → Rerank → Citations.
        
        All synchronous/CPU-heavy operations are offloaded to a thread pool
        via asyncio.to_thread() to prevent blocking the event loop.
        This keeps the FastAPI server responsive for other requests (conversations,
        page loads, etc.) while RAG is processing.

        Args:
            query: User question
            course_id: Course filter
            top_k: Final number of chunks to use

        Returns:
            RAGResult with retrieved_chunks + citations
        """
        import asyncio
        
        logger.info(f"RAG retrieve start: query='{query[:50]}', course_id={course_id}, top_k={top_k}")
        
        # Guard: check services are available
        if not self.vector_service:
            logger.error("Vector service (ChromaDB) not available — cannot perform RAG")
            return RAGResult(
                retrieved_chunks=[],
                citations=[],
                retrieval_fallback=True,
            )
        
        # ══════════════════════════════════════════════════
        # PHASE A: RETRIEVE — Parallel Hybrid Search (④a)
        # ══════════════════════════════════════════════════
        
        try:
            # Generate query embedding — offload to thread (CPU-heavy, blocks event loop)
            logger.info("Generating query embedding...")
            query_embedding = await asyncio.to_thread(_embed_query, query)
            logger.info(f"Query embedding generated: dim={len(query_embedding)}")
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}", exc_info=True)
            raise
        
        async def _vector_search():
            """Run vector search in thread pool to avoid blocking event loop."""
            try:
                logger.info("Starting vector search...")
                results = await asyncio.to_thread(
                    self.vector_service.search,
                    query_embedding=query_embedding,
                    course_id=course_id,
                    top_k=top_k * 4,
                )
                logger.info(f"Vector search completed: {len(results)} results")
                return results
            except Exception as e:
                logger.error(f"Vector search failed: {e}", exc_info=True)
                return []
        
        async def _bm25_search():
            """Run BM25 search in thread pool to avoid blocking event loop."""
            try:
                logger.info("Starting BM25 search...")
                def _do_bm25():
                    db_chunks = (
                        self.db.query(DocumentChunk)
                        .join(Document)
                        .filter(Document.course_id == course_id)
                        .all()
                    )
                    logger.info(f"BM25 search: {len(db_chunks)} chunks in DB")
                    return bm25_search(query, db_chunks, top_k=top_k * 4)
                
                results = await asyncio.to_thread(_do_bm25)
                logger.info(f"BM25 search completed: {len(results)} results")
                return results
            except Exception as e:
                logger.error(f"BM25 search failed: {e}", exc_info=True)
                return []
        
        # Run vector and BM25 searches in parallel (both are threaded, truly non-blocking)
        try:
            logger.info("Running parallel vector + BM25 search...")
            vector_results, bm25_results = await asyncio.gather(
                _vector_search(), 
                _bm25_search()
            )
            logger.info(f"Parallel search completed: {len(vector_results)} vector + {len(bm25_results)} BM25")
        except Exception as e:
            logger.error(f"Parallel search failed: {e}", exc_info=True)
            raise

        # A3. RRF Fusion → top 20 candidates
        try:
            logger.info("Starting RRF fusion...")
            candidates = self._rrf_fusion(vector_results, bm25_results)
            top_20 = candidates[:20]
            logger.info(f"RRF fusion completed: {len(candidates)} candidates → top {len(top_20)}")
        except Exception as e:
            logger.error(f"RRF fusion failed: {e}", exc_info=True)
            raise

        logger.info(f"Phase A (PARALLEL): {len(vector_results)} vector + {len(bm25_results)} bm25 → {len(top_20)} candidates")

        # ══════════════════════════════════════════════════
        # FALLBACK LADDER (④a.1) - 3 Steps (FIX 2: Complete implementation)
        # ══════════════════════════════════════════════════
        
        retrieval_fallback = False
        # FIX: Lower threshold to match RRF score range (0.005-0.02 for top results)
        # RRF formula: score = weight / (k + rank) where k=60
        # Top rank scores: ~0.01, so threshold should be much lower than 0.3
        _MIN_RETRIEVAL_SCORE = 0.005
        original_query = query  # Store original for retry
        
        # FIX 2: Check BOTH empty results AND low score
        if not top_20 or (top_20 and top_20[0].score < _MIN_RETRIEVAL_SCORE):
            fallback_reason = "empty" if not top_20 else f"low_score({top_20[0].score:.2f})"
            logger.info(f"🪜 Fallback ladder triggered: {fallback_reason}")
            
            # Step 1: Retry with original query (if query was rewritten)
            # This handles cases where query expansion made it too specific
            step1_success = False
            if hasattr(self, '_last_rewritten_query') and self._last_rewritten_query != original_query:
                logger.info(f"🪜 Fallback step 1: retry with original query '{original_query[:50]}'")
                try:
                    # Re-run parallel search with original query
                    query_embedding_retry = await asyncio.to_thread(_embed_query, original_query)
                    
                    async def _vector_retry():
                        return await asyncio.to_thread(
                            self.vector_service.search,
                            query_embedding=query_embedding_retry,
                            course_id=course_id,
                            top_k=top_k * 4,
                        )
                    
                    async def _bm25_retry():
                        def _do_bm25():
                            db_chunks = (
                                self.db.query(DocumentChunk)
                                .join(Document)
                                .filter(Document.course_id == course_id)
                                .all()
                            )
                            return bm25_search(original_query, db_chunks, top_k=top_k * 4)
                        return await asyncio.to_thread(_do_bm25)
                    
                    vector_retry, bm25_retry = await asyncio.gather(_vector_retry(), _bm25_retry())
                    retry_candidates = self._rrf_fusion(vector_retry, bm25_retry)
                    
                    if retry_candidates and retry_candidates[0].score >= _MIN_RETRIEVAL_SCORE:
                        logger.info(f"🪜 Step 1 SUCCESS: {len(retry_candidates)} chunks (score={retry_candidates[0].score:.3f})")
                        top_20 = retry_candidates[:20]
                        step1_success = True
                    else:
                        logger.info(f"🪜 Step 1 FAILED: still low score")
                        
                except Exception as e:
                    logger.warning(f"🪜 Step 1 error: {e}")
            else:
                logger.info("🪜 Step 1 SKIPPED: query not rewritten")
            
            # Step 2: Broaden search - remove course filter + run BOTH vector AND BM25
            # FIX 2: Now runs full parallel hybrid search (not just vector)
            if not step1_success and (not top_20 or top_20[0].score < _MIN_RETRIEVAL_SCORE):
                logger.info("🪜 Fallback step 2: broaden search (no course filter, parallel hybrid)")
                try:
                    async def _vector_broad():
                        return await asyncio.to_thread(
                            self.vector_service.search,
                            query_embedding=query_embedding,
                            course_id=None,  # Remove course filter
                            top_k=top_k * 2,
                        )
                    
                    async def _bm25_broad():
                        def _do_bm25():
                            # Get ALL chunks (no course filter)
                            db_chunks = self.db.query(DocumentChunk).all()
                            return bm25_search(query, db_chunks, top_k=top_k * 2)
                        return await asyncio.to_thread(_do_bm25)
                    
                    vector_broad, bm25_broad = await asyncio.gather(_vector_broad(), _bm25_broad())
                    broad_candidates = self._rrf_fusion(vector_broad, bm25_broad)
                    
                    if broad_candidates and broad_candidates[0].score >= _MIN_RETRIEVAL_SCORE:
                        logger.info(f"🪜 Step 2 SUCCESS: {len(broad_candidates)} chunks (score={broad_candidates[0].score:.3f})")
                        top_20 = broad_candidates[:20]
                    else:
                        logger.info(f"🪜 Step 2 FAILED: still low score")
                        
                        # Step 3: Exhausted - flag and refuse to answer
                        logger.warning("🪜 Fallback ladder EXHAUSTED — no relevant docs found")
                        retrieval_fallback = True
                        top_20 = []
                        
                except Exception as e:
                    logger.error(f"🪜 Step 2 error: {e}", exc_info=True)
                    retrieval_fallback = True
                    top_20 = []

        # ══════════════════════════════════════════════════
        # PHASE B: RERANK — Cross-encoder (④b) — offload to thread (CPU-heavy)
        # ══════════════════════════════════════════════════

        try:
            logger.info(f"Starting reranking: {len(top_20)} candidates → top {top_k}")
            top_chunks = await asyncio.to_thread(
                self.reranker.rerank, query, top_20, top_k
            )
            logger.info(f"Reranking completed: {len(top_chunks)} chunks")
        except Exception as e:
            logger.error(f"Reranking failed: {e}", exc_info=True)
            # Fallback: use top_k from candidates without reranking
            top_chunks = top_20[:top_k]
            logger.info(f"Reranking fallback: using top {len(top_chunks)} candidates")

        logger.info(f"Phase B: Reranked {len(top_20)} → {len(top_chunks)} chunks")

        try:
            logger.info("Building citations...")
            citations = build_citations(top_chunks)
            logger.info(f"Citations built: {len(citations)} citations")
        except Exception as e:
            logger.error(f"Citation building failed: {e}", exc_info=True)
            citations = []

        # Note: retrieval_fallback is now determined in the Fallback Ladder section above
        logger.info(f"RAG retrieve complete: {len(top_chunks)} chunks, {len(citations)} citations, fallback={retrieval_fallback}")
        
        return RAGResult(
            retrieved_chunks=top_chunks,
            citations=citations,
            retrieval_fallback=retrieval_fallback,
        )

    def _rrf_fusion(
        self,
        vector_results: List[Dict],
        bm25_results: List[BM25Result],
    ) -> List[RetrievedChunk]:
        """
        Reciprocal Rank Fusion (RRF)
        score(d) = Σ weight_i / (k + rank_i(d))
        """
        scores: Dict[str, float] = {}
        chunk_data: Dict[str, RetrievedChunk] = {}

        # Vector results
        vector_weight = 0.6
        for rank, vr in enumerate(vector_results, 1):
            key = str(vr["chunk_id"])
            rrf = vector_weight / (self.RRF_K + rank)
            scores[key] = scores.get(key, 0) + rrf
            if key not in chunk_data:
                chunk_data[key] = RetrievedChunk(
                    chunk_id=int(key) if key.isdigit() else 0,
                    content=vr["content"],
                    score=0,
                    page_number=vr["metadata"].get("page_number"),
                    document_id=vr["metadata"].get("document_id"),
                    document_title=vr["metadata"].get("filename", ""),
                    source="vector",
                )

        # BM25 results
        bm25_weight = 0.4
        for rank, br in enumerate(bm25_results, 1):
            key = str(br.chunk_id)
            rrf = bm25_weight / (self.RRF_K + rank)
            scores[key] = scores.get(key, 0) + rrf
            if key not in chunk_data:
                chunk_data[key] = RetrievedChunk(
                    chunk_id=br.chunk_id,
                    content=br.content,
                    score=0,
                    page_number=br.page_number,
                    document_id=br.document_id,
                    document_title=br.document_title,
                    source="bm25",
                )
            else:
                chunk_data[key].source = "hybrid"

        # Apply scores and sort
        results = []
        for key, score in scores.items():
            if key in chunk_data:
                chunk = chunk_data[key]
                chunk.score = score
                results.append(chunk)

        results.sort(key=lambda x: x.score, reverse=True)
        return results

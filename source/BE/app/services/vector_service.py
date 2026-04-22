
import logging
from typing import Dict, List, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)

# Singleton ChromaDB client & collection
_client = None
_collection = None


def _get_client():
    """Get or create ChromaDB client (singleton)."""
    global _client
    if _client is not None:
        return _client

    import chromadb

    if settings.CHROMA_HOST:
        # Client/Server mode
        _client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
        )
        logger.info(f"✅ ChromaDB client (server): {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
    else:
        # Persistent local mode (dev-friendly, no server needed)
        _client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        logger.info(f"✅ ChromaDB client (persistent): {settings.CHROMA_PERSIST_DIR}")

    return _client


def _get_collection():
    """Get or create the default collection (singleton)."""
    global _collection
    if _collection is not None:
        return _collection

    client = _get_client()
    _collection = client.get_or_create_collection(
        name=settings.CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},  # cosine similarity
    )
    logger.info(f"✅ ChromaDB collection: {settings.CHROMA_COLLECTION} (count={_collection.count()})")
    return _collection


class VectorService:
    """
    ChromaDB vector operations: add, search, delete.
    Uses cosine similarity (matching pgvector behavior from diagrams).
    """

    def __init__(self):
        self.collection = _get_collection()

    def add_chunks(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        """
        Add chunks to ChromaDB.
        Called by Member A's document upload pipeline.

        Args:
            ids: Unique IDs (use str(chunk.id) from MySQL)
            embeddings: Vector embeddings
            documents: Chunk text content
            metadatas: {document_id, course_id, page_number, heading, filename}
        """
        if not ids:
            return
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(ids)} chunks to ChromaDB")

    def search(
        self,
        query_embedding: List[float],
        course_id: Optional[int] = None,
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search in ChromaDB.
        Applies course_id filter (WHERE course_id = ?) as per diagrams.

        Returns: list of {id, content, score, metadata}
        """
        where_filter = None
        if course_id is not None:
            where_filter = {"course_id": course_id}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        # Convert ChromaDB results to our format
        items = []
        if results and results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                # ChromaDB returns distances; cosine distance = 1 - similarity
                distance = results["distances"][0][i] if results["distances"] else 0
                score = 1.0 - distance  # Convert to similarity score

                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                content = results["documents"][0][i] if results["documents"] else ""

                items.append({
                    "chunk_id": chunk_id,
                    "content": content,
                    "score": score,
                    "metadata": metadata,
                })

        return items

    def delete_by_document(self, document_id: int) -> None:
        """Delete all chunks belonging to a document."""
        try:
            self.collection.delete(
                where={"document_id": document_id}
            )
            logger.info(f"Deleted chunks for document_id={document_id}")
        except Exception as e:
            logger.warning(f"Error deleting chunks: {e}")

    def count(self) -> int:
        """Return total number of vectors in collection."""
        return self.collection.count()


# ── Singleton instance ──────────────────────────────────

_service_instance = None


def get_vector_service() -> VectorService:
    global _service_instance
    if _service_instance is None:
        _service_instance = VectorService()
    return _service_instance

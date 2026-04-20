"""
Dedup Cache Service — Prevent duplicate queries within 5 seconds.

Caches query results in Redis to avoid redundant processing.
Key format: dedup:{user_id}:{course_id}:{query_hash}
TTL: 5 seconds (configurable)
"""
import hashlib
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class DedupCache:
    """
    Deduplication cache to prevent processing identical queries within a short time window.
    
    Usage:
        cache = DedupCache(redis_client)
        
        # Check cache before processing
        cached = await cache.get(user_id, course_id, query)
        if cached:
            return cached  # Return cached response
        
        # Process query...
        result = await process_query(query)
        
        # Store in cache
        await cache.set(user_id, course_id, query, result)
    """
    
    def __init__(self, redis_client, ttl: int = 5):
        """
        Initialize dedup cache.
        
        Args:
            redis_client: Redis client instance
            ttl: Time-to-live in seconds (default: 5)
        """
        self.redis = redis_client
        self.ttl = ttl
    
    def _make_key(self, user_id: int, course_id: int, query: str) -> str:
        """
        Generate cache key from user_id, course_id, and query.
        
        Uses SHA256 hash of query to handle long queries and special characters.
        """
        query_hash = hashlib.sha256(query.encode('utf-8')).hexdigest()[:16]
        return f"dedup:{user_id}:{course_id}:{query_hash}"
    
    async def get(self, user_id: int, course_id: int, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached result for query.
        
        Returns:
            Cached result dict with 'answer' and 'metadata', or None if not cached
        """
        try:
            key = self._make_key(user_id, course_id, query)
            cached_data = await self.redis.get(key)
            
            if cached_data:
                result = json.loads(cached_data)
                logger.info(f"⚡ Dedup cache HIT — key={key[:40]}...")
                return result
            
            return None
            
        except Exception as e:
            logger.warning(f"Dedup cache get error: {e}")
            return None
    
    async def set(
        self,
        user_id: int,
        course_id: int,
        query: str,
        answer: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Store query result in cache.
        
        Args:
            user_id: User ID
            course_id: Course ID
            query: User query
            answer: Generated answer
            metadata: Optional metadata (citations, model, etc.)
        
        Returns:
            True if stored successfully, False otherwise
        """
        try:
            key = self._make_key(user_id, course_id, query)
            
            cache_data = {
                "answer": answer,
                "metadata": metadata or {},
                "query": query[:100],  # Store truncated query for debugging
            }
            
            await self.redis.setex(
                key,
                self.ttl,
                json.dumps(cache_data, ensure_ascii=False)
            )
            
            logger.debug(f"Dedup cache SET — key={key[:40]}..., ttl={self.ttl}s")
            return True
            
        except Exception as e:
            logger.warning(f"Dedup cache set error: {e}")
            return False
    
    async def invalidate(self, user_id: int, course_id: int, query: str) -> bool:
        """
        Invalidate cached result for specific query.
        
        Returns:
            True if deleted, False otherwise
        """
        try:
            key = self._make_key(user_id, course_id, query)
            deleted = await self.redis.delete(key)
            if deleted:
                logger.debug(f"Dedup cache INVALIDATE — key={key[:40]}...")
            return bool(deleted)
            
        except Exception as e:
            logger.warning(f"Dedup cache invalidate error: {e}")
            return False
    
    async def clear_user_cache(self, user_id: int) -> int:
        """
        Clear all cached queries for a user.
        
        Returns:
            Number of keys deleted
        """
        try:
            pattern = f"dedup:{user_id}:*"
            keys = []
            
            # Scan for matching keys
            cursor = 0
            while True:
                cursor, batch = await self.redis.scan(cursor, match=pattern, count=100)
                keys.extend(batch)
                if cursor == 0:
                    break
            
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info(f"Dedup cache CLEAR — user={user_id}, deleted={deleted} keys")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.warning(f"Dedup cache clear error: {e}")
            return 0

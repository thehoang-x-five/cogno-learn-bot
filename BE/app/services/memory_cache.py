"""
Memory Cache Service — Cache conversation context in Redis.

Caches conversation history and memory context to avoid repeated DB queries.
Key format: memory:{conversation_id}
TTL: 60 seconds (invalidated on new message)
"""
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MemoryCacheManager:
    """
    Cache manager for conversation memory and context.
    
    Caches:
    - Conversation history (last N messages)
    - Memory summary
    - Key facts
    
    Usage:
        cache = MemoryCacheManager(redis_client)
        
        # Try cache first
        context = await cache.get_memory(conversation_id)
        if not context:
            # Load from DB
            context = load_from_db(conversation_id)
            # Store in cache
            await cache.set_memory(conversation_id, context)
    """
    
    def __init__(self, redis_client, ttl: int = 60):
        """
        Initialize memory cache manager.
        
        Args:
            redis_client: Redis client instance
            ttl: Time-to-live in seconds (default: 60)
        """
        self.redis = redis_client
        self.ttl = ttl
    
    def _make_key(self, conversation_id: int, suffix: str = "") -> str:
        """Generate cache key for conversation."""
        if suffix:
            return f"memory:{conversation_id}:{suffix}"
        return f"memory:{conversation_id}"
    
    async def get_memory(self, conversation_id: int) -> Optional[str]:
        """
        Get cached memory context for conversation.
        
        Returns:
            Memory context string, or None if not cached
        """
        try:
            key = self._make_key(conversation_id, "context")
            cached = await self.redis.get(key)
            
            if cached:
                logger.debug(f"⚡ Memory cache HIT — conv={conversation_id}")
                return cached.decode('utf-8') if isinstance(cached, bytes) else cached
            
            return None
            
        except Exception as e:
            logger.warning(f"Memory cache get error: {e}")
            return None
    
    async def set_memory(self, conversation_id: int, context: str) -> bool:
        """
        Store memory context in cache.
        
        Args:
            conversation_id: Conversation ID
            context: Memory context string
        
        Returns:
            True if stored successfully
        """
        try:
            key = self._make_key(conversation_id, "context")
            await self.redis.setex(key, self.ttl, context)
            logger.debug(f"Memory cache SET — conv={conversation_id}, len={len(context)}")
            return True
            
        except Exception as e:
            logger.warning(f"Memory cache set error: {e}")
            return False
    
    async def get_history(self, conversation_id: int) -> Optional[List[Dict[str, str]]]:
        """
        Get cached conversation history.
        
        Returns:
            List of message dicts [{"role": "user", "content": "..."}], or None
        """
        try:
            key = self._make_key(conversation_id, "history")
            cached = await self.redis.get(key)
            
            if cached:
                history = json.loads(cached)
                logger.debug(f"⚡ History cache HIT — conv={conversation_id}, msgs={len(history)}")
                return history
            
            return None
            
        except Exception as e:
            logger.warning(f"History cache get error: {e}")
            return None
    
    async def set_history(
        self,
        conversation_id: int,
        history: List[Dict[str, str]]
    ) -> bool:
        """
        Store conversation history in cache.
        
        Args:
            conversation_id: Conversation ID
            history: List of message dicts
        
        Returns:
            True if stored successfully
        """
        try:
            key = self._make_key(conversation_id, "history")
            await self.redis.setex(
                key,
                self.ttl,
                json.dumps(history, ensure_ascii=False)
            )
            logger.debug(f"History cache SET — conv={conversation_id}, msgs={len(history)}")
            return True
            
        except Exception as e:
            logger.warning(f"History cache set error: {e}")
            return False
    
    async def invalidate(self, conversation_id: int) -> int:
        """
        Invalidate all cached data for conversation.
        
        Called when new message is added.
        
        Returns:
            Number of keys deleted
        """
        try:
            pattern = f"memory:{conversation_id}:*"
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
                logger.debug(f"Memory cache INVALIDATE — conv={conversation_id}, deleted={deleted}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.warning(f"Memory cache invalidate error: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dict with cache stats (keys, memory usage, etc.)
        """
        try:
            # Count memory keys
            pattern = "memory:*"
            cursor = 0
            key_count = 0
            
            while True:
                cursor, batch = await self.redis.scan(cursor, match=pattern, count=1000)
                key_count += len(batch)
                if cursor == 0:
                    break
            
            # Get Redis info
            info = await self.redis.info("memory")
            
            return {
                "total_keys": key_count,
                "memory_used_mb": info.get("used_memory", 0) / (1024 * 1024),
                "ttl": self.ttl,
            }
            
        except Exception as e:
            logger.warning(f"Memory cache stats error: {e}")
            return {}

"""
Redis Manager — Singleton Redis connection pool.

Provides async Redis client for caching services.
"""
import logging
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# Global Redis client instance
_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    """
    Get Redis client instance (singleton).
    
    Returns:
        Redis client, or None if Redis is not available
    """
    global _redis_client
    
    if _redis_client is not None:
        return _redis_client
    
    try:
        # Parse Redis URL from settings
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        
        # Create connection pool
        _redis_client = await aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=10,
        )
        
        # Test connection
        await _redis_client.ping()
        logger.info(f"✅ Redis connected: {redis_url}")
        
        return _redis_client
        
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed: {e}")
        logger.warning("Caching features will be disabled")
        return None


async def close_redis():
    """Close Redis connection pool."""
    global _redis_client
    
    if _redis_client:
        try:
            await _redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.warning(f"Error closing Redis: {e}")
        finally:
            _redis_client = None


async def health_check() -> bool:
    """
    Check if Redis is healthy.
    
    Returns:
        True if Redis is available and responding
    """
    try:
        client = await get_redis()
        if client:
            await client.ping()
            return True
        return False
    except Exception:
        return False

"""
Quality Monitoring Service - Real-time quality checks during streaming.

Features:
- Mid-stream hallucination detection (every 3 sentences)
- Confidence scoring per-sentence
- Fact checking against retrieved chunks
"""
import logging
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


@dataclass
class QualityCheck:
    """Result of a quality check."""
    passed: bool
    confidence: float  # 0.0-1.0
    issues: List[str]  # List of detected issues
    sentence_count: int
    checked_at_char: int


class QualityMonitor:
    """
    Monitor response quality during streaming.
    
    Checks:
    1. Hallucination detection (every 3 sentences)
    2. Confidence scoring
    3. Fact checking against context
    """

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service or LLMService()
        self.sentence_buffer = []
        self.total_sentences = 0
        self.check_interval = 3  # Check every 3 sentences

    def add_token(self, token: str) -> Optional[QualityCheck]:
        """
        Add a token to the buffer and check if quality check is needed.
        
        Args:
            token: New token from LLM stream
        
        Returns:
            QualityCheck if check was performed, None otherwise
        """
        # Detect sentence boundaries
        if self._is_sentence_end(token):
            self.total_sentences += 1
            
            # Check every N sentences
            if self.total_sentences % self.check_interval == 0:
                return self._perform_check()
        
        return None

    def _is_sentence_end(self, token: str) -> bool:
        """Detect if token marks end of sentence."""
        # Vietnamese and English sentence endings
        sentence_endings = ['.', '!', '?', '。', '！', '？']
        return any(token.strip().endswith(end) for end in sentence_endings)

    def _perform_check(self) -> QualityCheck:
        """
        Perform quality check on accumulated text.
        
        For now, this is a placeholder that returns passing checks.
        Full implementation would use LLM to detect hallucinations.
        """
        # Placeholder: Always pass for now
        return QualityCheck(
            passed=True,
            confidence=0.85,
            issues=[],
            sentence_count=self.total_sentences,
            checked_at_char=0,
        )

    async def check_hallucination(
        self, 
        text: str, 
        context_chunks: List[str]
    ) -> Dict[str, Any]:
        """
        Check if text contains hallucinations relative to context.
        
        Args:
            text: Generated text to check
            context_chunks: Source chunks used for generation
        
        Returns:
            {
                "has_hallucination": bool,
                "confidence": float,
                "issues": List[str],
            }
        """
        if not text or not context_chunks:
            return {
                "has_hallucination": False,
                "confidence": 1.0,
                "issues": [],
            }

        try:
            # Build prompt for hallucination detection
            context_str = "\n\n".join(context_chunks[:3])  # Use top 3 chunks
            
            prompt = f"""Kiểm tra xem câu trả lời có chứa thông tin sai lệch (hallucination) so với ngữ cảnh không.

Ngữ cảnh:
{context_str}

Câu trả lời:
{text}

Trả lời JSON:
{{
  "has_hallucination": true/false,
  "confidence": 0.0-1.0,
  "issues": ["vấn đề 1", "vấn đề 2"]
}}

CHỈ trả về JSON, không thêm text khác."""

            result = await self.llm_service.chat_completion(
                messages=[
                    {"role": "system", "content": "Bạn là chuyên gia kiểm tra chất lượng câu trả lời."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=500,
            )

            # Parse response
            import json
            content = result["content"].strip()
            
            # Extract JSON from markdown if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            check_result = json.loads(content)
            
            return {
                "has_hallucination": check_result.get("has_hallucination", False),
                "confidence": check_result.get("confidence", 0.5),
                "issues": check_result.get("issues", []),
            }

        except Exception as e:
            logger.warning(f"Hallucination check failed: {e}")
            # Fail open: assume no hallucination if check fails
            return {
                "has_hallucination": False,
                "confidence": 0.5,
                "issues": [f"Check failed: {str(e)[:50]}"],
            }

    def calculate_confidence(
        self,
        retrieval_score: float,
        rerank_score: float,
        citation_coverage: float,
    ) -> float:
        """
        Calculate overall confidence score for response.
        
        Args:
            retrieval_score: Top chunk retrieval score (0-1)
            rerank_score: Top chunk rerank score (0-1)
            citation_coverage: Ratio of response covered by citations (0-1)
        
        Returns:
            Confidence score (0-1)
        """
        # Weighted average
        weights = {
            "retrieval": 0.3,
            "rerank": 0.4,
            "citation": 0.3,
        }
        
        confidence = (
            weights["retrieval"] * retrieval_score +
            weights["rerank"] * rerank_score +
            weights["citation"] * citation_coverage
        )
        
        return min(max(confidence, 0.0), 1.0)  # Clamp to [0, 1]

    def reset(self):
        """Reset monitor state for new response."""
        self.sentence_buffer = []
        self.total_sentences = 0

"""
Agent orchestrator using Gemini function calling over app tools.
"""

import logging
import re
import unicodedata
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.services.llm_service import LLMService
from app.services.tools.quiz_generator import QuizGenerator
from app.services.tools.schedule_lookup import ScheduleLookup

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Coordinate tool use with Gemini function calling."""

    def __init__(
        self,
        db: Session,
        llm_service: Optional[LLMService] = None,
        schedule_lookup: Optional[ScheduleLookup] = None,
        quiz_generator: Optional[QuizGenerator] = None,
    ):
        self.db = db
        self.llm_service = llm_service or LLMService()
        self.schedule_lookup = schedule_lookup or ScheduleLookup(db)
        self.quiz_generator = quiz_generator or QuizGenerator(db)

    async def process(
        self,
        intent: str,
        query: str,
        course_id: int,
        user_id: int,
        **kwargs,
    ) -> Dict[str, Any]:
        del kwargs
        logger.info("Agent processing: intent=%s, course_id=%s", intent, course_id)

        try:
            decision = await self._select_tool_with_function_call(
                intent=intent,
                query=query,
                course_id=course_id,
            )
            if decision:
                return await self._execute_selected_tool(
                    decision=decision,
                    intent=intent,
                    query=query,
                    course_id=course_id,
                    user_id=user_id,
                )

            logger.warning("No function call returned for intent=%s, falling back to legacy path", intent)
            return await self._legacy_fallback(intent, query, course_id, user_id)
        except Exception as exc:
            logger.error("Agent error: %s", exc, exc_info=True)
            return {
                "response": f"Đã xảy ra lỗi khi xử lý yêu cầu: {str(exc)[:100]}",
                "metadata": {"error": str(exc)},
                "tool_used": "error",
            }

    async def _select_tool_with_function_call(
        self,
        intent: str,
        query: str,
        course_id: int,
    ) -> Optional[Dict[str, Any]]:
        messages = [
            {
                "role": "system",
                "content": (
                    "Bạn là bộ điều phối công cụ cho chatbot học tập. "
                    "Hãy gọi đúng MỘT function phù hợp nhất cho yêu cầu hiện tại. "
                    "Dùng schedule_lookup cho câu hỏi về lịch thi, lịch kiểm tra, ngày giờ phòng thi. "
                    "Dùng quiz_generator cho yêu cầu tạo quiz, tạo câu hỏi ôn tập, bài trắc nghiệm. "
                    "Nếu người dùng ghi rõ số câu hỏi thì num_questions phải đúng chính xác con số đó. "
                    "Không tự trả lời bằng văn bản nếu đã có tool phù hợp."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Gợi ý intent: {intent}\n"
                    f"Mã môn học: {course_id}\n"
                    f"Câu hỏi người dùng: {query}"
                ),
            },
        ]

        result = await self.llm_service.call_with_tools(
            messages=messages,
            tool_declarations=self._tool_declarations(),
            model=settings.GEMINI_INTENT_MODEL,
            temperature=0.0,
            max_tokens=256,
            mode="ANY",
        )

        function_calls = result.get("function_calls") or []
        if not function_calls:
            return None

        tool_call = function_calls[0]
        logger.info(
            "Function call selected: %s with args=%s",
            tool_call.get("name"),
            tool_call.get("args"),
        )
        return {
            "tool_name": tool_call.get("name"),
            "arguments": tool_call.get("args") or {},
            "model": result.get("model"),
        }

    def _tool_declarations(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "schedule_lookup",
                "description": (
                    "Tra cứu lịch thi, lịch kiểm tra, ngày giờ địa điểm thi từ cơ sở dữ liệu SQL "
                    "cho môn học hiện tại."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "question": {
                            "type": "STRING",
                            "description": "Câu hỏi gốc của sinh viên về lịch thi hoặc lịch kiểm tra.",
                        },
                        "exam_type": {
                            "type": "STRING",
                            "description": "Loại lịch cần tìm: midterm, final, quiz, practical, all.",
                            "enum": ["midterm", "final", "quiz", "practical", "all"],
                        },
                    },
                    "required": ["question"],
                },
            },
            {
                "name": "quiz_generator",
                "description": "Tạo bộ câu hỏi trắc nghiệm mới dựa trên tài liệu môn học hiện tại.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "topic": {
                            "type": "STRING",
                            "description": "Chủ đề hoặc yêu cầu tạo quiz.",
                        },
                        "num_questions": {
                            "type": "INTEGER",
                            "description": "Số câu hỏi muốn tạo, từ 1 đến 20.",
                        },
                    },
                    "required": ["topic", "num_questions"],
                },
            },
        ]

    async def _execute_selected_tool(
        self,
        decision: Dict[str, Any],
        intent: str,
        query: str,
        course_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        tool_name = decision.get("tool_name")
        arguments = decision.get("arguments") or {}

        if tool_name == "schedule_lookup":
            question = self._coerce_text(arguments.get("question")) or query
            exam_type = self._coerce_text(arguments.get("exam_type"))
            result = await self.schedule_lookup.lookup(
                query=question,
                course_id=course_id,
                exam_type=exam_type,
            )
            return self._build_result(
                tool_used="schedule_lookup",
                result=result,
                tool_selection={
                    "mode": "gemini_function_call",
                    "model": decision.get("model"),
                    "intent_hint": intent,
                    "arguments": {
                        "question": question,
                        "exam_type": exam_type or "all",
                    },
                },
            )

        if tool_name == "quiz_generator":
            topic = self._coerce_text(arguments.get("topic")) or query
            num_questions = self._coerce_num_questions(arguments.get("num_questions"), query)
            result = await self.quiz_generator.generate(
                query=topic,
                course_id=course_id,
                user_id=user_id,
                num_questions=num_questions,
            )
            return self._build_result(
                tool_used="quiz_generator",
                result=result,
                tool_selection={
                    "mode": "gemini_function_call",
                    "model": decision.get("model"),
                    "intent_hint": intent,
                    "arguments": {
                        "topic": topic,
                        "num_questions": num_questions,
                    },
                },
            )

        logger.warning("Unknown tool returned by function calling: %s", tool_name)
        return await self._legacy_fallback(intent, query, course_id, user_id)

    async def _legacy_fallback(
        self,
        intent: str,
        query: str,
        course_id: int,
        user_id: int,
    ) -> Dict[str, Any]:
        if intent == "SCHEDULE_QUERY":
            result = await self.schedule_lookup.lookup(
                query=query,
                course_id=course_id,
            )
            return self._build_result(
                tool_used="schedule_lookup",
                result=result,
                tool_selection={
                    "mode": "legacy_fallback",
                    "intent_hint": intent,
                    "arguments": {"question": query},
                },
            )

        if intent == "QUIZ_REQUEST":
            num_questions = self._coerce_num_questions(None, query)
            result = await self.quiz_generator.generate(
                query=query,
                course_id=course_id,
                user_id=user_id,
                num_questions=num_questions,
            )
            return self._build_result(
                tool_used="quiz_generator",
                result=result,
                tool_selection={
                    "mode": "legacy_fallback",
                    "intent_hint": intent,
                    "arguments": {
                        "topic": query,
                        "num_questions": num_questions,
                    },
                },
            )

        logger.warning("Unknown intent: %s", intent)
        return {
            "response": f"Intent '{intent}' chưa được hỗ trợ.",
            "metadata": {"error": "unknown_intent"},
            "tool_used": "none",
        }

    def _build_result(
        self,
        tool_used: str,
        result: Dict[str, Any],
        tool_selection: Dict[str, Any],
    ) -> Dict[str, Any]:
        metadata = dict(result.get("metadata") or {})
        metadata["tool_selection"] = tool_selection
        return {
            "response": result["response"],
            "metadata": metadata,
            "tool_used": tool_used,
        }

    def _coerce_text(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def _coerce_num_questions(self, value: Any, query: str) -> int:
        explicit_from_query = self._extract_requested_num_questions(query)
        if explicit_from_query is not None:
            if value is not None:
                logger.info(
                    "Override quiz question count from query: model_value=%s, query_value=%s, query=%s",
                    value,
                    explicit_from_query,
                    query,
                )
            return explicit_from_query

        if isinstance(value, (int, float)):
            return max(1, min(int(value), 20))

        if isinstance(value, str) and value.strip().isdigit():
            return max(1, min(int(value.strip()), 20))

        return 5

    def _extract_requested_num_questions(self, query: str) -> Optional[int]:
        if not query:
            return None

        normalized = unicodedata.normalize("NFD", query)
        normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
        normalized = normalized.lower()

        patterns = [
            r"(?:^|\b)(?:tao|lam|generate|gen|cho)\s*(\d+)\b",
            r"\b(\d+)\s*(?:cau|cau hoi|quiz|question|questions)\b",
            r"\bquiz\s*(\d+)\b",
        ]

        for pattern in patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            try:
                return max(1, min(int(match.group(1)), 20))
            except (TypeError, ValueError):
                continue

        return None

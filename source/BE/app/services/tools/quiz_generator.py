"""
Quiz generator tool.
"""

import ast
import json
import logging
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.models.schedule import GeneratedQuiz
from app.services.llm_service import LLMService
from app.services.rag_service import bm25_search
from app.services.vector_service import get_vector_service

logger = logging.getLogger(__name__)


class QuizGenerator:
    """Generate quiz questions from course content."""

    RRF_K = 60

    def __init__(
        self,
        db: Session,
        llm_service: Optional[LLMService] = None,
        vector_service: Optional[Any] = None,
        embed_query_fn: Optional[Callable[[str], List[float]]] = None,
    ):
        self.db = db
        self.llm_service = llm_service or LLMService()
        self.embed_query_fn = embed_query_fn

        if vector_service is not None:
            self.vector_service = vector_service
        else:
            try:
                self.vector_service = get_vector_service()
            except Exception as exc:
                logger.warning("Vector service unavailable for quiz generation: %s", exc)
                self.vector_service = None

    async def generate(
        self,
        query: str,
        course_id: int,
        user_id: int,
        num_questions: int = 5,
    ) -> Dict[str, Any]:
        """Generate quiz questions from uploaded course documents."""
        try:
            logger.info("Retrieving content for quiz generation: course_id=%s", course_id)

            search_query = query.strip() if query and len(query.strip()) > 3 else "tổng hợp kiến thức"
            chunks, retrieval_debug = self._retrieve_source_chunks(
                search_query=search_query,
                course_id=course_id,
                top_k=10,
            )

            if not chunks:
                return {
                    "response": (
                        "📝 Không tìm thấy nội dung phù hợp để tạo quiz. "
                        "Vui lòng upload thêm tài liệu hoặc thử lại với chủ đề cụ thể hơn."
                    ),
                    "metadata": {
                        "quiz_id": None,
                        "questions": [],
                        "source_chunks": [],
                        "retrieval_debug": retrieval_debug,
                    },
                }

            logger.info("Generating %s quiz questions", num_questions)
            questions, generation_debug = await self._generate_questions_llm(
                chunks=chunks,
                num_questions=num_questions,
            )

            if not questions:
                return {
                    "response": (
                        "⚠️ Không thể tạo câu hỏi từ nội dung hiện có. "
                        "Vui lòng thử lại sau."
                    ),
                    "metadata": {
                        "quiz_id": None,
                        "questions": [],
                        "source_chunks": [c["chunk_id"] for c in chunks],
                        "generation_debug": generation_debug,
                        "retrieval_debug": retrieval_debug,
                    },
                }

            quiz_title = f"Quiz tự động - {search_query[:50]}"
            source_chunk_ids = [c["chunk_id"] for c in chunks]

            quiz = GeneratedQuiz(
                course_id=course_id,
                user_id=user_id,
                title=quiz_title,
                questions=questions,
                source_chunks=source_chunk_ids,
                is_ai_generated=1,
            )
            self.db.add(quiz)
            self.db.commit()
            self.db.refresh(quiz)

            logger.info("Quiz saved: id=%s, questions=%s", quiz.id, len(questions))
            return {
                "response": self._format_quiz_response(questions, quiz.id),
                "metadata": {
                    "quiz_id": quiz.id,
                    "quiz_title": quiz.title,
                    "question_count": len(questions),
                    "questions": questions,
                    "source_chunks": source_chunk_ids,
                    "generation_debug": generation_debug,
                    "retrieval_debug": retrieval_debug,
                },
            }

        except Exception as exc:
            logger.error("Quiz generation error: %s", exc, exc_info=True)
            return {
                "response": "⚠️ Đã xảy ra lỗi khi tạo quiz. Vui lòng thử lại sau.",
                "metadata": {
                    "error": str(exc),
                    "quiz_id": None,
                    "questions": [],
                    "source_chunks": [],
                },
            }

    def _retrieve_source_chunks(
        self,
        search_query: str,
        course_id: int,
        top_k: int,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        retrieval_debug: Dict[str, Any] = {
            "strategy": None,
            "chunk_count": 0,
            "vector_count": 0,
            "bm25_count": 0,
            "warnings": [],
        }

        vector_chunks: List[Dict[str, Any]] = []
        if self.vector_service:
            try:
                query_embedding = self._embed_query(search_query)
                vector_chunks = self.vector_service.search(
                    query_embedding=query_embedding,
                    course_id=course_id,
                    top_k=max(top_k * 2, 10),
                )
                retrieval_debug["vector_count"] = len(vector_chunks)
                if not vector_chunks:
                    retrieval_debug["warnings"].append("vector_search_empty")
            except Exception as exc:
                logger.warning("Vector search failed for quiz generation: %s", exc)
                retrieval_debug["warnings"].append(f"vector_search_failed:{str(exc)[:160]}")
        else:
            retrieval_debug["warnings"].append("vector_service_unavailable")

        try:
            bm25_chunks = self._keyword_search_chunks(
                search_query=search_query,
                course_id=course_id,
                top_k=max(top_k * 2, 10),
            )
            retrieval_debug["bm25_count"] = len(bm25_chunks)
            if not bm25_chunks:
                retrieval_debug["warnings"].append("bm25_empty")
        except Exception as exc:
            logger.warning("BM25 fallback failed for quiz generation: %s", exc)
            retrieval_debug["warnings"].append(f"bm25_failed:{str(exc)[:160]}")
            bm25_chunks = []

        if vector_chunks and bm25_chunks:
            chunks = self._rrf_fusion_chunks(
                vector_chunks=vector_chunks,
                bm25_chunks=bm25_chunks,
                top_k=top_k,
            )
            retrieval_debug["strategy"] = "hybrid_rrf"
            retrieval_debug["chunk_count"] = len(chunks)
            return chunks, retrieval_debug

        if vector_chunks:
            chunks = vector_chunks[:top_k]
            retrieval_debug["strategy"] = "vector_search"
            retrieval_debug["chunk_count"] = len(chunks)
            return chunks, retrieval_debug

        if bm25_chunks:
            chunks = bm25_chunks[:top_k]
            retrieval_debug["strategy"] = "bm25_fallback"
            retrieval_debug["chunk_count"] = len(chunks)
            return chunks, retrieval_debug

        chunks = self._recent_course_chunks(course_id, top_k)
        if chunks:
            retrieval_debug["strategy"] = "recent_chunks_fallback"
            retrieval_debug["chunk_count"] = len(chunks)
            return chunks, retrieval_debug

        retrieval_debug["strategy"] = "no_content"
        return [], retrieval_debug

    def _rrf_fusion_chunks(
        self,
        vector_chunks: List[Dict[str, Any]],
        bm25_chunks: List[Dict[str, Any]],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        scores: Dict[str, float] = {}
        chunk_map: Dict[str, Dict[str, Any]] = {}

        for rank, chunk in enumerate(vector_chunks, 1):
            key = str(chunk["chunk_id"])
            scores[key] = scores.get(key, 0.0) + 0.6 / (self.RRF_K + rank)
            chunk_map[key] = self._clone_chunk(chunk)
            chunk_map[key]["metadata"]["retrieval_source"] = "vector"

        for rank, chunk in enumerate(bm25_chunks, 1):
            key = str(chunk["chunk_id"])
            scores[key] = scores.get(key, 0.0) + 0.4 / (self.RRF_K + rank)
            if key not in chunk_map:
                chunk_map[key] = self._clone_chunk(chunk)
                chunk_map[key]["metadata"]["retrieval_source"] = "bm25"
            else:
                chunk_map[key]["metadata"]["retrieval_source"] = "hybrid"

        ranked_chunks: List[Dict[str, Any]] = []
        for key, score in sorted(scores.items(), key=lambda item: item[1], reverse=True):
            chunk = chunk_map[key]
            chunk["score"] = score
            ranked_chunks.append(chunk)

        return ranked_chunks[:top_k]

    def _clone_chunk(self, chunk: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "chunk_id": chunk["chunk_id"],
            "content": chunk["content"],
            "score": chunk.get("score", 0.0),
            "metadata": dict(chunk.get("metadata") or {}),
        }

    def _embed_query(self, query: str) -> List[float]:
        if self.embed_query_fn is not None:
            return self.embed_query_fn(query)

        from app.services.rag_service import _embed_query

        return _embed_query(query)

    def _keyword_search_chunks(
        self,
        search_query: str,
        course_id: int,
        top_k: int,
    ) -> List[Dict[str, Any]]:
        db_chunks = (
            self.db.query(DocumentChunk)
            .join(Document)
            .filter(Document.course_id == course_id)
            .all()
        )
        if not db_chunks:
            return []

        matches = bm25_search(search_query, db_chunks, top_k=top_k)
        return [
            {
                "chunk_id": match.chunk_id,
                "content": match.content,
                "score": match.score,
                "metadata": {
                    "document_id": match.document_id,
                    "page_number": match.page_number,
                    "filename": match.document_title,
                },
            }
            for match in matches
        ]

    def _recent_course_chunks(
        self,
        course_id: int,
        top_k: int,
    ) -> List[Dict[str, Any]]:
        db_chunks = (
            self.db.query(DocumentChunk)
            .join(Document)
            .filter(Document.course_id == course_id)
            .order_by(DocumentChunk.id.asc())
            .limit(top_k)
            .all()
        )

        return [
            {
                "chunk_id": chunk.id,
                "content": chunk.content,
                "score": 0.0,
                "metadata": {
                    "document_id": chunk.document_id,
                    "page_number": chunk.page_number,
                    "filename": chunk.document.filename if chunk.document else "",
                },
            }
            for chunk in db_chunks
        ]

    async def _generate_questions_llm(
        self,
        chunks: List[Dict[str, Any]],
        num_questions: int,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Prefer function-calling output, then fall back to JSON/text parsing."""
        use_chunks = min(len(chunks), max(5, num_questions))
        context_parts = []
        for index, chunk in enumerate(chunks[:use_chunks], 1):
            context_parts.append(f"[Đoạn {index}]\n{chunk['content']}\n")
        context = "\n".join(context_parts)

        last_debug: Dict[str, Any] = {
            "strategy": None,
            "error": None,
            "raw_preview": None,
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                function_result = await self._generate_questions_with_function_call(
                    context=context,
                    num_questions=num_questions,
                )
                if function_result:
                    questions = self._normalize_questions(function_result)
                    if len(questions) >= num_questions:
                        return questions[:num_questions], {
                            "strategy": "gemini_function_call",
                            "attempt": attempt + 1,
                            "generated_count": len(questions),
                        }
                    last_debug = {
                        "strategy": "gemini_function_call",
                        "attempt": attempt + 1,
                        "error": f"Model returned {len(questions)}/{num_questions} valid questions",
                    }

                text_result = await self._generate_questions_with_text(context, num_questions)
                raw_content = text_result["content"].strip()
                questions = self._parse_questions_from_response(raw_content)
                if len(questions) >= num_questions:
                    return questions[:num_questions], {
                        "strategy": text_result["strategy"],
                        "attempt": attempt + 1,
                        "generated_count": len(questions),
                        "raw_preview": raw_content[:400],
                    }

                last_debug = {
                    "strategy": text_result["strategy"],
                    "attempt": attempt + 1,
                    "error": f"Only parsed {len(questions)}/{num_questions} questions",
                    "raw_preview": raw_content[:400],
                }
                logger.warning(
                    "Quiz generation attempt %s parsed only %s/%s questions",
                    attempt + 1,
                    len(questions),
                    num_questions,
                )
            except Exception as exc:
                error_str = str(exc)
                last_debug = {
                    "strategy": "exception",
                    "attempt": attempt + 1,
                    "error": error_str[:300],
                }
                is_retryable = any(code in error_str for code in ["503", "429", "500", "overloaded"])
                if is_retryable and attempt < max_retries - 1:
                    import asyncio

                    wait_time = 2 ** (attempt + 1)
                    logger.warning(
                        "Quiz LLM attempt %s failed (%s), retrying in %ss...",
                        attempt + 1,
                        error_str[:80],
                        wait_time,
                    )
                    await asyncio.sleep(wait_time)
                    continue

                logger.error("LLM question generation error: %s", exc, exc_info=True)

        return [], last_debug

    async def _generate_questions_with_function_call(
        self,
        context: str,
        num_questions: int,
    ) -> List[Dict[str, Any]]:
        messages = [
            {
                "role": "system",
                "content": (
                    "Bạn là hệ thống tạo câu hỏi trắc nghiệm tự động. "
                    f"Hãy tạo đúng {num_questions} câu hỏi từ tài liệu được cung cấp. "
                    "Chỉ dùng thông tin có trong tài liệu. "
                    "Mỗi câu hỏi phải có 4 đáp án A, B, C, D và đúng 1 đáp án đúng."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Nội dung học tập:\n{context}\n\n"
                    f"Hãy tạo đúng {num_questions} câu hỏi trắc nghiệm từ nội dung trên."
                ),
            },
        ]

        result = await self.llm_service.call_with_tools(
            messages=messages,
            tool_declarations=[self._quiz_function_declaration()],
            temperature=0.2,
            max_tokens=max(3000, num_questions * 500),
            mode="ANY",
            allowed_function_names=["submit_quiz_questions"],
        )

        function_calls = result.get("function_calls") or []
        for function_call in function_calls:
            if function_call.get("name") == "submit_quiz_questions":
                args = function_call.get("args") or {}
                questions = args.get("questions") or []
                logger.info("Quiz function call returned %s questions", len(questions))
                return questions

        return []

    async def _generate_questions_with_text(
        self,
        context: str,
        num_questions: int,
    ) -> Dict[str, str]:
        prompt = f"""Dựa trên nội dung học tập dưới đây, hãy tạo CHÍNH XÁC {num_questions} câu hỏi trắc nghiệm.

Nội dung:
{context}

Yêu cầu:
- Bắt buộc tạo đúng {num_questions} câu hỏi, không nhiều hơn không ít hơn.
- Mỗi câu hỏi có 4 đáp án A, B, C, D.
- Chỉ có 1 đáp án đúng.
- Trả về JSON hợp lệ theo đúng schema sau:
{{
  "questions": [
    {{
      "question": "Nội dung câu hỏi",
      "options": {{
        "A": "Đáp án A",
        "B": "Đáp án B",
        "C": "Đáp án C",
        "D": "Đáp án D"
      }},
      "correct_answer": "A",
      "explanation": "Giải thích ngắn"
    }}
  ]
}}

Chỉ trả về JSON, không thêm markdown hay giải thích bên ngoài."""

        result = await self.llm_service.chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Bạn là hệ thống tạo câu hỏi trắc nghiệm tự động. "
                        "Trả về JSON hợp lệ, không thêm markdown."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=max(2500, num_questions * 450),
        )
        return {
            "strategy": "json_text_completion",
            "content": result["content"],
        }

    def _quiz_function_declaration(self) -> Dict[str, Any]:
        return {
            "name": "submit_quiz_questions",
            "description": "Trả về danh sách câu hỏi trắc nghiệm đã được tạo từ tài liệu.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "questions": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "question": {"type": "STRING"},
                                "option_a": {"type": "STRING"},
                                "option_b": {"type": "STRING"},
                                "option_c": {"type": "STRING"},
                                "option_d": {"type": "STRING"},
                                "correct_answer": {
                                    "type": "STRING",
                                    "enum": ["A", "B", "C", "D"],
                                },
                                "explanation": {"type": "STRING"},
                            },
                            "required": [
                                "question",
                                "option_a",
                                "option_b",
                                "option_c",
                                "option_d",
                                "correct_answer",
                            ],
                        },
                    }
                },
                "required": ["questions"],
            },
        }

    def _normalize_questions(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for raw in questions:
            question = str(raw.get("question", "")).strip()
            correct_answer = self._normalize_correct_answer(raw.get("correct_answer"))
            explanation = str(raw.get("explanation", "")).strip()

            options = raw.get("options")
            if isinstance(options, dict):
                normalized_options = self._normalize_options_dict(options)
            elif isinstance(options, list):
                normalized_options = self._normalize_options_list(options)
            else:
                normalized_options = {
                    "A": str(raw.get("option_a", "")).strip(),
                    "B": str(raw.get("option_b", "")).strip(),
                    "C": str(raw.get("option_c", "")).strip(),
                    "D": str(raw.get("option_d", "")).strip(),
                }
                normalized_options = {
                    key: value for key, value in normalized_options.items() if value
                }

            if correct_answer not in normalized_options:
                correct_answer = self._infer_correct_answer(correct_answer, normalized_options)

            if question and len(normalized_options) == 4 and correct_answer in normalized_options:
                normalized.append({
                    "question": question,
                    "options": normalized_options,
                    "correct_answer": correct_answer,
                    "explanation": explanation,
                })

        return normalized

    def _parse_questions_from_response(self, text: str) -> List[Dict[str, Any]]:
        json_questions = self._parse_json_questions(text)
        if json_questions:
            return json_questions
        return self._parse_text_questions(text)

    def _parse_json_questions(self, text: str) -> List[Dict[str, Any]]:
        candidates = self._json_candidates(text)

        for candidate in candidates:
            if not candidate:
                continue

            payload = self._load_json_candidate(candidate)
            if payload is None:
                continue

            if isinstance(payload, dict):
                raw_questions = payload.get("questions") or []
            elif isinstance(payload, list):
                raw_questions = payload
            else:
                raw_questions = []

            questions = self._normalize_questions(raw_questions)
            if questions:
                logger.info("Parsed %s questions from JSON response", len(questions))
                return questions

        return []

    def _json_candidates(self, text: str) -> List[str]:
        candidates: List[str] = []
        stripped = text.strip()
        if stripped:
            candidates.append(stripped)

        fence_matches = re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
        for match in fence_matches:
            candidate = match.strip()
            if candidate and candidate not in candidates:
                candidates.insert(0, candidate)

        balanced = self._extract_balanced_json(text)
        if balanced and balanced not in candidates:
            candidates.append(balanced)

        return candidates

    def _extract_balanced_json(self, text: str) -> Optional[str]:
        start = -1
        stack: List[str] = []
        in_string = False
        escape = False

        for index, char in enumerate(text):
            if escape:
                escape = False
                continue
            if char == "\\":
                escape = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if char in "{[":
                if start == -1:
                    start = index
                stack.append(char)
            elif char in "}]":
                if not stack:
                    continue
                opening = stack.pop()
                if (opening == "{" and char != "}") or (opening == "[" and char != "]"):
                    return None
                if start != -1 and not stack:
                    return text[start:index + 1].strip()

        return None

    def _load_json_candidate(self, candidate: str) -> Optional[Any]:
        normalized = candidate.strip().lstrip("\ufeff")
        if not normalized:
            return None

        attempts = [normalized]
        sanitized = normalized.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
        if sanitized not in attempts:
            attempts.append(sanitized)

        trailing_comma_fixed = re.sub(r",(\s*[}\]])", r"\1", sanitized)
        if trailing_comma_fixed not in attempts:
            attempts.append(trailing_comma_fixed)

        for attempt in attempts:
            try:
                return json.loads(attempt)
            except json.JSONDecodeError:
                continue

        try:
            return ast.literal_eval(trailing_comma_fixed)
        except (SyntaxError, ValueError):
            return None

    def _normalize_options_dict(self, options: Dict[str, Any]) -> Dict[str, str]:
        normalized: Dict[str, str] = {}
        fallback_values: List[str] = []

        for raw_key, raw_value in options.items():
            value = str(raw_value).strip()
            if not value:
                continue
            key = str(raw_key).strip().upper()
            match = re.match(r"([A-D])", key)
            if match:
                normalized[match.group(1)] = value
            else:
                fallback_values.append(value)

        if len(normalized) == 4:
            return normalized

        for index, value in enumerate(fallback_values[:4]):
            normalized.setdefault(chr(ord("A") + index), value)

        return {key: value for key, value in normalized.items() if key in {"A", "B", "C", "D"}}

    def _normalize_options_list(self, options: List[Any]) -> Dict[str, str]:
        normalized: Dict[str, str] = {}
        for index, raw_option in enumerate(options[:4]):
            key = chr(ord("A") + index)
            if isinstance(raw_option, dict):
                value = raw_option.get("text") or raw_option.get("value") or raw_option.get("option")
            else:
                value = raw_option
            value_text = str(value).strip() if value is not None else ""
            if value_text:
                normalized[key] = value_text
        return normalized

    def _normalize_correct_answer(self, raw_answer: Any) -> str:
        if raw_answer is None:
            return ""

        if isinstance(raw_answer, (int, float)):
            index = int(raw_answer) - 1
            if 0 <= index < 4:
                return chr(ord("A") + index)

        answer_text = str(raw_answer).strip()
        if not answer_text:
            return ""

        upper_text = answer_text.upper()
        if upper_text in {"A", "B", "C", "D"}:
            return upper_text

        match = re.search(r"\b([A-D])\b", upper_text)
        if match:
            return match.group(1)

        return answer_text

    def _infer_correct_answer(self, correct_answer: str, options: Dict[str, str]) -> str:
        if not correct_answer:
            return ""

        answer_text = correct_answer.strip().lower()
        for key, value in options.items():
            option_text = value.strip().lower()
            if answer_text == option_text:
                return key
            if answer_text.endswith(option_text):
                return key
            if option_text.startswith(answer_text):
                return key

        return ""

    def _parse_text_questions(self, text: str) -> List[Dict[str, Any]]:
        questions = []
        question_blocks = re.split(
            r"(?:(?:QUESTION|CÂU HỎI|CÂU|Question|Câu hỏi|Câu)\s*\d+\s*[:\.\-]|^\s*\d+\s*[\.\:\)])",
            text,
            flags=re.IGNORECASE | re.MULTILINE,
        )[1:]

        if not question_blocks:
            logger.warning("Failed to split any blocks from LLM raw text: %s...", text[:200])
            return []

        for index, block in enumerate(question_blocks, 1):
            try:
                question_match = re.search(r"^(.+?)(?=\n\s*[A-D][\)\.\:])", block, re.DOTALL)
                if not question_match:
                    logger.warning("Quiz parse: block %s - no question text found", index)
                    continue
                question_text = question_match.group(1).strip()

                options = {}
                for letter in ["A", "B", "C", "D"]:
                    option_match = re.search(
                        rf"{letter}\s*[\)\.\:]\s*(.+?)(?=\n\s*[A-D]\s*[\)\.\:]|ANSWER|Đáp án|Giải thích|EXPLAIN|$)",
                        block,
                        re.DOTALL | re.IGNORECASE,
                    )
                    if option_match:
                        options[letter] = option_match.group(1).strip()

                answer_match = re.search(
                    r"(?:ANSWER|Đáp án|Correct)[^\n:]*?[:\.\-]?\s*([A-D])\b",
                    block,
                    re.IGNORECASE,
                )
                if not answer_match:
                    logger.warning("Quiz parse: block %s - no answer found", index)
                    continue
                correct_answer = answer_match.group(1).upper()

                explain_match = re.search(
                    r"(?:EXPLAIN|Giải thích)\s*[:\.]?\s*(.+?)(?=QUESTION|Câu hỏi|Câu|CÂU|\Z)",
                    block,
                    re.DOTALL | re.IGNORECASE,
                )
                explanation = explain_match.group(1).strip() if explain_match else ""

                if question_text and len(options) == 4 and correct_answer in options:
                    questions.append({
                        "question": question_text,
                        "options": options,
                        "correct_answer": correct_answer,
                        "explanation": explanation,
                    })
                else:
                    logger.warning(
                        "Quiz parse: block %s - validation failed (opts=%s, ans=%s)",
                        index,
                        len(options),
                        correct_answer,
                    )
            except Exception as exc:
                logger.warning("Failed to parse question block %s: %s", index, exc)

        logger.info("Parsed %s valid questions from %s blocks", len(questions), len(question_blocks))
        return questions

    def _format_quiz_response(self, questions: List[Dict[str, Any]], quiz_id: int) -> str:
        del quiz_id
        return (
            f"📝 **Quiz đã được tạo thành công với {len(questions)} câu hỏi!**\n\n"
            "Bấm nút **\"Làm quiz ngay\"** bên dưới để bắt đầu. "
            "Bạn cũng có thể vào trang **Quiz** để xem lại sau."
        )

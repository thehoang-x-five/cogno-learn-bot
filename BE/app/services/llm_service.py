import json
import logging
import random
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """
    Gemini LLM service with retry logic and optional function calling.
    """

    def __init__(
        self,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.model = model or settings.GEMINI_MODEL
        self.gemini_model = self.model
        self.gemini_base_url = base_url or settings.GEMINI_BASE_URL
        self.provider = "gemini"

        if api_key:
            self.gemini_api_keys = [key.strip() for key in api_key.split(",") if key.strip()]
        else:
            api_key_str = settings.GEMINI_API_KEY or ""
            self.gemini_api_keys = [key.strip() for key in api_key_str.split(",") if key.strip()]

        if self.gemini_api_keys:
            random.shuffle(self.gemini_api_keys)
        self.current_key_index = 0

        logger.info("LLMService initialized - Gemini keys: %s", len(self.gemini_api_keys))

    def _get_next_gemini_key(self) -> Optional[str]:
        if not self.gemini_api_keys:
            return None
        key = self.gemini_api_keys[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.gemini_api_keys)
        return key

    def _default_safety_settings(self) -> List[Dict[str, str]]:
        return [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
        ]

    def _messages_to_gemini_components(
        self,
        messages: List[Dict[str, str]],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        system_text = ""
        contents: List[Dict[str, Any]] = []

        for message in messages:
            role = message["role"]
            text = message["content"]

            if role == "system":
                system_text += text + "\n"
                continue

            gemini_role = "model" if role == "assistant" else "user"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": text}],
            })

        return system_text, contents

    async def _gemini_generate_payload(
        self,
        use_model: str,
        payload: Dict[str, Any],
        timeout: float = 60.0,
    ) -> Dict[str, Any]:
        max_retries = len(self.gemini_api_keys)
        if max_retries == 0:
            raise Exception("No Gemini API keys available")

        last_error = None
        for attempt in range(max_retries):
            api_key = self._get_next_gemini_key()
            if not api_key:
                raise Exception("No Gemini API keys available")

            masked_key = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else "***"
            url = f"{self.gemini_base_url}/models/{use_model}:generateContent?key={api_key}"

            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=payload, timeout=timeout)
                    response.raise_for_status()
                    data = response.json()

                if attempt > 0:
                    logger.info("Success with key %s after %s retries", masked_key, attempt)
                return data
            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code in (429, 503):
                    reason = "Rate limit" if exc.response.status_code == 429 else "Service unavailable"
                    logger.warning(
                        "%s with key %s (attempt %s/%s)",
                        reason,
                        masked_key,
                        attempt + 1,
                        max_retries,
                    )
                    if attempt == max_retries - 1:
                        raise Exception(
                            f"All {max_retries} Gemini API keys failed ({reason}). "
                            "Please wait 1-2 minutes or add more API keys."
                        )
                    continue
                raise
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Gemini generateContent error with key %s: %s",
                    masked_key,
                    str(exc)[:100],
                )
                if attempt == max_retries - 1:
                    raise

        if last_error:
            raise last_error
        raise Exception("All Gemini generateContent retries failed")

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        return await self._gemini_chat_completion(messages, model, temperature, max_tokens)

    async def _gemini_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        use_model = model or self.gemini_model
        payload = self._build_gemini_payload(messages, temperature, max_tokens)
        data = await self._gemini_generate_payload(
            use_model=use_model,
            payload=payload,
            timeout=60.0,
        )

        content = ""
        if data.get("candidates"):
            parts = data["candidates"][0].get("content", {}).get("parts", [])
            content = "".join(part.get("text", "") for part in parts)

        usage = data.get("usageMetadata", {})
        return {
            "content": content,
            "model": use_model,
            "tokens_used": usage.get("totalTokenCount", 0),
            "prompt_tokens": usage.get("promptTokenCount", 0),
            "completion_tokens": usage.get("candidatesTokenCount", 0),
        }

    async def call_with_tools(
        self,
        messages: List[Dict[str, str]],
        tool_declarations: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        mode: str = "ANY",
        allowed_function_names: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        use_model = model or self.gemini_model
        payload = self._build_gemini_payload(messages, temperature, max_tokens)
        payload["tools"] = [{"functionDeclarations": tool_declarations}]
        payload["toolConfig"] = {
            "functionCallingConfig": {
                "mode": mode,
            }
        }
        if allowed_function_names:
            payload["toolConfig"]["functionCallingConfig"]["allowedFunctionNames"] = allowed_function_names

        data = await self._gemini_generate_payload(
            use_model=use_model,
            payload=payload,
            timeout=60.0,
        )

        parts = []
        if data.get("candidates"):
            parts = data["candidates"][0].get("content", {}).get("parts", [])

        function_calls = []
        text_parts = []
        for part in parts:
            if "text" in part:
                text_parts.append(part.get("text", ""))
            if "functionCall" in part:
                function_call = part["functionCall"] or {}
                function_calls.append({
                    "name": function_call.get("name"),
                    "args": function_call.get("args") or {},
                })

        usage = data.get("usageMetadata", {})
        return {
            "content": "".join(text_parts).strip(),
            "function_calls": function_calls,
            "parts": parts,
            "model": use_model,
            "tokens_used": usage.get("totalTokenCount", 0),
            "prompt_tokens": usage.get("promptTokenCount", 0),
            "completion_tokens": usage.get("candidatesTokenCount", 0),
        }

    async def generate_title(self, query: str) -> str:
        messages = [{
            "role": "user",
            "content": (
                "Dựa vào tin nhắn sau, hãy tạo một tiêu đề siêu ngắn "
                "(tối đa 3-5 từ) đại diện cho chủ đề cuộc trò chuyện. "
                f"Chỉ trả về tiêu đề, không giải thích. Tin nhắn: '{query}'"
            ),
        }]

        try:
            result = await self.chat_completion(messages, max_tokens=20, temperature=0.5)
            title = result["content"].strip(' "\'.')
            return title if title else "Cuộc trò chuyện mới"
        except Exception as exc:
            logger.warning("Error generating title: %s", exc)
            return query[:50] + ("..." if len(query) > 50 else "")

    async def generate_title_from_history(self, history: List[Dict[str, str]]) -> Optional[str]:
        recent = history[-6:] if len(history) > 6 else history
        context = "\n".join(
            [f"{'User' if msg['role'] == 'user' else 'Bot'}: {msg['content'][:100]}" for msg in recent]
        )

        messages = [{
            "role": "user",
            "content": (
                "Dựa vào các tin nhắn sau, hãy tạo tiêu đề ngắn gọn (3-6 từ) mô tả "
                "chủ đề chính của cuộc trò chuyện. Chỉ trả về tiêu đề, không giải thích.\n\n"
                f"{context}"
            ),
        }]

        try:
            result = await self.chat_completion(messages, max_tokens=25, temperature=0.5)
            title = result["content"].strip(' "\'.')
            return title if title else None
        except Exception as exc:
            logger.warning("Error generating title from history: %s", exc)
            return None

    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        use_model = model or self.gemini_model
        async for token in self._gemini_stream_completion(messages, use_model, temperature, max_tokens):
            yield token

    async def _gemini_stream_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        use_model = model or self.gemini_model
        payload = self._build_gemini_payload(messages, temperature, max_tokens)

        max_retries = len(self.gemini_api_keys)
        last_error = None
        for attempt in range(max_retries):
            api_key = self._get_next_gemini_key()
            if not api_key:
                raise Exception("No Gemini API keys available")

            masked_key = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else "***"
            url = (
                f"{self.gemini_base_url}/models/{use_model}:streamGenerateContent"
                f"?key={api_key}&alt=sse"
            )

            try:
                async with httpx.AsyncClient() as client:
                    async with client.stream("POST", url, json=payload, timeout=120.0) as response:
                        response.raise_for_status()
                        has_yielded = False
                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            data_str = line[6:].strip()
                            if not data_str or data_str == "[DONE]":
                                continue
                            try:
                                chunk = json.loads(data_str)
                                candidates = chunk.get("candidates", [])
                                if not candidates:
                                    continue
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        has_yielded = True
                                        yield text
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

                        if has_yielded:
                            if attempt > 0:
                                logger.info("Stream success with key %s after %s retries", masked_key, attempt)
                            return
            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code in (429, 503):
                    reason = "Rate limit" if exc.response.status_code == 429 else "Service unavailable"
                    logger.warning(
                        "%s on stream with key %s (attempt %s/%s)",
                        reason,
                        masked_key,
                        attempt + 1,
                        max_retries,
                    )
                    if attempt == max_retries - 1:
                        raise Exception(
                            f"All {max_retries} Gemini API keys failed ({reason}). "
                            "Please wait 1-2 minutes or add more API keys."
                        )
                    continue
                if exc.response.status_code >= 500 and attempt < max_retries - 1:
                    import asyncio

                    await asyncio.sleep(1)
                    continue
                raise
            except (httpx.ConnectError, httpx.ReadTimeout) as exc:
                last_error = exc
                logger.warning("Gemini connection error on attempt %s: %s", attempt + 1, exc)
                if attempt < max_retries - 1:
                    continue
                raise
            except Exception as exc:
                last_error = exc
                logger.warning("Stream error with key %s: %s", masked_key, str(exc)[:100])
                if attempt == max_retries - 1:
                    raise

        if last_error:
            raise last_error
        raise Exception("All Gemini streaming retries failed")

    def _build_gemini_payload(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> Dict[str, Any]:
        system_text, contents = self._messages_to_gemini_components(messages)
        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
            "safetySettings": self._default_safety_settings(),
        }

        if system_text.strip():
            payload["systemInstruction"] = {
                "parts": [{"text": system_text.strip()}],
            }

        return payload


def get_llm_service(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> LLMService:
    return LLMService(model=model, api_key=api_key, base_url=base_url)

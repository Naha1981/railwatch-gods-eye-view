from __future__ import annotations

import asyncio
import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class NahaLLMConfig:
    base_url: str
    api_key: str
    model: str = "balanced"
    timeout_seconds: float = 20.0

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.api_key)


def get_config() -> NahaLLMConfig:
    return NahaLLMConfig(
        base_url=os.getenv("NAHALLM_URL", "").rstrip("/"),
        api_key=os.getenv("NAHALLM_API_KEY", ""),
        model=os.getenv("NAHALLM_MODEL", "balanced"),
        timeout_seconds=float(os.getenv("NAHALLM_TIMEOUT_SECONDS", "20")),
    )


class NahaLLMError(RuntimeError):
    pass


_FAILURES = 0
_OPEN_UNTIL = 0.0
_MAX_RESPONSE_BYTES = 512_000


def _record_failure() -> None:
    global _FAILURES, _OPEN_UNTIL
    _FAILURES += 1
    if _FAILURES >= 5:
        _OPEN_UNTIL = time.monotonic() + 30


def _record_success() -> None:
    global _FAILURES, _OPEN_UNTIL
    _FAILURES = 0
    _OPEN_UNTIL = 0.0


async def chat(messages: list[dict[str, str]], *, model: str | None = None) -> dict[str, Any]:
    config = get_config()
    if not config.configured:
        raise NahaLLMError("NahaLLM is not configured")

    if time.monotonic() < _OPEN_UNTIL:
        raise NahaLLMError('NahaLLM circuit breaker is open; retry shortly')

    payload = json.dumps({
        "model": model or config.model,
        "messages": messages,
        "stream": False,
        "temperature": 0.2,
        "max_tokens": 800,
    }).encode("utf-8")

    def call() -> dict[str, Any]:
        request = urllib.request.Request(
            f"{config.base_url}/v1/chat/completions",
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=min(max(config.timeout_seconds, 3.0), 30.0)) as response:
                    body = response.read(_MAX_RESPONSE_BYTES + 1)
                    if len(body) > _MAX_RESPONSE_BYTES:
                        raise NahaLLMError('NahaLLM response exceeded size limit')
                    parsed = json.loads(body.decode('utf-8'))
                    _record_success()
                    return parsed
            except urllib.error.HTTPError as exc:
                retryable = exc.code == 429 or 500 <= exc.code < 600
                if retryable and attempt < 2:
                    time.sleep(0.5 * (2 ** attempt))
                    continue
                _record_failure()
                raise NahaLLMError(f'NahaLLM upstream error ({exc.code})') from exc
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, NahaLLMError) as exc:
                if isinstance(exc, NahaLLMError):
                    _record_failure()
                    raise
                if attempt < 2:
                    time.sleep(0.5 * (2 ** attempt))
                    continue
                _record_failure()
                raise NahaLLMError('NahaLLM request failed') from exc
        _record_failure()
        raise NahaLLMError('NahaLLM request failed')

    return await asyncio.to_thread(call)


def extract_text(response: dict[str, Any]) -> str:
    choices = response.get("choices") or []
    if not choices:
        raise NahaLLMError("NahaLLM returned no choices")
    content = choices[0].get("message", {}).get("content", "")
    if not isinstance(content, str) or not content.strip():
        raise NahaLLMError("NahaLLM returned empty content")
    return content.strip()

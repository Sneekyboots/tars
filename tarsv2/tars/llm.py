"""
LM Studio Native API client
============================
Uses LM Studio's own /api/v1/chat endpoint — not the OpenAI-compat layer.

Key differences from OpenAI schema:
  - `input`                instead of `messages`
  - `system_prompt`        instead of a system role message
  - `previous_response_id` for stateful multi-turn conversation
  - Response: `output[].content` instead of `choices[0].message.content`
"""

from __future__ import annotations

import json
from typing import Generator
from urllib.parse import urlparse

import requests

from tars.config import Config

_TIMEOUT = 120


class LMStudio:
    def __init__(self, config: Config) -> None:
        self.config = config
        base = _base_url(config.lm_studio_url)
        self._endpoint = f"{base}/api/v1/chat"
        self._headers = {"Content-Type": "application/json"}
        if config.api_key:
            self._headers["Authorization"] = f"Bearer {config.api_key}"
        # Populated after each streaming turn — used by the agent
        self.last_response_id: str | None = None

    # ── public API ────────────────────────────────────────────────────────────

    def chat(
        self,
        user_input: str,
        system_prompt: str = "",
        previous_response_id: str | None = None,
    ) -> Generator[str, None, None]:
        """
        Stream one conversation turn. Yields text tokens as they arrive.
        After the generator is exhausted, self.last_response_id holds the
        response_id to pass into the next turn.
        """
        payload: dict = {
            "model": self.config.model,
            "input": user_input,
            "temperature": self.config.temperature,
            "stream": True,
            "store": True,
        }
        if system_prompt:
            payload["system_prompt"] = system_prompt
        if previous_response_id:
            payload["previous_response_id"] = previous_response_id

        with requests.post(
            self._endpoint,
            headers=self._headers,
            json=payload,
            stream=True,
            timeout=_TIMEOUT,
        ) as resp:
            resp.raise_for_status()
            for raw in resp.iter_lines():
                if not raw:
                    continue
                line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue

                # Capture response_id when it arrives (usually in final chunk)
                if "response_id" in chunk:
                    self.last_response_id = chunk["response_id"]

                token = _extract_token(chunk)
                if token:
                    yield token

    def complete(self, messages: list[dict]) -> str:
        """
        Non-streaming one-shot completion for internal tasks
        (memory extraction, fingerprinting, onboarding synthesis).
        Does NOT store the conversation in LM Studio.
        """
        system_prompt, user_content = _split_messages(messages)
        payload: dict = {
            "model": self.config.model,
            "input": user_content,
            "temperature": self.config.temperature,
            "stream": False,
            "store": False,
        }
        if system_prompt:
            payload["system_prompt"] = system_prompt

        resp = requests.post(
            self._endpoint, headers=self._headers, json=payload, timeout=_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()

        for item in data.get("output", []):
            if isinstance(item, dict) and item.get("type") == "message":
                return item.get("content", "")
        return ""

    def ping(self) -> bool:
        """Return True if LM Studio is reachable and the model responds."""
        try:
            self.complete([{"role": "user", "content": "hi"}])
            return True
        except Exception:
            return False


# ── helpers ───────────────────────────────────────────────────────────────────

def _base_url(url: str) -> str:
    """Return scheme://host:port regardless of what suffix the URL has."""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def _split_messages(messages: list[dict]) -> tuple[str, str]:
    """Extract system prompt and last user content from a messages list."""
    system = ""
    user = ""
    for msg in messages:
        if msg.get("role") == "system":
            system = msg.get("content", "")
        elif msg.get("role") == "user":
            user = msg.get("content", "")
    return system, user


def _extract_token(chunk: dict) -> str:
    """
    Extract a text token from a streaming SSE chunk.
    Handles multiple LM Studio delta formats defensively.
    """
    # Format A: {delta: {text: "..."}} or {delta: {content: "..."}}
    if "delta" in chunk:
        delta = chunk["delta"]
        return delta.get("text", "") or delta.get("content", "")

    # Format B: {output: [{type: "message", content: "..."}]}
    for item in chunk.get("output", []):
        if isinstance(item, dict) and item.get("type") == "message":
            content = item.get("content", "")
            if content:
                return content

    # Format C: {content: "..."}
    if isinstance(chunk.get("content"), str):
        return chunk["content"]

    return ""

"""
Local note index — pure Python stdlib, zero external dependencies.

Two search modes, chosen automatically:
  1. Semantic  — uses the Nomic embed model already loaded in LM Studio
                 via the /v1/embeddings endpoint. Cosine similarity over
                 real vectors. Requires `embed_model` set in config.yaml.
  2. TF-IDF    — pure Python fallback when no embed model is configured.
                 Still very effective for personal note search.

Persisted as a single JSON file at TARS/.index/notes.json.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests


class VaultIndex:
    INDEX_FILE = "notes.json"

    def __init__(self, index_dir: Path, base_url: str = "", embed_model: str = "", api_key: str = "") -> None:
        index_dir.mkdir(parents=True, exist_ok=True)
        self._path = index_dir / self.INDEX_FILE
        self._data: dict = self._load()

        # Semantic search config
        self._embed_model = embed_model.strip()
        self._embeddings_endpoint = ""
        self._headers = {"Content-Type": "application/json"}
        if base_url and embed_model:
            base = _base_url(base_url)
            self._embeddings_endpoint = f"{base}/v1/embeddings"
        if api_key:
            self._headers["Authorization"] = f"Bearer {api_key}"

    # ── write ────────────────────────────────────────────────────────────────

    def upsert(self, note_id: str, content: str, metadata: dict) -> None:
        words = _tokenize(content)
        freq = Counter(words)
        entry: dict = {
            "snippet": content[:1500],
            "metadata": {k: v for k, v in metadata.items() if isinstance(v, (str, int, float, bool))},
            "freq": freq,
            "length": len(words),
        }
        # Store embedding vector if semantic mode is active
        if self._embed_model:
            vec = self._embed(content[:512])
            if vec:
                entry["vec"] = vec

        self._data["notes"][note_id] = entry
        self._save()

    def delete(self, note_id: str) -> None:
        self._data["notes"].pop(note_id, None)
        self._save()

    # ── read ─────────────────────────────────────────────────────────────────

    def query(self, text: str, n_results: int = 5) -> list[dict]:
        notes = self._data["notes"]
        if not notes:
            return []

        # Use semantic search if we have vectors
        has_vectors = any("vec" in e for e in notes.values())
        if self._embed_model and has_vectors:
            return self._semantic_query(text, notes, n_results)
        return self._tfidf_query(text, notes, n_results)

    def get_indexed_ids(self) -> set[str]:
        return set(self._data["notes"].keys())

    def count(self) -> int:
        return len(self._data["notes"])

    # ── semantic search ───────────────────────────────────────────────────────

    def _semantic_query(self, text: str, notes: dict, n: int) -> list[dict]:
        query_vec = self._embed(text)
        if not query_vec:
            return self._tfidf_query(text, notes, n)

        scores: list[tuple[float, str]] = []
        for note_id, entry in notes.items():
            vec = entry.get("vec")
            if vec:
                score = _cosine(query_vec, vec)
                scores.append((score, note_id))

        scores.sort(reverse=True)
        return self._format_results(scores[:n], notes)

    def _embed(self, text: str) -> Optional[list[float]]:
        if not self._embeddings_endpoint:
            return None
        try:
            resp = requests.post(
                self._embeddings_endpoint,
                headers=self._headers,
                json={"model": self._embed_model, "input": text},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
        except Exception:
            return None

    # ── TF-IDF search ────────────────────────────────────────────────────────

    def _tfidf_query(self, text: str, notes: dict, n: int) -> list[dict]:
        query_words = _tokenize(text)
        if not query_words:
            return []

        n_docs = max(len(notes), 1)
        scores: list[tuple[float, str]] = []
        for note_id, entry in notes.items():
            score = _tfidf_score(query_words, entry["freq"], entry["length"], notes, n_docs)
            if score > 0:
                scores.append((score, note_id))

        scores.sort(reverse=True)
        return self._format_results(scores[:n], notes)

    # ── shared ────────────────────────────────────────────────────────────────

    def _format_results(self, scores: list[tuple[float, str]], notes: dict) -> list[dict]:
        results = []
        for score, note_id in scores:
            entry = notes[note_id]
            results.append({
                "id": note_id,
                "content": entry["snippet"],
                "metadata": entry["metadata"],
                "score": round(score, 4),
            })
        return results

    def _load(self) -> dict:
        if self._path.exists():
            try:
                return json.loads(self._path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return {"notes": {}}

    def _save(self) -> None:
        self._path.write_text(json.dumps(self._data, ensure_ascii=False), encoding="utf-8")


# ── math helpers ──────────────────────────────────────────────────────────────

def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _idf(word: str, notes: dict, n_docs: int) -> float:
    doc_freq = sum(1 for e in notes.values() if word in e["freq"])
    return math.log(n_docs / doc_freq) if doc_freq else 0.0


def _tfidf_score(query_words: list[str], doc_freq: dict, doc_length: int, notes: dict, n_docs: int) -> float:
    if doc_length == 0:
        return 0.0
    return sum((doc_freq.get(w, 0) / doc_length) * _idf(w, notes, n_docs) for w in query_words)


def _base_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


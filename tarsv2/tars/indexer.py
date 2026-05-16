"""
Vault Indexer
=============
Walks the Obsidian vault, extracts behavioral fingerprints from each note
using Gemma (via LM Studio), and stores them in the local vector index.

Incremental by default — only new or modified notes are re-indexed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Callable, Optional

from tars.embeddings import VaultIndex
from tars.llm import LMStudio
from tars.schema import (
    EMPTY_FINGERPRINT,
    EXTRACTION_PROMPT,
    EXTRACTION_SYSTEM,
)
from tars.vault import Vault


class VaultIndexer:
    # Notes shorter than this (chars) are not worth fingerprinting
    MIN_CONTENT_LENGTH = 80

    def __init__(self, vault: Vault, llm: LMStudio, index: VaultIndex) -> None:
        self.vault = vault
        self.llm = llm
        self.index = index

    # ── public API ───────────────────────────────────────────────────────────

    def index_vault(
        self,
        progress: Optional[Callable[[int, int, str], None]] = None,
    ) -> tuple[int, int]:
        """
        Index all un-indexed markdown notes in the vault.

        Returns (indexed_count, skipped_count).
        The TARS subfolder is always excluded.
        """
        all_notes = self._find_notes()
        already_indexed = self.index.get_indexed_ids()

        to_index = [n for n in all_notes if str(n) not in already_indexed]
        indexed = 0
        skipped = 0

        for i, note_path in enumerate(to_index):
            try:
                content = note_path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                skipped += 1
                continue

            if len(content.strip()) < self.MIN_CONTENT_LENGTH:
                skipped += 1
                continue

            fingerprint = self._extract_fingerprint(content)
            # Store up to 1500 chars of content for retrieval context
            self.index.upsert(str(note_path), content[:1500], fingerprint)
            indexed += 1

            if progress:
                progress(i + 1, len(to_index), note_path.name)

        return indexed, skipped

    def reindex_note(self, note_path: Path) -> None:
        """Force re-index a single note (e.g. after the user edits it)."""
        content = note_path.read_text(encoding="utf-8", errors="ignore")
        fingerprint = self._extract_fingerprint(content)
        self.index.upsert(str(note_path), content[:1500], fingerprint)

    # ── internals ────────────────────────────────────────────────────────────

    def _find_notes(self) -> list[Path]:
        tars_dir = self.vault.tars.resolve()
        notes = []
        for p in self.vault.root.rglob("*.md"):
            # Skip anything inside the TARS subfolder
            try:
                p.resolve().relative_to(tars_dir)
                continue  # it's inside TARS — skip
            except ValueError:
                pass
            notes.append(p)
        return sorted(notes)

    def _extract_fingerprint(self, content: str) -> dict:
        """Ask Gemma to produce a structured JSON fingerprint for a note."""
        prompt = EXTRACTION_PROMPT.format(content=content[:3000])
        try:
            raw = self.llm.complete(
                [
                    {"role": "system", "content": EXTRACTION_SYSTEM},
                    {"role": "user", "content": prompt},
                ]
            )
            return _parse_json_response(raw)
        except Exception:
            return dict(EMPTY_FINGERPRINT)


# ── JSON extraction helpers ───────────────────────────────────────────────────

def _parse_json_response(text: str) -> dict:
    """Robustly extract a JSON object from an LLM response."""
    text = text.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown code fence
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Grab first JSON object in the string
    obj = re.search(r"\{.*\}", text, re.DOTALL)
    if obj:
        try:
            return json.loads(obj.group(0))
        except json.JSONDecodeError:
            pass

    return dict(EMPTY_FINGERPRINT)

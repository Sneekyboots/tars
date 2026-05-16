"""
Semantic Retriever
==================
Takes a natural language query and returns the most relevant vault notes
as a formatted context block ready to inject into the LLM prompt.

This is the JEPA layer — we query by *meaning*, not keywords.
"""

from __future__ import annotations

from pathlib import Path

from tars.embeddings import VaultIndex

# Notes with cosine similarity below this threshold are excluded
_MIN_SCORE = 0.30


class Retriever:
    def __init__(self, index: VaultIndex, top_k: int = 4) -> None:
        self.index = index
        self.top_k = top_k

    def retrieve(self, query: str) -> str:
        """
        Return a formatted markdown block of relevant vault notes,
        or an empty string if nothing relevant is found.
        """
        results = self.index.query(query, n_results=self.top_k)
        relevant = [r for r in results if r["score"] >= _MIN_SCORE]

        if not relevant:
            return ""

        lines = ["---", "## Relevant context from your vault\n"]
        for r in relevant:
            note_name = Path(r["id"]).stem
            summary = r["metadata"].get("summary", "")
            topics = r["metadata"].get("topics", "")
            content = r["content"].strip()

            lines.append(f"### {note_name}")
            if summary:
                lines.append(f"*{summary}*")
            if topics:
                lines.append(f"Topics: {topics}")
            lines.append("")
            lines.append(content[:600])
            lines.append("")

        lines.append("---\n")
        return "\n".join(lines)

    def is_available(self) -> bool:
        return self.index.count() > 0

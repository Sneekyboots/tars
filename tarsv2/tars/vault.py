"""Obsidian vault interface — plain file I/O, no plugin required."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional


class Vault:
    """Read/write files inside the TARS subfolder of an Obsidian vault."""

    def __init__(self, vault_path: str, tars_folder: str = "TARS") -> None:
        self.root = Path(vault_path).expanduser().resolve()
        self.tars = self.root / tars_folder
        self._bootstrap()

    # ── internal ────────────────────────────────────────────────────────────

    def _bootstrap(self) -> None:
        for sub in ("fingerprint", "sessions", "memory"):
            (self.tars / sub).mkdir(parents=True, exist_ok=True)

    def _path(self, relative: str) -> Path:
        return self.tars / relative

    # ── basic I/O ───────────────────────────────────────────────────────────

    def read(self, relative: str) -> Optional[str]:
        p = self._path(relative)
        return p.read_text(encoding="utf-8") if p.exists() else None

    def write(self, relative: str, content: str) -> None:
        p = self._path(relative)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

    def exists(self, relative: str) -> bool:
        return self._path(relative).exists()

    # ── session logging ─────────────────────────────────────────────────────

    def save_session(self, messages: list[dict]) -> str:
        """Persist a session log as a markdown file in sessions/."""
        now = datetime.now()
        filename = f"sessions/{now.strftime('%Y-%m-%d_%H-%M')}.md"

        lines = [
            f"---",
            f"date: {now.strftime('%Y-%m-%d %H:%M')}",
            f"---",
            f"# Session — {now.strftime('%B %d, %Y %H:%M')}",
            "",
        ]
        for msg in messages:
            role = msg["role"]
            if role == "system":
                continue
            label = "**You**" if role == "user" else "**TARS**"
            lines.append(f"{label}: {msg['content']}")
            lines.append("")

        self.write(filename, "\n".join(lines))
        return filename

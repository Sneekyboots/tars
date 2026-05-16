"""Fingerprint — your persistent behavioral profile stored in Obsidian."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tars.vault import Vault

PROFILE_PATH = "fingerprint/profile.md"

# ── default template written on first run ───────────────────────────────────

_TEMPLATE = """\
---
name: Unknown
created: {date}
updated: {date}
sessions: 0
---
# My Profile

## About Me
(Not yet known — TARS will fill this in as we talk.)

## My Goals
(Not yet known.)

## Interests & Expertise
(Not yet known.)

## How I Like to Communicate
(Not yet known.)

## Current Projects & Context
(Not yet known.)

## Patterns TARS Has Noticed
(Not yet known.)
"""


class Fingerprint:
    """Loads, exposes, and saves your profile from the vault."""

    def __init__(self, vault: "Vault") -> None:
        self.vault = vault
        self._raw: str = ""
        self.name: str = "Unknown"
        self.sessions: int = 0

    # ── lifecycle ───────────────────────────────────────────────────────────

    def load(self) -> bool:
        """Return True if an existing profile was loaded."""
        raw = self.vault.read(PROFILE_PATH)
        if raw is None:
            return False
        self._raw = raw
        self.name = _extract_frontmatter_field(raw, "name") or "Unknown"
        self.sessions = int(_extract_frontmatter_field(raw, "sessions") or 0)
        return True

    def init_blank(self) -> None:
        """Write the empty template — called on first run."""
        today = datetime.now().strftime("%Y-%m-%d")
        content = _TEMPLATE.format(date=today)
        self.vault.write(PROFILE_PATH, content)
        self._raw = content

    def save_updated(self, new_body: str) -> None:
        """Overwrite the profile with the LLM-updated version."""
        self.sessions += 1
        updated = _set_frontmatter_field(new_body, "updated", datetime.now().strftime("%Y-%m-%d"))
        updated = _set_frontmatter_field(updated, "sessions", str(self.sessions))
        self.vault.write(PROFILE_PATH, updated)
        self._raw = updated
        self.name = _extract_frontmatter_field(updated, "name") or self.name

    # ── accessors ───────────────────────────────────────────────────────────

    @property
    def raw(self) -> str:
        return self._raw

    @property
    def body(self) -> str:
        """Markdown body without the YAML frontmatter block."""
        if self._raw.startswith("---"):
            parts = self._raw.split("---", 2)
            if len(parts) >= 3:
                return parts[2].strip()
        return self._raw

    def is_blank(self) -> bool:
        return "(Not yet known" in self._raw


# ── helpers ──────────────────────────────────────────────────────────────────

def _extract_frontmatter_field(content: str, field: str) -> str | None:
    for line in content.splitlines():
        if line.startswith(f"{field}:"):
            return line.split(":", 1)[1].strip()
    return None


def _set_frontmatter_field(content: str, field: str, value: str) -> str:
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.startswith(f"{field}:"):
            lines[i] = f"{field}: {value}"
            return "\n".join(lines)
    # field not found — insert after opening ---
    if lines and lines[0].strip() == "---":
        lines.insert(1, f"{field}: {value}")
    return "\n".join(lines)

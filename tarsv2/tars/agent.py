"""
TARS Agent
==========
The main conversational loop. Pulls together:
  - Your behavioral profile (fingerprint)
  - Semantic retrieval from your indexed vault notes
  - Gemma via LM Studio for generation
  - Post-session memory consolidation
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from tars.config import Config
from tars.embeddings import VaultIndex
from tars.extractor import run_onboarding, update_profile
from tars.fingerprint import Fingerprint
from tars.llm import LMStudio
from tars.retriever import Retriever
from tars.vault import Vault

_console = Console()

_SYSTEM_TEMPLATE = """\
You are TARS — a personal AI with persistent memory of {name}.

Unlike standard AI assistants, you have two sources of persistent knowledge:
1. A behavioral profile built from real conversations with this person.
2. Actual notes and thinking from their private Obsidian vault.

## What you know about {name}:
{profile}

---
Guidelines:
- Use the profile to give contextual, personalized responses — not generic ones.
- When vault context is provided below the user's message, weave it in naturally
  (e.g., "In your notes from..."). Never quote it robotically.
- Acknowledge new things the user shares — you will remember them after this session.
- Be direct and personal. You know this person. No generic AI filler.
- If you're uncertain about something, say so clearly.\
"""

_COMMANDS = {
    "/exit", "/quit", "/q",
    "/help",
    "/profile",
    "/stats",
}


def run(config: Config) -> None:
    vault = Vault(config.vault_path, config.tars_folder)
    llm = LMStudio(config)

    # ── check LM Studio is live ──────────────────────────────────────────────
    _console.print("[dim]Connecting to LM Studio...[/]", end=" ")
    if not llm.ping():
        _console.print(
            "\n[bold red]Cannot reach LM Studio.[/] "
            f"Make sure it's running at [cyan]{config.lm_studio_url}[/] "
            "with a model loaded."
        )
        return
    _console.print("[green]connected[/]")

    # ── load or create fingerprint ───────────────────────────────────────────
    fingerprint = Fingerprint(vault)
    is_new_user = not fingerprint.load()

    if is_new_user:
        fingerprint.init_blank()
        run_onboarding(llm, fingerprint)
        fingerprint.load()

    # ── set up vector retriever (optional — only if vault is indexed) ────────
    index_dir = vault.tars / ".index"
    retriever: Optional[Retriever] = None
    note_count = 0
    try:
        index = VaultIndex(index_dir, config.lm_studio_url, config.embed_model, config.api_key)
        note_count = index.count()
        if note_count > 0:
            retriever = Retriever(index)
    except Exception:
        pass

    # ── build system prompt (sent once on first turn) ─────────────────────
    system_prompt = _SYSTEM_TEMPLATE.format(
        name=fingerprint.name,
        profile=fingerprint.body,
    )
    # response_id from LM Studio — threads conversation history server-side
    current_response_id: str | None = None
    is_first_turn = True
    # Our own log for memory extraction and vault session saving
    session_log: list[dict] = []

    # ── welcome banner ───────────────────────────────────────────────────────
    status_parts = [f"Session {fingerprint.sessions + 1}"]
    if note_count > 0:
        status_parts.append(f"{note_count} vault notes indexed")
    else:
        status_parts.append("vault not indexed — run [cyan]python main.py index[/]")

    _console.print(
        Panel(
            Text.from_markup(
                f"[bold]TARS[/] · {fingerprint.name}\n"
                f"[dim]{' · '.join(status_parts)}[/]\n\n"
                "[dim]Type [white]/help[/] for commands, [white]/exit[/] to quit[/]"
            ),
            border_style="cyan",
        )
    )

    # ── main chat loop ───────────────────────────────────────────────────────
    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            _console.print("\n[dim]Ending session...[/]")
            break

        if not user_input:
            continue

        # ── built-in commands ────────────────────────────────────────────────
        if user_input.lower() in ("/exit", "/quit", "/q"):
            break

        if user_input.lower() == "/help":
            _print_help()
            continue

        if user_input.lower() == "/profile":
            _console.print(
                Panel(fingerprint.body, title="Your Profile", border_style="cyan")
            )
            continue

        if user_input.lower() == "/stats":
            _console.print(
                f"[bold]Sessions:[/] {fingerprint.sessions}  "
                f"[bold]Vault notes indexed:[/] {note_count}"
            )
            continue

        # ── semantic retrieval ────────────────────────────────────────────────
        vault_context = ""
        if retriever:
            vault_context = retriever.retrieve(user_input)

        # Combine user input with any vault context for the LLM
        augmented_input = user_input
        if vault_context:
            augmented_input = f"{user_input}\n\n{vault_context}"

        # ── stream response ───────────────────────────────────────────────────
        _console.print("\n[bold cyan]TARS:[/] ", end="")
        response_tokens: list[str] = []

        try:
            for token in llm.chat(
                user_input=augmented_input,
                system_prompt=system_prompt if is_first_turn else "",
                previous_response_id=current_response_id,
            ):
                print(token, end="", flush=True)
                response_tokens.append(token)
        except Exception as e:
            _console.print(f"\n[red]Generation error: {e}[/]")
            continue

        print()  # newline after streamed response
        full_response = "".join(response_tokens)
        current_response_id = llm.last_response_id
        is_first_turn = False

        # Log clean turn (no vault context dump) for memory extraction
        session_log.append({"role": "user", "content": user_input})
        session_log.append({"role": "assistant", "content": full_response})

    # ── end of session ────────────────────────────────────────────────────────
    _console.print("[dim]Updating your profile...[/]", end=" ")
    update_profile(llm, fingerprint, session_log)
    _console.print("[green]saved[/]")

    session_file = vault.save_session(session_log)
    _console.print(f"[dim]Session logged → {session_file}[/]")


# ── helpers ───────────────────────────────────────────────────────────────────

def _print_help() -> None:
    _console.print(
        Panel(
            "[cyan]/profile[/]  Show your current behavioral profile\n"
            "[cyan]/stats[/]    Show session count and index size\n"
            "[cyan]/exit[/]     End session and save memory\n\n"
            "[dim]To index your vault for semantic search:[/]\n"
            "  python main.py index\n\n"
            "[dim]To search your vault directly:[/]\n"
            '  python main.py search "your query"',
            title="Commands",
            border_style="dim",
        )
    )

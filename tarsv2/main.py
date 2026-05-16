"""
CognitoVault / TARS — entry point

Usage:
  python main.py              # start chatting
  python main.py chat         # same as above
  python main.py index        # index (or update) your Obsidian vault
  python main.py search TEXT  # semantic search without entering chat
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
from rich.table import Table

_console = Console()


def _load_dependencies():
    """Import heavy modules lazily so --help is always instant."""
    from tars.config import load_config
    from tars.vault import Vault
    from tars.llm import LMStudio
    from tars.embeddings import VaultIndex
    from tars.indexer import VaultIndexer
    from tars.retriever import Retriever
    return load_config, Vault, LMStudio, VaultIndex, VaultIndexer, Retriever


# ── commands ──────────────────────────────────────────────────────────────────

def cmd_chat(args) -> None:
    from tars.config import load_config
    from tars.agent import run

    config = load_config(Path(args.config) if args.config else None)
    run(config)


def cmd_index(args) -> None:
    load_config, Vault, LMStudio, VaultIndex, VaultIndexer, _ = _load_dependencies()

    config = load_config(Path(args.config) if args.config else None)
    vault = Vault(config.vault_path, config.tars_folder)
    llm = LMStudio(config)
    index_dir = vault.tars / ".index"
    index = VaultIndex(index_dir, config.lm_studio_url, config.embed_model, config.api_key)
    indexer = VaultIndexer(vault, llm, index)

    _console.print(f"[bold]Vault:[/] {vault.root}")
    _console.print(f"[bold]Model:[/] {config.model} via LM Studio\n")

    _console.print(
        "[dim]Checking LM Studio connection...[/]", end=" "
    )
    if not llm.ping():
        _console.print(
            "\n[bold red]Cannot reach LM Studio.[/] "
            f"Make sure it's running at [cyan]{config.lm_studio_url}[/]."
        )
        sys.exit(1)
    _console.print("[green]ok[/]\n")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("{task.completed}/{task.total}"),
        console=_console,
    ) as progress:
        task = progress.add_task("Indexing notes...", total=None)

        def on_progress(done: int, total: int, name: str) -> None:
            progress.update(task, completed=done, total=total, description=f"{name[:40]}")

        indexed, skipped = indexer.index_vault(progress=on_progress)

    total = index.count()
    _console.print(
        f"\n[green]Done.[/] "
        f"Indexed [bold]{indexed}[/] new notes · "
        f"Skipped {skipped} · "
        f"Total in index: [bold]{total}[/]"
    )


def cmd_search(args) -> None:
    load_config, Vault, _, VaultIndex, _, Retriever = _load_dependencies()

    config = load_config(Path(args.config) if args.config else None)
    vault = Vault(config.vault_path, config.tars_folder)
    index_dir = vault.tars / ".index"

    try:
        index = VaultIndex(index_dir, config.lm_studio_url, config.embed_model, config.api_key)
    except Exception as e:
        _console.print(f"[red]Could not load index: {e}[/]")
        sys.exit(1)

    if index.count() == 0:
        _console.print(
            "[yellow]Vault is not indexed yet.[/] "
            "Run [cyan]python main.py index[/] first."
        )
        sys.exit(1)

    query = " ".join(args.query)
    results = index.query(query, n_results=args.top_k)

    table = Table(title=f'Search: "{query}"', show_lines=True)
    table.add_column("Score", style="cyan", width=7)
    table.add_column("Note", style="bold", width=30)
    table.add_column("Summary", width=50)
    table.add_column("Topics", width=25)

    for r in results:
        if r["score"] < 0.20:
            continue
        note_name = Path(r["id"]).stem
        summary = r["metadata"].get("summary", "—")
        topics = r["metadata"].get("topics", "—")
        table.add_row(str(r["score"]), note_name, summary[:120], topics[:60])

    _console.print(table)


# ── CLI wiring ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="tars",
        description="CognitoVault — sovereign AI memory over your Obsidian vault",
    )
    parser.add_argument(
        "--config", metavar="PATH", help="Path to config.yaml (default: ./config.yaml)"
    )

    sub = parser.add_subparsers(dest="command")

    # chat
    sub.add_parser("chat", help="Start a TARS conversation (default)")

    # index
    sub.add_parser("index", help="Index your Obsidian vault for semantic search")

    # search
    search_p = sub.add_parser("search", help="Semantic search over indexed vault notes")
    search_p.add_argument("query", nargs="+", help="Search query")
    search_p.add_argument(
        "--top-k", type=int, default=5, metavar="N", help="Number of results (default 5)"
    )

    args = parser.parse_args()

    if args.command in (None, "chat"):
        cmd_chat(args)
    elif args.command == "index":
        cmd_index(args)
    elif args.command == "search":
        cmd_search(args)


if __name__ == "__main__":
    main()

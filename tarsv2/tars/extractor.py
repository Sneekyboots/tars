"""
Memory Extractor
================
After each session, asks Gemma to update the user's behavioral profile
based on what was just discussed. This is how TARS "remembers" you
across conversations without any external database.
"""

from __future__ import annotations

from datetime import datetime

from tars.fingerprint import Fingerprint
from tars.llm import LMStudio
from tars.schema import (
    ONBOARDING_QUESTIONS,
    ONBOARDING_SYNTHESIS_PROMPT,
    ONBOARDING_SYSTEM,
    PROFILE_UPDATE_PROMPT,
    PROFILE_UPDATE_SYSTEM,
)


def update_profile(
    llm: LMStudio,
    fingerprint: Fingerprint,
    messages: list[dict],
) -> None:
    """
    Consolidate the session into the fingerprint.
    Silently skips if there are fewer than 2 user turns (nothing worth saving).
    """
    user_turns = sum(1 for m in messages if m["role"] == "user")
    if user_turns < 2:
        return

    conversation = _format_conversation(messages)
    prompt = PROFILE_UPDATE_PROMPT.format(
        current_profile=fingerprint.raw,
        conversation=conversation,
    )

    try:
        updated_profile = llm.complete(
            [
                {"role": "system", "content": PROFILE_UPDATE_SYSTEM},
                {"role": "user", "content": prompt},
            ]
        )
        if updated_profile.strip():
            fingerprint.save_updated(updated_profile)
    except Exception:
        # Don't crash on extraction failure — the session is still saved
        pass


def run_onboarding(llm: LMStudio, fingerprint: Fingerprint) -> None:
    """
    First-run interactive onboarding — asks 5 questions to build the
    initial profile. Returns after all answers are collected and saved.
    """
    print("\nTARS: Hey — I don't know you yet. Let me ask a few quick questions")
    print("      to build your profile. This only happens once.\n")

    messages: list[dict] = [{"role": "system", "content": ONBOARDING_SYSTEM}]
    qa_pairs: list[str] = []

    for question in ONBOARDING_QUESTIONS:
        print(f"TARS: {question}")
        try:
            answer = input("You:  ").strip()
        except (EOFError, KeyboardInterrupt):
            answer = "(skipped)"

        messages.append({"role": "assistant", "content": question})
        messages.append({"role": "user", "content": answer})
        qa_pairs.append(f"Q: {question}\nA: {answer}")

    print("\nTARS: Got it. Building your profile...\n")

    conversation = "\n\n".join(qa_pairs)
    today = datetime.now().strftime("%Y-%m-%d")
    synthesis_prompt = ONBOARDING_SYNTHESIS_PROMPT.format(
        conversation=conversation, date=today
    )

    try:
        profile_content = llm.complete(
            [{"role": "user", "content": synthesis_prompt}]
        )
        if profile_content.strip():
            fingerprint.save_updated(profile_content)
        else:
            fingerprint.init_blank()
    except Exception:
        fingerprint.init_blank()


# ── helpers ───────────────────────────────────────────────────────────────────

def _format_conversation(messages: list[dict]) -> str:
    lines = []
    for m in messages:
        if m["role"] == "system":
            continue
        label = "User" if m["role"] == "user" else "TARS"
        lines.append(f"{label}: {m['content']}")
    return "\n\n".join(lines)

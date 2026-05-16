"""
Behavioral Fingerprint Schema
==============================
Defines *what* to extract from each note — the structured signal layer
that sits between raw text and the semantic index. This is what makes
CognitoVault more than a search engine: it indexes how you think, not
just what you wrote.
"""

# ── Per-note extraction ──────────────────────────────────────────────────────

EXTRACTION_SYSTEM = (
    "You are a behavioral analysis engine. "
    "Extract structured metadata from personal notes. "
    "Return only valid JSON — no markdown, no explanation."
)

EXTRACTION_PROMPT = """\
Analyze this personal note and extract a behavioral fingerprint.

--- NOTE ---
{content}
--- END ---

Return ONLY a valid JSON object with this exact structure:
{{
  "summary": "concise 1-2 sentence summary of the note",
  "topics": ["list of main topics covered"],
  "assumptions": ["beliefs the author takes for granted without justification"],
  "beliefs": ["explicit positions, opinions, or conclusions stated"],
  "lexicon": ["specialized, unusual, or domain-specific vocabulary used"],
  "conflicts": ["tensions, contradictions, or unresolved questions in the note"],
  "emotional_tone": "one of: neutral, curious, frustrated, excited, uncertain, confident, analytical",
  "certainty_level": "one of: high, medium, low",
  "key_concepts": ["core ideas or concepts the note revolves around"],
  "questions_raised": ["explicit or implicit questions the author is wrestling with"]
}}"""

# ── Empty fingerprint (fallback when extraction fails) ───────────────────────

EMPTY_FINGERPRINT: dict = {
    "summary": "",
    "topics": [],
    "assumptions": [],
    "beliefs": [],
    "lexicon": [],
    "conflicts": [],
    "emotional_tone": "neutral",
    "certainty_level": "medium",
    "key_concepts": [],
    "questions_raised": [],
}

# ── Post-session profile update ──────────────────────────────────────────────

PROFILE_UPDATE_SYSTEM = (
    "You are maintaining a persistent behavioral profile for a user. "
    "Update it precisely based on what you learned in the conversation. "
    "Preserve everything already known unless explicitly contradicted."
)

PROFILE_UPDATE_PROMPT = """\
## Current Profile
{current_profile}

## Conversation That Just Happened
{conversation}

Rewrite the complete profile markdown file, updating sections where you learned \
something new. Keep the exact same structure and YAML frontmatter fields. \
Only change what actually changed — do not invent information. \
Return the full file content."""

# ── Onboarding questions ─────────────────────────────────────────────────────

ONBOARDING_SYSTEM = (
    "You are TARS, a personal AI that builds a persistent memory of its user. "
    "You are meeting this user for the first time. Be warm, direct, and curious. "
    "Ask the questions below one at a time, waiting for the user's response."
)

ONBOARDING_QUESTIONS = [
    "What's your name, and what do you mainly work on day to day?",
    "What are you trying to build or figure out right now?",
    "What domains do you know deeply — and which are you actively trying to learn?",
    "How do you prefer to communicate? Blunt and brief, or detailed and exploratory?",
    "What's the most important thing you want me to remember about you?",
]

ONBOARDING_SYNTHESIS_PROMPT = """\
Based on this onboarding conversation, write the initial user profile in markdown.

Conversation:
{conversation}

Write a complete profile file with this structure:
---
name: [extracted name]
created: {date}
updated: {date}
sessions: 0
---
# My Profile

## About Me
[what you learned]

## My Goals
[what you learned]

## Interests & Expertise
[what you learned]

## How I Like to Communicate
[what you learned]

## Current Projects & Context
[what you learned]

## Patterns TARS Has Noticed
(Nothing yet — check back after a few sessions.)
"""

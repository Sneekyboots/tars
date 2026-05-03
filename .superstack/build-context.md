---
phase: build
project: tars
updated: 2026-05-03
---

# Build Context — TARS

## Stack

```json
{
  "repos_cloned": ["create-solana-dapp (web3js-next-tailwind-basic)"],
  "skills_installed": ["scaffold-project", "solana-dev"],
  "mcps_configured": ["solana-mcp-server"],
  "template": "web3js-next-tailwind-basic",
  "program_framework": "anchor-lang 0.32.1",
  "frontend": "Next.js 16 + Tailwind CSS",
  "wallet": "@solana/wallet-adapter-react (Wallet Standard)",
  "ai_sdk": "anthropic (claude-sonnet-4-20250514)",
  "cluster": "devnet"
}
```

## Architecture

**Pattern**: Next.js + Anchor dApp (Pattern 1 from scaffold-project references)

**Key decisions**:
- Poseidon hash via `solana_program::poseidon` syscall (native, no extra crate)
- SHA256 (`hashv`) for decision + context string hashing (always available)
- `TwinAccount` pre-allocates space for 10 pattern entries (no realloc needed)
- `DecisionLog` PDA seeds include `decision_count` — one account per decision
- `verify_deviation` returns `u8` — Anchor 0.30+ sets return data automatically
- `export_memory` uses `emit!()` — on-chain event for indexer tracking
- Behavioral signals extracted via tool_use (structured output) in Claude API
- EMA (60/40) blends prior signals with new extraction for smooth fingerprint evolution

## Build Status

```json
{
  "mvp_complete": false,
  "tests_passing": false,
  "devnet_deployed": false,
  "toolchain_installed": false
}
```

## Toolchain needed

1. Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Solana CLI: `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`
3. Anchor AVM: `cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.32.0`

## Next steps

1. Install toolchain above
2. `anchor build` to regenerate IDL + program binary
3. `anchor keys sync` to set correct program ID
4. `npm install` in root (adds `anthropic` package)
5. `cp .env.example .env.local` and fill `ANTHROPIC_API_KEY`
6. `solana airdrop 5` for devnet SOL
7. `anchor deploy --provider.cluster devnet`
8. `npm run dev` to start frontend

## Phase handoff

Proceed to `/build-with-claude` for guided MVP implementation.

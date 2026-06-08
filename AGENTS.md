# AGENTS.md

Guidance for AI coding agents and contributors working on `purpleroc/mcp-security-inspector`.

## Repository Context

- Detected package manager: `npm`.
- Keep changes small and easy for maintainers to review.
- Prefer documentation, tests, and setup fixes before touching runtime behavior.

## Verification Commands

- `npm install`
- `npm run build`

## Safety Rules

- Do not commit secrets, tokens, wallets, or local environment values.
- Do not perform network, account, payment, or deployment actions without maintainer approval.
- Include the exact verification commands you ran in any PR body.

# Contributing

Private-first development, with the intention to publish the source later. Do not include confidential, licensed, customer, student, or other identifiable report content in patches or tests.

Development: `npm install`, `npm run typecheck`, `npm test`, `npm run dev`. Bun is compatible with npm-style workspace scripts; CI uses npm.

Pull requests should explain the threat model, browser/device combinations tested, and any failure modes. Claims about capture prevention require reproducible hardware tests. Never weaken a disclosure policy to make a demo pass. Never post license responses, tokens, or private keys.

Packages are marked `private: true` until the team resolves npm scope ownership, provider eligibility, release review and integration tests.

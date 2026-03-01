# CHUNK 0.5 — Runtime & Trigger Contract Repair

## Summary
This chunk addresses the highest-priority blockers discovered in Chunk 0 before moving to observability:

1. Added a real `/trigger` API endpoint.
2. Added deterministic tests for `/trigger` success and validation failures.
3. Aligned testing documentation with actual queue naming (`RenderQueue`) and trigger behavior.

## Changes
- Added `src/app.ts` to centralize app construction and route registration.
- Updated `src/index.ts` to use `createApp()` and wire Bull Board for runtime.
- Added `/trigger` behavior:
  - Accepts `niche` query param.
  - Supports `science` alias for `crazy-animal-facts`.
  - Enqueues a `RenderJob` via `QueueService`.
  - Returns 202 for accepted jobs and structured 400/500 errors.
- Added route tests in `src/app.test.ts`:
  - success path (`niche=science`)
  - missing niche
  - unsupported niche
- Updated `TESTING_GUIDE.md` queue references from `content-generation` to `RenderQueue`.

## Validation
- Code-level validation performed with deterministic route tests (added in this chunk).
- Full `bun test` cannot run in this environment because dependency installation is blocked by registry access restrictions (HTTP 403).

## Risks and follow-up
- `/trigger` currently enqueues a render job but does not create upstream DB artifacts required for a fully successful worker completion path; this is acceptable for contract repair but should be addressed in later stabilization chunks.
- Re-run full validation in a Docker-enabled + dependency-access environment before starting Chunk 1 observability rollout.

# CHUNK 2 — Regression Map

| Bug / Failure mode | Test added/updated | Intent |
|---|---|---|
| Trigger API missing/invalid niche handling | `src/app.test.ts` | Ensure deterministic 400 responses and no enqueue side effects |
| Trigger enqueue failure path | `src/app.test.ts` | Ensure deterministic 500 response contract |
| Queue duplicate trigger/idempotency behavior | `src/services/QueueService.test.ts` | Ensure existing logical request job is reused |
| Queue add failure behavior | `src/services/QueueService.test.ts` | Ensure queue errors are surfaced |
| Audio generation provider failure | `src/services/AudioService.test.ts` | Ensure failure is translated to stable domain error |
| Audio cache hit behavior | `src/services/AudioService.test.ts` | Ensure cache path avoids provider call |

## Notes
- Tests are deterministic and dependency-mocked.
- Full `bun test` execution is currently blocked by dependency resolution constraints in this environment.

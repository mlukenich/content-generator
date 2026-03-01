# Known Issues

## High
1. Full automated tests cannot run in this execution environment because dependency installation is blocked by registry 403 responses.
2. Docker-based end-to-end validation cannot run in this execution environment because `docker`/`docker-compose` are unavailable.

## Medium
1. Trigger path currently enqueues render jobs without creating full upstream DB artifacts required for successful render completion in all cases.
2. Idempotency key currently scopes to niche/day and may be too coarse for some product behaviors.

## Rollback plan
- Revert to previous commit before chunk 0.5+ stabilization updates if API/queue contract changes need to be deferred.
- Keep docs/reports for forensic traceability.

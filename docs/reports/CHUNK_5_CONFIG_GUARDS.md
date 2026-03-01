# CHUNK 5 — Config Validation and Startup Safety

## Implemented
- Added centralized runtime env validation (`src/config/env.ts`).
- Enforced role-based validation at startup for `app` and `worker`.
- Improved startup failure guidance with explicit remediation text.
- Updated docs to reflect health/readiness and trigger flow expectations.

## Validation matrix (current)
| Variable | app | worker | Behavior when missing |
|---|---|---|---|
| `DATABASE_URL` | required | required | startup throws with remediation guidance |
| `REDIS_URL` | required | required | startup throws with remediation guidance |

## Follow-up
- Extend matrix when additional role-specific required vars are introduced.

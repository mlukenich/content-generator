# CHUNK 6 — API Error Contract and Operator UX

## Implemented
- Standardized API error envelope for `/trigger` failures:
  - `success: false`
  - `error.code`
  - `error.message`
  - `error.requestId`
  - optional `error.details`
- Added `/health` and `/ready` endpoints.
- Improved `/trigger` success payload with actionable fields (`requestId`, `jobId`, `logicalRequestId`, resolved niche, destination, duration).
- Updated testing/docs flow with health checks.

## Example responses
- `400 INVALID_NICHE`
- `400 UNSUPPORTED_NICHE`
- `500 QUEUE_ENQUEUE_FAILED`
- `202` accepted response containing queue/job context

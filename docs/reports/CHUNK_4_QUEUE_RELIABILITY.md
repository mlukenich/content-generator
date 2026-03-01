# CHUNK 4 — Queue Reliability and Idempotency

## Implemented
- Queue default retry/backoff/removal policy centralized in `core/queue.ts`.
- Trigger-level idempotency via deterministic `logicalRequestId` and BullMQ `jobId` reuse.
- Explicit dequeue activation logs in worker.
- Terminal failure DB status update logging with context.

## Reliability evidence
- Unit-level dedupe behavior covered in `QueueService.test.ts`.
- Runtime restart/crash behavior requires Docker-enabled verification.

## Remaining risks
- Current logical idempotency key uses `niche + day`; should be refined if per-topic idempotency is required.

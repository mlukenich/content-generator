# NovaContent — Production Deployment Backlog

This backlog organizes production readiness work into epics and actionable issues.

## Prioritization legend
- **P0**: Must complete before first production deployment.
- **P1**: Strongly recommended for launch hardening / immediate post-launch.
- **P2**: Scale and optimization improvements.

---

## Epic 1 — Platform & Environment Readiness (P0)
**Goal:** Ensure reliable installs, repeatable builds, and deterministic CI/runtime behavior.

### Issue 1.1 — Standardize runtime/toolchain versions (P0)
- Pin Bun and Node compatibility in docs and CI.
- Validate Docker/Compose version requirements.
- **Acceptance criteria:** CI and local developer setup produce matching runtime versions.

### Issue 1.2 — Dependency resolution hardening (P0)
- Add registry mirror/proxy guidance and fallback strategy.
- Add lockfile integrity checks in CI.
- **Acceptance criteria:** `bun install` succeeds in CI and fails with actionable diagnostics otherwise.

### Issue 1.3 — CI quality gates (P0)
- Add staged pipeline: install, test, type checks, docker smoke.
- Archive test and service logs as CI artifacts.
- **Acceptance criteria:** PRs cannot merge unless quality gates pass.

---

## Epic 2 — Trigger-to-Render Orchestration Completeness (P0)
**Goal:** Ensure API trigger creates all artifacts required for successful end-to-end rendering.

### Issue 2.1 — Persist request/video records at trigger time (P0)
- Create DB records and lifecycle status transitions before/around queue enqueue.
- **Acceptance criteria:** Worker always finds required DB artifacts for queued jobs.

### Issue 2.2 — Introduce orchestration service boundary (P0)
- Move orchestration logic out of route handler into dedicated service.
- **Acceptance criteria:** API handler is thin and orchestration is unit/integration tested.

### Issue 2.3 — Lifecycle state machine (P1)
- Add explicit states: accepted → scripting → render_prepared → queued → rendering → published/failed.
- Enforce legal transitions.
- **Acceptance criteria:** Invalid transitions are prevented and logged.

---

## Epic 3 — Queue Reliability & Idempotency (P0)
**Goal:** Prevent duplicate outputs, dropped jobs, and ambiguous terminal failures.

### Issue 3.1 — Refine idempotency key strategy (P0)
- Replace coarse niche/day key with logical request identity (e.g., niche+topic+time window or client key).
- **Acceptance criteria:** Duplicate triggers dedupe correctly without over-colliding distinct requests.

### Issue 3.2 — Retry policy by failure class (P0)
- Differentiate transient vs permanent failure classes.
- **Acceptance criteria:** Retries occur only for transient failures; permanent errors fail fast with context.

### Issue 3.3 — Dead-letter and replay workflow (P1)
- Add DLQ and operator replay tool/process.
- **Acceptance criteria:** Failed jobs can be inspected and selectively replayed.

---

## Epic 4 — API Contract & Operator Experience (P1)
**Goal:** Make operations diagnosable without source-code deep-dives.

### Issue 4.1 — Formalize API schema (P1)
- Publish request/response/error contracts (OpenAPI or equivalent).
- Version API surface.
- **Acceptance criteria:** Contract docs and runtime responses remain aligned.

### Issue 4.2 — Expand readiness checks (P1)
- Include DB and queue dependencies in readiness health.
- **Acceptance criteria:** `/ready` reflects true ability to process work.

### Issue 4.3 — Job status and request lookup endpoints (P1)
- Add `GET /jobs/:id` and `GET /requests/:requestId`.
- **Acceptance criteria:** Operators can trace trigger outcome and job progression from API.

---

## Epic 5 — Observability, Alerting & SLOs (P1)
**Goal:** Move from logs-only diagnosis to active operational monitoring.

### Issue 5.1 — Centralized structured log shipping (P1)
- Send JSON logs to managed sink with retention/search.
- **Acceptance criteria:** Full request/job trace available in one dashboard.

### Issue 5.2 — Metrics and dashboards (P1)
- Add latency/error/retry/throughput metrics.
- **Acceptance criteria:** Operators can view queue lag, success rates, and failure trends.

### Issue 5.3 — SLO definitions and alert thresholds (P1)
- Define SLOs for trigger acceptance latency, render success rate, and queue delay.
- **Acceptance criteria:** Alerting tied to agreed SLO error budgets.

---

## Epic 6 — AI/Media Pipeline Resilience (P1)
**Goal:** Handle degraded provider behavior safely and predictably.

### Issue 6.1 — Provider fallback strategy (P1)
- Add fallback path(s) for script and audio generation outages.
- **Acceptance criteria:** Controlled degradation mode documented and tested.

### Issue 6.2 — Strict model output handling (P1)
- Harden sanitization/validation and failure messaging for LLM outputs.
- **Acceptance criteria:** Invalid model output cannot reach render stage.

### Issue 6.3 — Media asset lifecycle management (P2)
- Add cleanup/retention policy for cached voiceovers and generated artifacts.
- **Acceptance criteria:** Storage growth remains bounded and observable.

---

## Epic 7 — Data Model & Migration Safety (P1)
**Goal:** Ensure schema supports production traffic and evolution.

### Issue 7.1 — Revisit niche/video uniqueness strategy (P1)
- Remove/adjust constraints preventing expected cardinality.
- **Acceptance criteria:** Data model supports multiple videos per niche as required.

### Issue 7.2 — Migration discipline and rollback path (P1)
- Add migration verification and rollback instructions in CI/staging.
- **Acceptance criteria:** Every schema change has tested rollback.

### Issue 7.3 — Correlation fields in persistence model (P1)
- Persist requestId/correlationId where useful for audits.
- **Acceptance criteria:** End-to-end traceability survives process restarts.

---

## Epic 8 — Security & Compliance Baseline (P0)
**Goal:** Meet minimum production security requirements.

### Issue 8.1 — API authn/authz and rate limiting (P0)
- Protect trigger/admin endpoints and prevent abuse.
- **Acceptance criteria:** Unauthorized and abusive traffic is blocked.

### Issue 8.2 — Secrets management (P0)
- Move sensitive values to deployment secret manager.
- **Acceptance criteria:** No production secrets in repo or plaintext env files.

### Issue 8.3 — Dependency vulnerability scanning (P1)
- Add SCA/license scan in CI.
- **Acceptance criteria:** Risk threshold blocks merges until remediation/waiver.

---

## Epic 9 — Release Engineering & Operational Runbooks (P0)
**Goal:** Deploy safely and recover quickly.

### Issue 9.1 — Staging parity and smoke tests (P0)
- Build staging with production-like dependencies and topology.
- **Acceptance criteria:** Pre-production smoke tests are mandatory and automated.

### Issue 9.2 — Rollout/rollback automation (P0)
- Choose canary/blue-green and codify rollback steps.
- **Acceptance criteria:** Rollback can be executed in minutes with documented command path.

### Issue 9.3 — Incident runbooks (P1)
- Add runbooks for queue buildup, provider outage, render failures.
- **Acceptance criteria:** On-call can triage and mitigate without source inspection.

---

## Epic 10 — Test Strategy Completion (P0)
**Goal:** Establish confidence gates for first production deployment.

### Issue 10.1 — Full test suite restoration in CI (P0)
- Ensure all test dependencies resolve in CI and test runner executes complete suite.
- **Acceptance criteria:** `bun test` passes in CI on protected branch.

### Issue 10.2 — Integration tests for trigger→queue→worker (P0)
- Add deterministic containerized integration tests.
- **Acceptance criteria:** End-to-end happy path is validated automatically.

### Issue 10.3 — Failure-mode integration coverage (P1)
- Cover provider timeout, queue disconnect, invalid manifest, worker restart.
- **Acceptance criteria:** P0/P1 failure modes are regression tested.

---

## Suggested execution sequence
1. Epics 1, 2, 3, 8, 9, 10 (P0 deployment blockers)
2. Epics 4, 5, 6, 7 (post-launch hardening)
3. P2 optimization and scale work

## Exit criteria for first production deployment
- All P0 issues complete and validated in CI/staging.
- Documented rollback tested successfully.
- Trigger-to-render path proven in integration tests.
- On-call runbook coverage for top incident classes.

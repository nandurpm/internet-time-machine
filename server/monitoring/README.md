# Monitoring

## Purpose

Contains endpoint validation, measurement adapters, persistence, incidents, statistics, scheduling, demo data, and trend summaries.

## Contents

- `config.ts` — Validates endpoint profiles, enforces conservative collection intervals, and converts supported intervals to scheduler expressions.
- `demo.ts` — Seeds explicitly labeled simulated endpoint measurements and incidents for interface demonstrations.
- `measurement.ts` — Measures HTTP reachability/latency and DNS timing through provenance-aware adapters with bounded failures.
- `monitoring.test.ts` — Verifies endpoint validation, measurements, provenance-aware statistics, incidents, persistence, scheduling, and error recovery.
- `outages.ts` — Detects endpoint-local incident windows from consecutive failed measurements without inferring internet-wide outages.
- `repository.ts` — Defines monitoring persistence contracts and memory/SQLite repository implementations for profiles, measurements, and incidents.
- `scheduledHandler.ts` — Authenticates platform scheduler callbacks and delegates a scheduled endpoint collection cycle.
- `service.ts` — Coordinates endpoint CRUD, collection, history, incidents, and scheduler state across monitoring adapters and repositories.
- `statistics.ts` — Calculates provenance-aware metric summaries and time-bucketed monitoring history.
- `trendSummary.ts` — Minimizes monitoring aggregates, validates structured model output, and generates user-triggered AI trend summaries.
- `types.ts` — Defines monitoring profiles, measurements, provenance labels, incidents, statistics, and adapter contracts.

## Responsibilities

Monitoring domain rules belong here. Keep provenance explicit, collection conservative, incidents endpoint-scoped, and adapters recoverable.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


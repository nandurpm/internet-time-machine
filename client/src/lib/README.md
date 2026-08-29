# Lib

## Purpose

Contains client API configuration, export builders, shared utilities, and focused unit tests.

## Contents

- `dependencyTriageExport.test.ts` — Verifies the dependency triage export.test export format, content boundaries, and regression behavior.
- `dependencyTriageExport.ts` — Builds downloadable dependency-triage reports from normalized portfolio audit data.
- `trendSummaryExport.test.ts` — Verifies the trend summary export.test export format, content boundaries, and regression behavior.
- `trendSummaryExport.ts` — Builds downloadable monitoring trend-summary reports while preserving provenance and endpoint privacy boundaries.
- `trpc.ts` — Configures the typed tRPC React client, batching transport, serialization, and query integration.
- `utils.ts` — Provides shared client utility functions, including safe conditional CSS class composition.

## Responsibilities

Browser rendering and user interaction belong here. Server credentials, direct database access, and privileged platform operations must remain in the server layer.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


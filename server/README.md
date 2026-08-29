# Server

## Purpose

Contains the Express/tRPC application, authentication, storage, reports, dependency triage, and monitoring domain.

## Contents

- `_core/` — Contains the _core resources used within this folder's responsibility.
- `auth.logout.test.ts` — Verifies the auth.logout.test server behavior, authorization, persistence, and response contract.
- `db.ts` — Creates the Drizzle database client and centralizes access to the configured application database.
- `dependencyAuditRefresh.test.ts` — Verifies the dependency audit refresh.test server behavior, authorization, persistence, and response contract.
- `dependencyAuditRefresh.ts` — Implements the server-side dependency audit refresh workflow and its validated application contract.
- `dependencyAuditRefreshHandler.test.ts` — Verifies the dependency audit refresh handler.test server behavior, authorization, persistence, and response contract.
- `dependencyAuditRefreshHandler.ts` — Adapts HTTP requests to the dependency audit refresh server service with validation and normalized responses.
- `dependencyTriage.test.ts` — Verifies the dependency triage.test server behavior, authorization, persistence, and response contract.
- `dependencyTriage.ts` — Implements the server-side dependency triage workflow and its validated application contract.
- `monitoring/` — Contains the monitoring resources used within this folder's responsibility.
- `portfolioReportHandler.test.ts` — Verifies the portfolio report handler.test server behavior, authorization, persistence, and response contract.
- `portfolioReportHandler.ts` — Adapts HTTP requests to the portfolio report server service with validation and normalized responses.
- `portfolioReportPersistence.test.ts` — Verifies the portfolio report persistence.test server behavior, authorization, persistence, and response contract.
- `portfolioReportRouter.test.ts` — Verifies the portfolio report router.test server behavior, authorization, persistence, and response contract.
- `portfolioReports.test.ts` — Verifies the portfolio reports.test server behavior, authorization, persistence, and response contract.
- `portfolioReports.ts` — Implements the server-side portfolio reports workflow and its validated application contract.
- `routers.ts` — Composes the authenticated tRPC API, monitoring procedures, reports, dependency triage, and account operations.
- `storage.ts` — Provides the server's object-storage abstraction and signed upload/download operations.

## Responsibilities

Privileged APIs and infrastructure belong here. Validate all client input and do not return credentials or sensitive raw infrastructure details.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


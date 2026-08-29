# Components

## Purpose

Contains application-level React components and the reusable UI primitive library.

## Contents

- `AIChatBox.tsx` — Renders the optional AI chat interface and coordinates streamed user/model conversation state.
- `DashboardLayout.tsx` — Provides the authenticated dashboard shell, navigation, account controls, and responsive page layout.
- `DashboardLayoutSkeleton.tsx` — Provides the loading placeholder that mirrors the dashboard shell while authentication or page data resolves.
- `ErrorBoundary.tsx` — Catches uncaught React rendering failures and presents a recoverable application error state.
- `ManusDialog.tsx` — Renders platform-branded dialog content used by the hosted runtime integration.
- `Map.tsx` — Wraps the map integration and displays configured geographic markers through a reusable React component.
- `PortfolioReportPanels.tsx` — Renders dependency-audit and portfolio-report panels, controls, downloads, and status feedback.
- `ui/` — Contains the ui resources used within this folder's responsibility.

## Responsibilities

Browser rendering and user interaction belong here. Server credentials, direct database access, and privileged platform operations must remain in the server layer.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


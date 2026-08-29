# Pages

## Purpose

Contains route-level dashboard, showcase, and not-found pages.

## Contents

- `ComponentShowcase.tsx` — Displays the maintained UI primitive catalog for visual review and interaction testing.
- `Home.tsx` — Renders the main monitoring dashboard, configuration, history, charts, incident views, scheduling, and user-triggered trend summaries.
- `NotFound.tsx` — Renders the client-side fallback for routes that do not match an application page.

## Responsibilities

Browser rendering and user interaction belong here. Server credentials, direct database access, and privileged platform operations must remain in the server layer.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


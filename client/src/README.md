# Src

## Purpose

Contains the React application bootstrap, global styles, routes, components, hooks, contexts, and client utilities.

## Contents

- `_core/` — Contains the _core resources used within this folder's responsibility.
- `App.tsx` — Defines client-side routing, authentication gates, and the top-level application composition for the dashboard.
- `components/` — Contains the components resources used within this folder's responsibility.
- `const.ts` — Exposes browser-safe application constants shared across client modules.
- `contexts/` — Contains the contexts resources used within this folder's responsibility.
- `hooks/` — Contains the hooks resources used within this folder's responsibility.
- `index.css` — Defines global Tailwind imports, theme tokens, typography, and base browser styles for the dashboard.
- `lib/` — Contains the lib resources used within this folder's responsibility.
- `main.tsx` — Bootstraps React, query state, tRPC, authentication, themes, error handling, and the application root.
- `pages/` — Contains the pages resources used within this folder's responsibility.

## Responsibilities

Browser rendering and user interaction belong here. Server credentials, direct database access, and privileged platform operations must remain in the server layer.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


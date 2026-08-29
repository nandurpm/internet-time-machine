# Scripts

## Purpose

Contains portable local-run orchestration shared by the Windows and Unix launchers.

## Contents

- `run-local.mjs` — Normalizes local launcher arguments and starts the appropriate Internet Time Machine command or development server.

## Responsibilities

Keep scripts deterministic and thin; business rules should remain in the production modules they invoke.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


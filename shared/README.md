# Shared

## Purpose

Contains data contracts and constants used by both browser and server code.

## Contents

- `_core/` — Contains the _core resources used within this folder's responsibility.
- `const.ts` — Defines application constants that are safe to share between browser and server code.
- `dependencyTriage.ts` — Defines normalized dependency-audit, triage, evidence, and remediation types shared by API and client reporting.
- `types.ts` — Defines cross-runtime application data contracts that do not belong to a single client or server layer.

## Responsibilities

Keep only resources that match this folder's documented responsibility.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


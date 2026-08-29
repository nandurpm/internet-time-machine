# Types

## Purpose

Contains server-only declaration files for cookies and hosted platform contracts.

## Contents

- `cookie.d.ts` — Defines the cookie.d TypeScript declarations used by the hosted server runtime.
- `manusTypes.ts` — Defines the manus types TypeScript declarations used by the hosted server runtime.

## Responsibilities

Privileged APIs and infrastructure belong here. Validate all client input and do not return credentials or sensitive raw infrastructure details.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


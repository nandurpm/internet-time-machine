# Contexts

## Purpose

Contains React context providers for cross-cutting browser state such as themes.

## Contents

- `ThemeContext.tsx` — Provides light/dark theme state, persistence, and system-preference handling through React context.

## Responsibilities

Browser rendering and user interaction belong here. Server credentials, direct database access, and privileged platform operations must remain in the server layer.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


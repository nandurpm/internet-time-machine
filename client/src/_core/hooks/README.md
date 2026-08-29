# Hooks

## Purpose

Contains hosted-runtime React hooks, currently the authenticated-user/session adapter.

## Contents

- `useAuth.ts` — Loads the current authenticated user and exposes login, logout, and authentication-state helpers to the client.

## Responsibilities

Browser rendering and user interaction belong here. Server credentials, direct database access, and privileged platform operations must remain in the server layer.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


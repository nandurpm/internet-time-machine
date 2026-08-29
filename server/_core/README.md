#  Core

## Purpose

Contains hosted runtime infrastructure for HTTP startup, authentication, tRPC, model APIs, storage, Vite, and platform services.

## Contents

- `context.ts` — Builds per-request tRPC context, authentication state, and request metadata.
- `cookies.ts` — Defines secure authentication cookie options and helpers shared by login and logout flows.
- `dataApi.ts` — Wraps hosted platform data APIs used by server-side integrations.
- `env.ts` — Validates and exposes the server environment variables required by platform integrations.
- `heartbeat.ts` — Exposes a lightweight process health signal for runtime monitoring.
- `imageGeneration.ts` — Wraps the hosted image-generation API and normalizes generated image responses.
- `index.ts` — Creates the Express server, mounts tRPC and scheduler routes, serves the client, and starts the application runtime.
- `llm.ts` — Wraps hosted language-model requests and structured response handling for server features.
- `map.ts` — Provides server-side map configuration and geocoding helpers for the optional map component.
- `notification.ts` — Sends authenticated platform notifications through the hosted notification integration.
- `oauth.ts` — Implements hosted OAuth login, callback, session, and user synchronization behavior.
- `sdk.ts` — Initializes the hosted platform SDK and shared service clients.
- `storageProxy.test.ts` — Verifies object-storage proxy validation, permissions, and error handling.
- `storageProxy.ts` — Validates and proxies bounded object-storage requests without exposing storage credentials to the browser.
- `systemRouter.ts` — Defines platform/system tRPC procedures such as authentication state and account operations.
- `trpc.ts` — Creates tRPC middleware, public procedures, and authenticated procedure guards.
- `types/` — Contains the types resources used within this folder's responsibility.
- `vite.ts` — Connects Vite middleware in development and serves built client assets in production.
- `voiceTranscription.ts` — Wraps the hosted speech-transcription API and normalizes transcription results.

## Responsibilities

Privileged APIs and infrastructure belong here. Validate all client input and do not return credentials or sensitive raw infrastructure details.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


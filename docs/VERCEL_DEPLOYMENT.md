# External Vercel Deployment Note

## Observed response

The external URL `https://internet-time-machine-kappa.vercel.app/` was checked on 2026-08-24. Its root response was `200 OK` with `Content-Type: application/javascript; charset=utf-8`, and the page showed the bundled contents of `server/_core/index.ts` rather than the Internet Time Machine UI.

## Why this happens

`pnpm build` has two distinct outputs:

| Build output | Purpose | Suitable as a Vercel static output? |
|---|---|---|
| `dist/index.js` | The bundled long-running Node/Express/tRPC server. | No. Vercel is returning it as a static JavaScript file instead of starting an application server. |
| `dist/public` | The Vite-built browser shell and assets. | Only for a UI-only preview; it cannot provide the authenticated API, monitoring repository, scheduler callback, or server-side AI route. |

The external project appears to be configured to publish `dist` as a static output directory. Since that directory contains `index.js`, the root is resolved to the JavaScript bundle and displayed by the browser.

## Supported deployment paths

The complete application is supported through the managed deployment at [timemachine-alxsadqu.manus.space](https://timemachine-alxsadqu.manus.space) and through the documented Linux/Windows local runtime. Both paths run the Express API and retain the application’s intended authentication, storage, and scheduling behavior.

> Do not change the Vercel output directory to `dist/public` expecting a full fix. That would remove the visible source bundle, but it would still leave API-dependent features unavailable.

## If Vercel is required

A production Vercel migration is a separate infrastructure project. It should first refactor the Express server into Vercel-compatible serverless API handlers, replace the local SQLite filesystem persistence with a durable external database, configure the OAuth redirect URI and secrets for the Vercel domain, provide a server-side AI credential, and replace the platform scheduler callback with a supported cron or job service. Do not expose any API key in Vite client variables. Until those changes are complete, the managed URL is the recommended hosted deployment.

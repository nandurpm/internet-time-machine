# Workflows

## Purpose

Contains legacy Pages/Webpack workflows whose limitations must be understood before enabling deployment.

## Contents

- `jekyll-gh-pages.yml` — Runs a legacy Jekyll GitHub Pages deployment that does not include the application's Node server, authenticated API, scheduler, or SQLite runtime.
- `static.yml` — Runs a legacy whole-repository static GitHub Pages deployment that is not a complete deployment of the full-stack application.
- `webpack.yml` — Runs a legacy npm/Webpack build matrix retained for repository history; the current project uses pnpm, Vite, and esbuild.

## Responsibilities

Keep workflow orchestration here and application build logic in package scripts. Do not present static Pages workflows as a functional full-stack deployment.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


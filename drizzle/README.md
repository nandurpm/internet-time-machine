# Drizzle

## Purpose

Contains the maintained database schema, relations, and ordered SQL migrations.

## Contents

- `0000_rainy_starbolt.sql` — Applies the 0000_rainy_starbolt Drizzle migration to evolve the application's persisted monitoring, authentication, or reporting schema.
- `0001_cuddly_frog_thor.sql` — Applies the 0001_cuddly_frog_thor Drizzle migration to evolve the application's persisted monitoring, authentication, or reporting schema.
- `0002_condemned_doctor_spectrum.sql` — Applies the 0002_condemned_doctor_spectrum Drizzle migration to evolve the application's persisted monitoring, authentication, or reporting schema.
- `0003_great_exodus.sql` — Applies the 0003_great_exodus Drizzle migration to evolve the application's persisted monitoring, authentication, or reporting schema.
- `meta/` — Contains the meta resources used within this folder's responsibility.
- `relations.ts` — Defines Drizzle relationships between the application's persisted entities.
- `schema.ts` — Defines the Drizzle table schemas and inferred persistence types used by the server.

## Responsibilities

Schema and migration changes belong here and must be applied in order. Generated metadata should be changed through Drizzle tooling rather than hand editing.

## Important Notes

- This folder is part of **Internet Time Machine** and should be kept consistent with the commands and architecture documented in the root README.
- Paths and file roles listed above reflect the current repository implementation.


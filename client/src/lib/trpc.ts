/*
 * ============================================================
 * FILE: trpc.ts
 * PURPOSE: Configures the typed tRPC React client, batching transport, serialization, and query integration.
 * ============================================================
 */

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { intervalToSafeCron } from "./monitoring/config";
import { collectMeasurement, createEndpointProfile, getHistory, listEndpointProfiles, updateEndpointSchedule } from "./monitoring/service";

const historyInput = z.object({
  endpointId: z.string().min(1),
  from: z.number().optional(),
  to: z.number().optional(),
});

const endpointInput = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  dnsHost: z.string().optional(),
  intervalMinutes: z.number(),
  active: z.boolean().default(true),
  speedTestOptIn: z.boolean().default(false),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  monitoring: router({
    endpoints: publicProcedure.query(() => listEndpointProfiles()),
    history: publicProcedure.input(historyInput).query(({ input }) => getHistory(input.endpointId, input.from, input.to)),
    saveEndpoint: protectedProcedure.input(endpointInput).mutation(({ input }) => createEndpointProfile(input)),
    measureNow: protectedProcedure.input(z.object({ endpointId: z.string().min(1) })).mutation(({ input }) => collectMeasurement(input.endpointId)),
    schedule: protectedProcedure.input(z.object({ endpointId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const endpoint = listEndpointProfiles().find(profile => profile.id === input.endpointId);
      if (!endpoint) throw new Error("Endpoint profile was not found.");
      if (!endpoint.active) throw new Error("Resume endpoint monitoring before enabling a schedule.");
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const cron = intervalToSafeCron(endpoint.intervalMinutes);
      if (endpoint.scheduleTaskUid) {
        const result = await updateHeartbeatJob(endpoint.scheduleTaskUid, {
          cron,
          path: "/api/scheduled/collect-monitoring",
          description: `Rate-limited measurement for ${endpoint.label}`,
          enable: true,
        }, sessionToken);
        return { endpoint: updateEndpointSchedule(endpoint.id, endpoint.scheduleTaskUid), nextExecutionAt: result.nextExecutionAt };
      }
      const job = await createHeartbeatJob({
        name: `monitor-${endpoint.id}-${ctx.user.id}`,
        cron,
        path: "/api/scheduled/collect-monitoring",
        payload: { endpointId: endpoint.id },
        description: `Rate-limited endpoint measurement for ${endpoint.label}; minimum interval ${endpoint.intervalMinutes} minutes.`,
      }, sessionToken);
      return { endpoint: updateEndpointSchedule(endpoint.id, job.taskUid), nextExecutionAt: job.nextExecutionAt };
    }),
  }),

});

export type AppRouter = typeof appRouter;

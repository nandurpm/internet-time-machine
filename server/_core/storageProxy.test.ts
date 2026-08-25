import express, { type Express } from "express";
import type { Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStorageProxyHandler,
  registerStorageProxy,
  STORAGE_PROXY_ROUTE_V5,
  storageKeyFromRouteParams,
} from "./storageProxy";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

async function listen(app: Express) {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an IPv4 listener");
  return `http://127.0.0.1:${address.port}`;
}

function proxyOptions(fetchImpl: typeof fetch) {
  return {
    forgeApiUrl: "https://forge.example.test",
    forgeApiKey: "test-token",
    fetchImpl,
    logError: vi.fn(),
  };
}

describe("storage proxy route contract", () => {
  it("reconstructs both Express 4 and Express 5 wildcard parameter shapes", () => {
    expect(storageKeyFromRouteParams({ 0: "reports/2026/ledger.csv" })).toBe("reports/2026/ledger.csv");
    expect(storageKeyFromRouteParams({ splat: ["reports", "2026", "ledger.csv"] })).toBe("reports/2026/ledger.csv");
    expect(storageKeyFromRouteParams({ splat: [] })).toBe("");
  });

  it("redirects nested storage keys through the v4 route without exposing Forge credentials", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ url: "https://files.example.test/signed" }), { status: 200 }));
    const app = express();
    registerStorageProxy(app, proxyOptions(fetchImpl));
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/manus-storage/reports/2026/ledger.csv`, { redirect: "manual" });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://files.example.test/signed");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(new URL(String(fetchImpl.mock.calls[0]?.[0])).searchParams.get("path")).toBe("reports/2026/ledger.csv");
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: "Bearer test-token" });
  });

  it("returns a safe gateway error when the presign service rejects a request", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("upstream detail", { status: 503 }));
    const app = express();
    registerStorageProxy(app, proxyOptions(fetchImpl));
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/manus-storage/private/report.pdf`);

    expect(response.status).toBe(502);
    expect(await response.text()).toBe("Storage backend error");
  });

  it("returns a safe error for a missing storage key", async () => {
    const handler = createStorageProxyHandler(proxyOptions(vi.fn<typeof fetch>()));
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();

    await handler({ params: { 0: "" } } as never, { status, send } as never, vi.fn());

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Missing storage key");
  });
});

describe.skipIf(process.env.EXPRESS_V5_TRIAL !== "1")("Express v5 storage proxy trial", () => {
  it("accepts a named wildcard route and redirects a nested key", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ url: "https://files.example.test/v5-signed" }), { status: 200 }));
    const app = express();
    registerStorageProxy(app, { ...proxyOptions(fetchImpl), routePattern: STORAGE_PROXY_ROUTE_V5 });
    const baseUrl = await listen(app);

    const response = await fetch(`${baseUrl}/manus-storage/nested/folder/ledger.csv`, { redirect: "manual" });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://files.example.test/v5-signed");
    expect(new URL(String(fetchImpl.mock.calls[0]?.[0])).searchParams.get("path")).toBe("nested/folder/ledger.csv");
  });
});

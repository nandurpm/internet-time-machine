import type { Express, RequestHandler } from "express";
import { ENV } from "./env";

export const STORAGE_PROXY_ROUTE_V4 = "/manus-storage/*";
export const STORAGE_PROXY_ROUTE_V5 = "/manus-storage/*splat";

type RouteParams = Record<string | number, unknown>;

type StorageProxyHandlerOptions = {
  forgeApiUrl?: string;
  forgeApiKey?: string;
  fetchImpl?: typeof fetch;
  logError?: (message: string) => void;
};

type StorageProxyRegistrationOptions = StorageProxyHandlerOptions & {
  /** Use STORAGE_PROXY_ROUTE_V5 only in an Express v5 trial or after migration. */
  routePattern?: string;
};

/**
 * Accepts Express 4's unnamed wildcard shape and Express 5's named splat
 * shape. Express 5 provides wildcard segments as an array.
 */
export function storageKeyFromRouteParams(params: RouteParams) {
  const value = params.splat ?? params[0];
  if (Array.isArray(value)) {
    return value.filter((segment): segment is string => typeof segment === "string" && segment.length > 0).join("/");
  }
  return typeof value === "string" ? value : "";
}

export function createStorageProxyHandler(options: StorageProxyHandlerOptions = {}): RequestHandler {
  const forgeApiUrl = options.forgeApiUrl ?? ENV.forgeApiUrl;
  const forgeApiKey = options.forgeApiKey ?? ENV.forgeApiKey;
  const fetchImpl = options.fetchImpl ?? fetch;
  const logError = options.logError ?? console.error;

  return async (req, res) => {
    const key = storageKeyFromRouteParams(req.params as RouteParams);
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!forgeApiUrl || !forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetchImpl(forgeUrl, {
        headers: { Authorization: `Bearer ${forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        logError(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      logError(`[StorageProxy] failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(502).send("Storage proxy error");
    }
  };
}

export function registerStorageProxy(app: Express, options: StorageProxyRegistrationOptions = {}) {
  const { routePattern = STORAGE_PROXY_ROUTE_V5, ...handlerOptions } = options;
  app.get(routePattern, createStorageProxyHandler(handlerOptions));
}

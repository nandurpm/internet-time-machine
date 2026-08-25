import { describe, expect, it, vi } from "vitest";

vi.mock("./portfolioReports", () => ({
  getAdminPortfolioRunHistory: vi.fn(),
  getPortfolioReportArchive: vi.fn(),
}));

import { getAdminPortfolioRunHistory } from "./portfolioReports";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: `${role}-user`,
      name: role,
      email: null,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, protocol: "https" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("monitoring.adminPortfolioRunHistory", () => {
  it("rejects a signed-in non-administrator without calling the history service", async () => {
    const caller = appRouter.createCaller(context("user"));

    await expect(caller.monitoring.adminPortfolioRunHistory()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getAdminPortfolioRunHistory).not.toHaveBeenCalled();
  });

  it("allows an administrator to read the restricted history service", async () => {
    vi.mocked(getAdminPortfolioRunHistory).mockResolvedValue([]);
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.monitoring.adminPortfolioRunHistory()).resolves.toEqual([]);
    expect(getAdminPortfolioRunHistory).toHaveBeenCalledOnce();
  });
});

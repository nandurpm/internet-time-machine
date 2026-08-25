import { expect, test } from "@playwright/test";

test.describe("Recharts v3 monitoring interactions", () => {
  test("renders the performance legend and exposes tooltip values through pointer and keyboard interaction", async ({ page }) => {
    await page.goto("/");

    const chart = page.getByTestId("performance-timeline-chart");
    await expect(chart).toBeVisible();
    await chart.scrollIntoViewIfNeeded();
    await expect(chart.getByText("Latency", { exact: true })).toBeVisible();
    await expect(chart.getByText("DNS", { exact: true })).toBeVisible();

    const surface = chart.locator(".recharts-wrapper .recharts-surface[tabindex='0']").first();
    await expect(surface).toBeVisible();
    const tooltip = chart.locator(".recharts-tooltip-wrapper");
    const chartArea = chart.locator(".recharts-wrapper").first();
    const bounds = await chartArea.boundingBox();
    expect(bounds).not.toBeNull();
    await chartArea.hover({
      position: {
        x: (bounds?.width ?? 0) * 0.58,
        y: (bounds?.height ?? 0) * 0.48,
      },
    });
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/Latency|DNS/);

    await surface.focus();
    await expect(surface).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/Latency|DNS/);
  });
});

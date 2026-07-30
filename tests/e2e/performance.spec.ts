import { expect, test } from "@playwright/test";

test("the initial Classic route stays local and below the CLS budget", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.addInitScript(() => {
    let cumulativeLayoutShift = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          readonly hadRecentInput: boolean;
          readonly value: number;
        };

        if (!shift.hadRecentInput) {
          cumulativeLayoutShift += shift.value;
        }
      }
    });
    observer.observe({ buffered: true, type: "layout-shift" });

    Object.defineProperty(window, "__classicCls", {
      get: () => cumulativeLayoutShift,
    });
  });

  await page.goto("/?seed=phase-3%3Aperformance");
  await expect(
    page.getByRole("heading", { name: "足球生涯模拟器" }),
  ).toBeVisible();
  await page.waitForTimeout(500);

  const cls = await page.evaluate(
    () =>
      (
        window as typeof window & {
          readonly __classicCls: number;
        }
      ).__classicCls,
  );
  const external = requests.filter(
    (request) =>
      new URL(request).origin !== "http://127.0.0.1:4173",
  );
  const businessApi = requests.filter((request) =>
    new URL(request).pathname.startsWith("/api/"),
  );

  expect(cls).toBeLessThan(0.1);
  expect(external).toEqual([]);
  expect(businessApi).toEqual([]);
});

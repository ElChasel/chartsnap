import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";
import fs from "node:fs/promises";
const errors = [];
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole('heading',{name:/Your Data/})).toBeVisible({timeout:20000});
  const privacy=page.getByRole('button',{name:'拒绝可选统计'});if(await privacy.isVisible())await privacy.click();
});
test.afterEach(() => {
  expect(errors.splice(0)).toEqual([]);
});
async function demo(page) {
  await page.getByRole("button", { name: /Try Demo/ }).click();
  await expect(page.getByTestId("chart").locator("svg")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /正在/ }),
  ).toHaveCount(0);
}
async function upload(page, name, buffer) {
  await page
    .getByLabel("上传数据文件")
    .setInputFiles({
      name,
      mimeType: name.endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv",
      buffer,
    });
  await expect(page.getByTestId("chart").locator("svg")).toBeVisible();
}
function workbook(n = 10000) {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    b,
    XLSX.utils.aoa_to_sheet([
      ["时间", "销售额"],
      ...Array.from({ length: n }, (_, i) => [i, 2 * i + 3]),
    ]),
    "销售",
  );
  XLSX.utils.book_append_sheet(
    b,
    XLSX.utils.aoa_to_sheet([
      ["实验X", "实验Y"],
      [1, 3],
      [4, 9],
      [8, 17],
      [10, 21],
    ]),
    "实验",
  );
  return XLSX.write(b, { type: "buffer", bookType: "xlsx" });
}
test("landing, demo, six charts, local plotting workflow and live title editing", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { name: /Your Data/ })).toBeVisible();
  await demo(page);
  await expect(page.getByText("02 Select 选区", { exact: true })).toBeVisible();
  for (const name of [
    "折线图",
    "散点图",
    "柱状图",
    "面积图",
    "直方图",
    "箱线图",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByTestId("chart").locator("svg")).toBeVisible();
  }
  await page.getByRole("button", { name: "折线图", exact: true }).click();
  await page.getByLabel("图表标题").fill("实验结果 2026");
  await expect(page.getByTestId("chart").locator("svg")).toContainText(
    "实验结果 2026",
  );
  await page.screenshot({
    path: "artifacts/studio-desktop.png",
    fullPage: true,
  });
});
test("real 10k XLSX, multi-sheet selection, mapping, fit and residuals", async ({
  page,
}) => {
  const file = workbook(),
    t = Date.now();
  await upload(page, "真实测试.xlsx", file);
  await expect(page.getByText("10,000 行数据已就绪")).toBeVisible();
  console.log("PERF_XLSX_10000_MS", Date.now() - t);
  await page.getByLabel("工作表").selectOption("1");
  await expect(page.getByText("4 行数据已就绪")).toBeVisible();
  await page.getByRole("button", { name: "专业分析", exact: true }).click();
  await page.getByRole("button", { name: "运行分析", exact: false }).click();
  await expect(
    page.getByText("REGRESSION RESULTS", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("残差 · 观测值 − 拟合值")).toBeVisible();
  await page.screenshot({ path: "artifacts/regression.png", fullPage: true });
});
test("CSV missing, duplicate cleaning preview and reversible originals", async ({
  page,
}) => {
  await upload(page, "中文.csv", Buffer.from("X,数值\n1,3\n2,5\n2,5\n3,\n4,9"));
  await page.getByRole("button", { name: /数据清洗/ }).click();
  await page.getByRole("button", { name: "删除完全重复的行" }).click();
  await expect(
    page.getByRole("heading", { name: "确认数据变换" }),
  ).toBeVisible();
  await expect(page.getByText("5 行数据已就绪")).toBeVisible();
  await page.getByRole("button", { name: "确认应用" }).click();
  await expect(page.getByText("4 行数据已就绪")).toBeVisible();
  await page.getByRole("button", { name: /数据清洗/ }).click();
  await page.getByRole("button", { name: "恢复原始数据" }).click();
  await expect(page.getByText("5 行数据已就绪")).toBeVisible();
  await page.getByRole("button", { name: "数据预览", exact: true }).click();
  await expect(page.getByText("全量数据统计")).toBeVisible();
});
test("invalid upload feedback", async ({ page }) => {
  await page
    .getByLabel("上传数据文件")
    .setInputFiles({
      name: "损坏.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("not a workbook"),
    });
  await expect(page.getByRole("alert")).toContainText("不是有效的 XLSX");
});
test("log axis rejects zero without silently dropping rows; custom ranges", async ({
  page,
}) => {
  await upload(page, "axis.csv", Buffer.from("X,Y\n1,0\n2,10\n9,20"));
  await page.getByRole("switch", { name: "Log Scale" }).check();
  await expect(
    page.getByText("对数轴遇到非正数", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "恢复自动坐标" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByLabel("Y 最小值", { exact: true }).fill("-5");
  await page.getByLabel("Y 最大值", { exact: true }).fill("30");
  await expect(page.getByTestId("chart").locator("svg")).toBeVisible();
});
test("zoom, PNG and SVG real downloads", async ({ page }) => {
  await demo(page);
  const chart = page.getByTestId("chart");
  await chart.hover();
  await page.mouse.wheel(0, -300);
  await expect
    .poll(
      async () =>
        Number(await chart.getAttribute("data-zoom-end")) -
        Number(await chart.getAttribute("data-zoom-start")),
    )
    .toBeLessThan(100);
  await expect(chart).toHaveAttribute("data-zoom-end", /\d/);
  await page
    .getByRole("button", { name: "导出", exact: false })
    .first()
    .click();
  for (const type of ["PNG", "SVG"]) {
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name: `下载 ${type}` }).click();
    const d = await promise;
    const path = await d.path(),
      bytes = await fs.readFile(path);
    expect(bytes.length).toBeGreaterThan(1000);
    if (type === "PNG") {
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect(bytes.readUInt32BE(16)).toBe(2880);
      expect(bytes.readUInt32BE(20)).toBe(1800);
    } else expect(bytes.toString()).toContain("<svg");
    await d.saveAs(`artifacts/chart.${type.toLowerCase()}`);
  }
});
test("100k preview remains responsive and virtualizes table", async ({
  page,
}) => {
  const b = Buffer.from(
    "X,Y\n" +
      Array.from(
        { length: 100000 },
        (_, i) => `${i},${i === 54321 ? 1000000 : Math.sin(i / 100) * 100}`,
      ).join("\n"),
  );
  const start = Date.now();
  await upload(page, "large.csv", b);
  await expect(page.getByText("100,000 行数据已就绪")).toBeVisible();
  console.log("PERF_CSV_100000_MS", Date.now() - start);
  await page.getByRole("button", { name: "数据预览", exact: true }).click();
  await expect(page.locator(".table-scroll tbody tr")).toHaveCount(20);
  await page.locator(".table-scroll").evaluate((e) => (e.scrollTop = 1000000));
  await expect(page.locator(".table-scroll tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "图表", exact: true }).click();
  await expect(page.getByTestId("chart").locator("svg")).toBeVisible();
});
test("mobile layout, upload and chart without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  await expect(page.getByTestId("chart").locator("svg")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "artifacts/studio-mobile.png",
    fullPage: true,
  });
});
test("registered financial calculation creates a real derived column and exports trace", async ({
  page,
}) => {
  await upload(
    page,
    "prices.csv",
    Buffer.from("时间,价格\n1,100\n2,110\n3,99"),
  );
  await page.getByRole("button", { name: "专业分析", exact: true }).click();
  await page.getByLabel("注册公式").selectOption("percentChange");
  await page.getByRole("button", { name: "创建派生列" }).click();
  await page.getByRole("button", { name: "数据预览", exact: true }).click();
  await expect(page.locator(".table-scroll thead")).toContainText(
    "价格 · percentChange",
  );
  const text = await page.locator(".table-scroll tbody").innerText();
  expect(text).toContain("0.10000000000000009");
  await page.getByRole("button", { name: "记录", exact: true }).click();
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON" }).click();
  const d = await waiting;
  const report = JSON.parse(await fs.readFile(await d.path(), "utf8"));
  expect(report.audit.some((a) => a.text.includes("percentChange"))).toBe(true);
  expect(
    report.columns.find((c) => c.name === "价格 · percentChange").count,
  ).toBe(2);
});

import { test, expect } from '@playwright/test';
import { nanasiExcelBuffer } from '../fixtures/nanasi-excel.fixture';

test.describe('출고 데이터 업로드', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/102f1bc9-8461-4e74-9873-fe5c62c4d506/outbound');
  });

  test('업로드 페이지 접근', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const title = await page.textContent('h1');
    expect(title).toContain('출고 데이터 업로드');
  });

  test('엑셀 파일 업로드', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/upload/outbound-direct') && response.status() !== 404,
    );

    await fileInput.setInputFiles({
      name: '나나시.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: nanasiExcelBuffer(),
    });

    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.imported).toBeGreaterThanOrEqual(0);
  });

  test('업로드 결과 표시', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/upload/outbound-direct') && response.status() !== 404,
    );

    await fileInput.setInputFiles({
      name: '나나시.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: nanasiExcelBuffer(),
    });

    await responsePromise;

    await expect(page.getByText('저장 완료')).toBeVisible();
    await expect(page.getByText('미매칭 데이터')).toBeVisible();
    await expect(page.getByText('총 처리 행수')).toBeVisible();
  });
});

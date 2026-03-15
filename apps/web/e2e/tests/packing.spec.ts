import { test, expect } from '@playwright/test';

test.describe('박스 계산 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/102f1bc9-8461-4e74-9873-fe5c62c4d506/packing');
  });

  test('박스 계산 페이지 접근', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const title = await page.textContent('h1');
    expect(title).toContain('Packing / CBM Calculator');
  });

  test('박스 계산 버튼 존재 확인', async ({ page }) => {
    const calculateButton = page.getByRole('button', { name: 'Calculate' });

    await expect(calculateButton).toBeVisible();
  });

  test('박스 계산 API 호출', async ({ page }) => {
    const calculateButton = page.getByRole('button', { name: 'Calculate' });

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/packing/calculate') && response.status() !== 404,
    );

    await calculateButton.click();

    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    const result = await response.json();
    expect(result).toBeDefined();
  });
});

import { test, expect } from '@playwright/test';

test.describe('결과 표시 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/102f1bc9-8461-4e74-9873-fe5c62c4d506/packing');
  });

  test('Packing 계산 페이지 접근', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const title = await page.textContent('h1');
    expect(title).toContain('Packing / CBM Calculator');
  });

  test('박스 계산 버튼 클릭 후 결과 표시', async ({ page }) => {
    const calculateButton = page.getByRole('button', { name: 'Calculate' });
    const totalInfoSection = page.getByTestId('total-info');

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/packing/calculate') &&
        response.status() !== 404
    );

    await calculateButton.click();
    await responsePromise;

    await expect(totalInfoSection).toBeVisible();
  });

  test('총 CBM 정보 표시', async ({ page }) => {
    const calculateButton = page.getByRole('button', { name: 'Calculate' });
    const totalInfoSection = page.getByTestId('total-info');

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/packing/calculate') &&
        response.status() !== 404
    );

    await calculateButton.click();
    await responsePromise;

    await expect(totalInfoSection).toBeVisible();

    const totalCBMText = await totalInfoSection.getByTestId('total-cbm').textContent();
    expect(totalCBMText).toMatch(/\d+\.\d+ CBM/);
  });

  test('박스 효율성 표시', async ({ page }) => {
    const calculateButton = page.getByRole('button', { name: 'Calculate' });
    const efficiencySection = page.getByTestId('efficiency-summary');

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/packing/calculate') &&
        response.status() !== 404
    );

    await calculateButton.click();
    await responsePromise;

    await expect(efficiencySection).toBeVisible();
  });

  test('박스 그룹 리스트 표시', async ({ page }) => {
    const calculateButton = page.getByRole('button', { name: 'Calculate' });
    const boxesSection = page.getByTestId('packing-results');

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/packing/calculate') &&
        response.status() !== 404
    );

    await calculateButton.click();
    await responsePromise;

    await expect(boxesSection).toBeVisible();
  });
});

import { expect, test } from './fixtures';

test('index page has expected h3', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
});

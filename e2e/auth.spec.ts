import { expect, test } from '@playwright/test';

// Requires the API + a seeded database and MAIL_TRANSPORT=console. NOT run in Phase 1 (no browser available in the build sandbox).
test('home page has the hero, a skip link, and no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: /Build\. Improve\. Maintain\. Scale\./ }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('unauthenticated visit to the portal redirects to sign in', async ({ page }) => {
  await page.goto('/portal');
  await expect(page).toHaveURL(/\/login\?returnTo=/);
});

test('sign-in form shows inline validation with associated errors', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
});

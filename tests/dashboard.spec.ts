import { test, expect } from '@playwright/test';

test.describe('Private Boundary: Customer Dashboard', () => {
  const TEST_EMAIL = 'playwright-e2e@feedbackflow.app';
  const TEST_PASSWORD = 'password123';

  test('Customer should be able to login and view their inbox', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Authenticate
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Assert redirect to dashboard overview
    await expect(page).toHaveURL(/\/dashboard\/?$/);

    // 4. Navigate into the specific project
    await page.getByText('E2E Test Project').click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/?$/);

    // 4. Navigate to the Inbox (Feedbacks)
    const inboxLink = page.getByRole('link', { name: /Inbox|Feedbacks/i });
    await inboxLink.click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/feedbacks/);

    // 5. Assert that the data table loads successfully and displays feedback
    // The previous test (`widget.spec.ts`) submitted a feedback item for this user.
    // We want to ensure the table rendering isn't broken.
    const tableRow = page.locator('table tbody tr').first();
    await expect(tableRow).toBeVisible({ timeout: 10000 });
    
    // We can also verify that the "Automated smoke test message" string is present on the page.
    // Since tests might run out of order or concurrently, we just assert the list renders *something* successfully,
    // or specifically look for our test string if we're sure they run sequentially.
    // For a generic smoke test, ensuring the table populates without throwing a React error is sufficient.
    await expect(page.locator('table')).toContainText('Global setup smoke test message', { ignoreCase: true });
  });
});

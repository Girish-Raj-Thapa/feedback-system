import { test, expect } from '@playwright/test';

test.describe('Public Boundary: Feedback Widget', () => {
  const TEST_PROJECT_KEY = 'fb_pub_playwright_test';

  test('Widget should inject, open, and successfully submit feedback', async ({ page }) => {
    // Forward browser console logs to the test output for debugging
    page.on('console', msg => console.log('Browser:', msg.text()));

    // 1. Mock the Cloudflare Turnstile script to prevent the headless browser from being blocked
    // Do this BEFORE navigation to ensure it intercepts requests made by the page itself.
    await page.route('**/turnstile/**', route => {
      console.log('Mocking Turnstile script request');
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          console.log('Mock Turnstile Script Executing!');
          window.turnstile = {
            render: function(el, options) {
              console.log('Mock Turnstile Render Called!');
              if (options.callback) setTimeout(() => options.callback('XXXX.DUMMY.TOKEN.XXXX'), 100);
              return 'test-widget-id';
            },
            getResponse: function() {
              console.log('Mock Turnstile getResponse Called!');
              return 'XXXX.DUMMY.TOKEN.XXXX';
            }
          };
        `
      });
    });

    // 2. Navigate to a page on our server (we can use the landing page itself)
    await page.goto('/');

    // 2. Programmatically inject the widget script with our test project key
    await page.evaluate((publicKey) => {
      const script = document.createElement('script');
      script.src = '/widget-v1.js';
      script.setAttribute('data-project', publicKey);
      document.body.appendChild(script);
    }, TEST_PROJECT_KEY);

    // 3. Wait for the shadow DOM host to attach
    const hostLocator = page.locator('#feedbackflow-host');
    await expect(hostLocator).toBeAttached();

    // In Playwright, we can query inside open shadow roots transparently using normal selectors.
    // However, if we want to be explicit or if the shadow root is tricky, we can use CSS engines.
    // Since Playwright automatically pierces open shadow roots, we can just look for the trigger button.
    const triggerBtn = hostLocator.locator('#ff-btn');
    
    // 4. Assert that it fetches config and becomes visible
    await expect(triggerBtn).toBeVisible({ timeout: 5000 });

    // 5. Open the widget
    await triggerBtn.click();
    
    // Ensure the panel is visible
    const panel = hostLocator.locator('#ff-panel');
    await expect(panel).toBeVisible();

    // 6. Fill out the feedback form
    const textarea = hostLocator.locator('#ff-msg');
    const uniqueMessage = `Automated smoke test message: ${Date.now()}`;
    await textarea.fill(uniqueMessage);

    // 7. Submit the form
    // The dummy turnstile key generates a valid token instantly in the background, 
    // but the script still takes a moment to initialize asynchronously.
    await page.waitForTimeout(1500); 
    // Listen for the response to see why it fails
    page.on('response', response => {
      if (response.url().includes('/api/widget/feedback')) {
        console.log('Feedback API response status:', response.status());
        response.text().then(text => console.log('Feedback API response body:', text)).catch(() => {});
      }
    });

    const submitBtn = hostLocator.locator('#ff-sub');
    await submitBtn.click();

    // 8. Assert successful submission state
    // Our widget shows a success checkmark and a 'Thank you!' message upon success.
    // Let's also check if there's an error message displayed to help debug.
    const errText = await hostLocator.locator('#ff-err').textContent();
    if (errText) {
      console.log('Widget error message:', errText);
    }
    
    const successIcon = hostLocator.locator('#ff-ok');
    await expect(successIcon).toBeVisible({ timeout: 10000 });
  });
});

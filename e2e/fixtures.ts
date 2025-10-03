import { test as base } from '@playwright/test';

/**
 * Custom test fixture that mocks external API and CDN requests.
 * This prevents tests from hitting real endpoints and keeps them fast and isolated.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock all external API and image requests
    await page.route('**/*', (route) => {
      const url = route.request().url();

      // Allow localhost/127.0.0.1 requests to pass through
      if (url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')) {
        return route.continue();
      }

      // Mock external API responses
      if (url.includes('/data/') && url.endsWith('/content.json')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            images: [
              {
                id: 'test-image-1',
                name: 'Test Image',
                caption: 'A test image',
                taken: '2025-01-01T00:00:00Z',
                uploaded: '2025-01-01T00:00:00Z'
              }
            ]
          })
        });
      }

      // Mock image CDN requests (return 1x1 transparent pixel)
      if (url.includes('imagedelivery.net')) {
        return route.fulfill({
          status: 200,
          contentType: 'image/png',
          // 1x1 transparent PNG
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          )
        });
      }

      // Abort other external requests
      route.abort();
    });

    await use(page);
  }
});

export { expect } from '@playwright/test';

import puppeteer, { Browser, Page } from 'puppeteer';

export interface TestContext {
  browser: Browser;
  page: Page;
  baseUrl: string;
}

export class PuppeteerTestSetup {
  private browser: Browser | null = null;
  private baseUrl: string;

  constructor() {
    // Hardcode BASE_URL for now to ensure tests use the correct URL
    this.baseUrl = 'http://localhost:3000/';
    console.log('[PuppeteerTestSetup] Hardcoded baseUrl:', this.baseUrl);

    // Ensure baseUrl ends with a slash
    if (!this.baseUrl.endsWith('/')) {
      this.baseUrl += '/';
    }

    console.log('[PuppeteerTestSetup] this.baseUrl after ensuring slash:', this.baseUrl);
  }

  async setup(): Promise<TestContext> {
    // Start Puppeteer
    this.browser = await puppeteer.launch({
      headless: true, // Run headless for now
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
      devtools: process.env.DEVTOOLS === 'true',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await this.browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    return {
      browser: this.browser,
      page,
      baseUrl: this.baseUrl,
    };
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export const createTestFile = (filename: string, size: number = 1024): Buffer => {
  const content = 'x'.repeat(size);
  return Buffer.from(content, 'utf-8');
};

export const waitForFileUpload = async (page: Page, timeout: number = 30000): Promise<void> => {
  await page.waitForFunction(
    () => {
      const progressBar = document.querySelector('[data-testid="upload-progress"]');
      return progressBar && progressBar.getAttribute('aria-valuenow') === '100';
    },
    { timeout }
  );
};

export const waitForApiResponse = async (page: Page, apiPath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`API response timeout for ${apiPath}`));
    }, 10000);

    page.on('response', async (response) => {
      if (response.url().includes(apiPath)) {
        clearTimeout(timeout);
        try {
          const json = await response.json();
          resolve(json);
        } catch (error) {
          resolve({ status: response.status(), statusText: response.statusText() });
        }
      }
    });
  });
};
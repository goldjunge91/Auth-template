import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PuppeteerTestSetup, TestContext } from './setup';
import path from 'path';
import fs from 'fs/promises';

describe('File Upload Integration E2E Tests', () => {
  let testSetup: PuppeteerTestSetup;
  let context: TestContext;

  beforeAll(async () => {
    testSetup = new PuppeteerTestSetup();
    context = await testSetup.setup();
  }, 60000);

  afterAll(async () => {
    await testSetup.teardown();
  }, 30000);

  beforeEach(async () => {
    const newPage = await context.browser.newPage();
    await newPage.setViewport({ width: 1920, height: 1080 });
    context.page = newPage;
  });

  test('sollte kompletten Upload-Workflow von Komponente zu API durchführen', async () => {
    const { page, baseUrl } = context;

    // Testdatei erstellen
    const testContent = 'Full workflow integration test content';
    const testFilePath = path.join(__dirname, 'temp', 'workflow-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Schritt 1: Datei auswählen
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);
      await page.waitForSelector('[data-slot="file-upload-item"]');

      // Schritt 2: Upload starten
      const uploadButton = await page.waitForSelector('button[type="submit"]');
      if (uploadButton) {
        await uploadButton.click();
      } else {
        throw new Error('Upload button [type="submit"] not found');
      }

      // Schritt 3: Upload-Fortschritt überwachen
      await page.waitForSelector('[data-slot="file-upload-progress"]', { timeout: 10000 });

      // Schritt 4: Warten auf Abschluss (Toast oder Erfolgs-Indikator)
      const successElement = await Promise.race([
        page.waitForSelector('[data-sonner-toast]', { timeout: 30000 }),
        page.waitForSelector('.text-green-500', { timeout: 30000 }),
        page.waitForSelector('[role="alert"]', { timeout: 30000 })
      ]);
      expect(successElement).toBeTruthy();

      // Step 5: Verify success state
      const successMessage = await page.$eval('[data-testid="upload-success"]', el => el.textContent);
      expect(successMessage).toMatch(/success|complete|uploaded/i);

      // Step 6: Check if file info is displayed
      const fileInfo = await page.$('[data-testid="uploaded-file-info"]');
      expect(fileInfo).toBeTruthy();
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 45000);

  test('should handle authentication required for upload', async () => {
    const { page, baseUrl } = context;

    // Test without authentication first
    await page.goto(`${baseUrl}/upload`);

    // Should redirect to login or show auth required
    await page.waitForSelector('[data-testid="auth-required"], [data-testid="login-form"]', { timeout: 10000 });

    // Check current URL or page content
    const currentUrl = page.url();
    const hasAuthComponent = await page.$('[data-testid="auth-required"], [data-testid="login-form"]');
    
    expect(currentUrl.includes('/login') || hasAuthComponent).toBeTruthy();
  });

  test('should handle network errors gracefully', async () => {
    const { page, baseUrl } = context;

    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForSelector('[data-testid="file-upload-component"]');

    // Create test file
    const testContent = 'Network error test content';
    const testFilePath = path.join(__dirname, 'temp', 'network-error-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      // Select file
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);
      await page.waitForSelector('[data-testid="selected-file"]');

      // Simulate network failure
      await page.setOfflineMode(true);

      // Try to upload
      await page.click('[data-testid="upload-button"]');

      // Should show network error
      const errorMessage = await page.waitForSelector('[data-testid="upload-error"]', { timeout: 10000 });
      expect(errorMessage).toBeTruthy();

      const errorText = await page.$eval('[data-testid="upload-error"]', el => el.textContent);
      expect(errorText).toMatch(/network|connection|failed/i);

      // Restore network
      await page.setOfflineMode(false);

      // Should be able to retry
      const retryButton = await page.$('[data-testid="retry-upload-button"]');
      if (retryButton) {
        await page.click('[data-testid="retry-upload-button"]');
        await page.waitForSelector('[data-testid="upload-success"]', { timeout: 20000 });
      }
    } finally {
      await page.setOfflineMode(false);
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 60000);

  test('should handle file upload cancellation', async () => {
    const { page, baseUrl } = context;

    // Create larger file for cancellation test
    const largeContent = 'x'.repeat(500 * 1024); // 500KB
    const testFilePath = path.join(__dirname, 'temp', 'cancel-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, largeContent);

    try {
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForSelector('[data-testid="file-upload-component"]');

      // Select file
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);
      await page.waitForSelector('[data-testid="selected-file"]');

      // Start upload
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-progress"]');

      // Cancel upload
      const cancelButton = await page.$('[data-testid="cancel-upload-button"]');
      if (cancelButton) {
        await page.click('[data-testid="cancel-upload-button"]');

        // Should show cancelled state
        await page.waitForSelector('[data-testid="upload-cancelled"]', { timeout: 5000 });

        // Should be able to start again
        const uploadButton = await page.$('[data-testid="upload-button"]');
        expect(uploadButton).toBeTruthy();
      }
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 30000);

  test('should maintain upload queue for multiple files', async () => {
    const { page, baseUrl } = context;

    // Create multiple test files
    const files = [
      { name: 'queue-1.txt', content: 'Queue test file 1' },
      { name: 'queue-2.txt', content: 'Queue test file 2' },
      { name: 'queue-3.txt', content: 'Queue test file 3' },
    ];

    const filePaths: string[] = [];

    for (const file of files) {
      const filePath = path.join(__dirname, 'temp', file.name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
      filePaths.push(filePath);
    }

    try {
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForSelector('[data-testid="file-upload-component"]');

      // Check if multiple file upload is supported
      const multipleAttr = await page.$eval('input[type="file"]', el => el.hasAttribute('multiple'));
      
      if (multipleAttr) {
        // Upload multiple files
        const fileInput = await page.$('input[type="file"]');
        await fileInput!.uploadFile(...filePaths);

        // Wait for files to be listed
        await page.waitForSelector('[data-testid="selected-files"]');

        // Start batch upload
        await page.click('[data-testid="upload-all-button"]');

        // Monitor upload queue
        await page.waitForSelector('[data-testid="upload-queue"]');

        // Wait for all uploads to complete
        await page.waitForFunction(() => {
          const progressBars = document.querySelectorAll('[data-testid="file-upload-progress"]');
          return Array.from(progressBars).every(bar => 
            bar.getAttribute('aria-valuenow') === '100'
          );
        }, { timeout: 60000 });

        // Verify all files completed
        const completedFiles = await page.$$('[data-testid="file-upload-complete"]');
        expect(completedFiles.length).toBe(files.length);
      }
    } finally {
      // Cleanup
      for (const filePath of filePaths) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  }, 90000);

  test('should persist upload history and allow file management', async () => {
    const { page, baseUrl } = context;

    const testContent = 'Upload history test content';
    const testFilePath = path.join(__dirname, 'temp', 'history-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForSelector('[data-testid="file-upload-component"]');

      // Upload file
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);
      await page.waitForSelector('[data-testid="selected-file"]');
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', { timeout: 30000 });

      // Navigate to file management or refresh page
      await page.reload();
      await page.waitForSelector('[data-testid="file-upload-component"]');

      // Check if upload history is available
      const historySection = await page.$('[data-testid="upload-history"]');
      if (historySection) {
        // Should show recently uploaded file
        const historyItems = await page.$$('[data-testid="history-item"]');
        expect(historyItems.length).toBeGreaterThan(0);

        // Should be able to download or delete
        const downloadButton = await page.$('[data-testid="download-file-button"]');
        const deleteButton = await page.$('[data-testid="delete-file-button"]');
        
        expect(downloadButton || deleteButton).toBeTruthy();
      }
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 45000);
});

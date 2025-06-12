import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PuppeteerTestSetup, TestContext, waitForApiResponse } from './setup';
import path from 'path';
import fs from 'fs/promises';

describe('File Upload API E2E Tests', () => {
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
    // Create a new page for each test
    const newPage = await context.browser.newPage();
    await newPage.setViewport({ width: 1920, height: 1080 });
    context.page = newPage;
  });

  test('should handle small file upload via API', async () => {
    const { page, baseUrl } = context;

    // Create test file
    const testContent = 'This is a test file content for API upload testing.';
    const testFilePath = path.join(__dirname, 'temp', 'test-small.txt');
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      // Navigate to a page that can make API calls (or use evaluate to make direct calls)
      await page.goto(`${baseUrl}/dashboard`);

      // Use page.evaluate to make API call from browser context
      const uploadResult = await page.evaluate(async (testContent) => {
        const formData = new FormData();
        const blob = new Blob([testContent], { type: 'text/plain' });
        formData.append('file', blob, 'test-small.txt');
        formData.append('uploadType', 'document');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        return {
          status: response.status,
          data: await response.json(),
        };
      }, testContent);

      expect(uploadResult.status).toBe(200);
      expect(uploadResult.data).toHaveProperty('success', true);
      expect(uploadResult.data).toHaveProperty('fileId');
      expect(uploadResult.data).toHaveProperty('url');
    } finally {
      // Cleanup
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 30000);

  test('should handle chunked file upload via API', async () => {
    const { page, baseUrl } = context;

    // Create large test file (> 1MB to trigger chunking)
    const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
    const testFilePath = path.join(__dirname, 'temp', 'test-large.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, largeContent);

    try {
      await page.goto(`${baseUrl}/dashboard`);

      // Test chunked upload
      const uploadResult = await page.evaluate(async (largeContent) => {
        const formData = new FormData();
        const blob = new Blob([largeContent], { type: 'text/plain' });
        formData.append('file', blob, 'test-large.txt');
        formData.append('uploadType', 'document');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        return {
          status: response.status,
          data: await response.json(),
        };
      }, largeContent);

      expect(uploadResult.status).toBe(200);
      expect(uploadResult.data).toHaveProperty('success', true);
      expect(uploadResult.data).toHaveProperty('fileId');
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 60000);

  test('should reject invalid file types', async () => {
    const { page, baseUrl } = context;

    await page.goto(`${baseUrl}/dashboard`);

    const uploadResult = await page.evaluate(async () => {
      const formData = new FormData();
      // Create a file with invalid extension
      const blob = new Blob(['malicious content'], { type: 'application/x-executable' });
      formData.append('file', blob, 'malicious.exe');
      formData.append('uploadType', 'document');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    expect(uploadResult.status).toBe(400);
    expect(uploadResult.data).toHaveProperty('success', false);
    expect(uploadResult.data).toHaveProperty('error');
  });

  test('should handle file upload without required fields', async () => {
    const { page, baseUrl } = context;

    await page.goto(`${baseUrl}/dashboard`);

    const uploadResult = await page.evaluate(async () => {
      const formData = new FormData();
      // Missing file and uploadType

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    expect(uploadResult.status).toBe(400);
    expect(uploadResult.data).toHaveProperty('success', false);
  });

  test('should handle concurrent file uploads', async () => {
    const { page, baseUrl } = context;

    await page.goto(`${baseUrl}/dashboard`);

    // Test multiple concurrent uploads
    const uploadResults = await page.evaluate(async () => {
      const uploads = [];
      
      for (let i = 0; i < 3; i++) {
        const formData = new FormData();
        const content = `Test file content ${i}`;
        const blob = new Blob([content], { type: 'text/plain' });
        formData.append('file', blob, `test-concurrent-${i}.txt`);
        formData.append('uploadType', 'document');

        uploads.push(
          fetch('/api/upload', {
            method: 'POST',
            body: formData,
          }).then(async (response) => ({
            status: response.status,
            data: await response.json(),
          }))
        );
      }

      return Promise.all(uploads);
    });

    // All uploads should succeed
    uploadResults.forEach((result) => {
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('success', true);
    });

    // All should have unique file IDs
    const fileIds = uploadResults.map(result => result.data.fileId);
    const uniqueFileIds = new Set(fileIds);
    expect(uniqueFileIds.size).toBe(fileIds.length);
  }, 45000);

  test('should validate file size limits', async () => {
    const { page, baseUrl } = context;

    await page.goto(`${baseUrl}/dashboard`);

    // Test oversized file (assuming 10MB limit)
    const uploadResult = await page.evaluate(async () => {
      const formData = new FormData();
      // Create oversized file (11MB)
      const oversizedContent = 'x'.repeat(11 * 1024 * 1024);
      const blob = new Blob([oversizedContent], { type: 'text/plain' });
      formData.append('file', blob, 'oversized.txt');
      formData.append('uploadType', 'document');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    expect(uploadResult.status).toBe(400);
    expect(uploadResult.data).toHaveProperty('success', false);
    expect(uploadResult.data.error).toMatch(/size|limit|large/i);
  }, 30000);
});

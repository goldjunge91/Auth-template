import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PuppeteerTestSetup, TestContext, waitForFileUpload } from './setup';
import path from 'path';
import fs from 'fs/promises';
import { UploadButton } from "@uploadthing/react";

describe('File Upload Component E2E Tests', () => {
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

  test('sollte File Upload Komponente korrekt rendern', async () => {
    const { page, baseUrl } = context;

    // Navigation zu einer Seite mit File Upload Komponente
    await page.goto(`${baseUrl}/file-upload/local`);

    // Warten bis die Komponente geladen ist
    await page.waitForSelector('[data-slot="file-upload"]', { timeout: 10000 });

    // Überprüfen ob Upload-Bereich sichtbar ist
    const uploadArea = await page.$('[data-slot="file-upload-dropzone"]');
    expect(uploadArea).toBeTruthy();

    // Überprüfen ob File Input vorhanden ist
    const fileInput = await page.$('input[type="file"]');
    expect(fileInput).toBeTruthy();

    // Überprüfen ob Trigger vorhanden ist
    const uploadTrigger = await page.$('[data-slot="file-upload-trigger"]');
    expect(uploadTrigger).toBeTruthy();
  });

  test('sollte Dateiauswahl über File Input verarbeiten', async () => {
    const { page, baseUrl } = context;

    // Testdatei erstellen
    const testContent = 'Test file content for component testing';
    const testFilePath = path.join(__dirname, 'temp', 'component-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // File Input finden und verwenden
      const fileInput = await page.$('input[type="file"]');
      expect(fileInput).toBeTruthy();

      // Datei hochladen
      await fileInput!.uploadFile(testFilePath);

      // Warten bis Datei verarbeitet wurde
      await page.waitForSelector('[data-slot="file-upload-list"]', { timeout: 5000 });

      // Überprüfen ob Datei-Item angezeigt wird
      const fileItem = await page.$('[data-slot="file-upload-item"]');
      expect(fileItem).toBeTruthy();

      // Datei-Metadaten überprüfen
      const fileMetadata = await page.$('[data-slot="file-upload-metadata"]');
      expect(fileMetadata).toBeTruthy();
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  });

  test('sollte Upload-Fortschritt während File Upload anzeigen', async () => {
    const { page, baseUrl } = context;

    // Größere Testdatei erstellen, um Fortschritt zu sehen
    const testContent = 'x'.repeat(100 * 1024); // 100KB
    const testFilePath = path.join(__dirname, 'temp', 'progress-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Datei hochladen
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);

      // Warten auf Upload Button und klicken
      const uploadButton = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      if (uploadButton) {
        await uploadButton.click();
      } else {
        throw new Error('Upload button [type="submit"] not found after 5 seconds');
      }

      // Überprüfen ob Fortschrittsbalken erscheint
      await page.waitForSelector('[data-slot="file-upload-progress"]', { timeout: 5000 });

      // Warten bis Upload abgeschlossen ist
      await waitForFileUpload(page);
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  }, 30000);

  test('sollte Drag und Drop File Upload verarbeiten', async () => {
    const { page, baseUrl } = context;

    await page.goto(`${baseUrl}/file-upload/local`);
    await page.waitForSelector('[data-slot="file-upload"]');

    // Drag und Drop simulieren
    const testFile = {
      name: 'drag-drop-test.txt',
      content: 'Drag and drop test content',
    };

    await page.evaluate((file) => {
      const dropzone = document.querySelector('[data-slot="file-upload-dropzone"]') as HTMLElement;
      
      if (dropzone) {
        // Mock File erstellen
        const mockFile = new File([file.content], file.name, { type: 'text/plain' });
        
        // Mock Drag Event erstellen
        const dragEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
        });

        // Mock dataTransfer
        Object.defineProperty(dragEvent, 'dataTransfer', {
          value: {
            files: [mockFile],
            types: ['Files'],
          },
        });

        dropzone.dispatchEvent(dragEvent);
      }
    }, testFile);

    // Warten bis Datei verarbeitet wurde
    await page.waitForSelector('[data-slot="file-upload-item"]', { timeout: 5000 });

    // Überprüfen ob Datei hinzugefügt wurde
    const fileItem = await page.$('[data-slot="file-upload-item"]');
    expect(fileItem).toBeTruthy();
  });

  test('sollte Fehler für ungültige Dateitypen anzeigen', async () => {
    const { page, baseUrl } = context;

    // Ungültige Datei erstellen
    const testFilePath = path.join(__dirname, 'temp', 'invalid.exe');
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, 'invalid content');

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Versuchen ungültige Datei hochzuladen
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);

      // Warten auf Fehlermeldung (über Toast oder Alert)
      const errorElement = await Promise.race([
        page.waitForSelector('[data-sonner-toast]', { timeout: 5000 }),
        page.waitForSelector('[role="alert"]', { timeout: 5000 }),
        page.waitForSelector('.text-destructive', { timeout: 5000 })
      ]);
      expect(errorElement).toBeTruthy();
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  });

  test('sollte Datei-Entfernung vor Upload ermöglichen', async () => {
    const { page, baseUrl } = context;

    const testContent = 'Test file for removal';
    const testFilePath = path.join(__dirname, 'temp', 'removal-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Datei hochladen
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);

      // Warten bis Datei ausgewählt wurde
      await page.waitForSelector('[data-slot="file-upload-item"]');

      // Entfernen-Button finden und klicken
      const removeButton = await page.waitForSelector('[data-slot="file-upload-remove-button"]');
      if (removeButton) {
        await removeButton.click();
      } else {
        throw new Error('Remove button not found');
      }

      // Kurze Pause, um sicherzustellen, dass die UI aktualisiert wird
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Überprüfen ob Datei entfernt wurde
      const fileItem = await page.$('[data-slot="file-upload-item"]');
      expect(fileItem).toBeFalsy();

      // Überprüfen ob Upload-Bereich wieder im Ausgangszustand ist
      const dropzone = await page.$('[data-slot="file-upload-dropzone"]');
      expect(dropzone).toBeTruthy();
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  });

  test('sollte mehrere Dateien verarbeiten falls unterstützt', async () => {
    const { page, baseUrl } = context;

    // Mehrere Testdateien erstellen
    const files = [
      { name: 'multi-1.txt', content: 'First file content' },
      { name: 'multi-2.txt', content: 'Second file content' },
    ];

    const filePaths: string[] = [];

    for (const file of files) {
      const filePath = path.join(__dirname, 'temp', file.name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
      filePaths.push(filePath);
    }

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Überprüfen ob multiple Dateiauswahl unterstützt wird
      const multipleAttr = await page.$eval('input[type="file"]', el => el.hasAttribute('multiple'));
      
      if (multipleAttr) {
        // Mehrere Dateien hochladen
        const fileInput = await page.$('input[type="file"]');
        await fileInput!.uploadFile(...filePaths);

        // Warten bis Dateien verarbeitet wurden
        await page.waitForSelector('[data-slot="file-upload-list"]', { timeout: 5000 });

        // Überprüfen ob mehrere Dateien aufgelistet sind
        const fileElements = await page.$$('[data-slot="file-upload-item"]');
        expect(fileElements.length).toBe(2);
      }
    } finally {
      // Aufräumen
      for (const filePath of filePaths) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  });

  test('sollte Upload-Status während Seiteninteraktionen bewahren', async () => {
    const { page, baseUrl } = context;

    const testContent = 'State preservation test';
    const testFilePath = path.join(__dirname, 'temp', 'state-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Datei hochladen
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);

      // Warten auf Dateiauswahl
      await page.waitForSelector('[data-slot="file-upload-item"]');

      // Mit anderen Seitenelementen interagieren (scrollen, andere Komponenten klicken)
      await page.evaluate(() => window.scrollTo(0, 100));
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.evaluate(() => window.scrollTo(0, 0));

      // Überprüfen ob Datei noch ausgewählt ist
      const selectedFile = await page.$('[data-slot="file-upload-item"]');
      expect(selectedFile).toBeTruthy();

      // Datei-Metadaten überprüfen
      const fileMetadata = await page.$('[data-slot="file-upload-metadata"]');
      expect(fileMetadata).toBeTruthy();
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  });

  test('sollte Clear-Funktionalität unterstützen', async () => {
    const { page, baseUrl } = context;

    const testContent = 'Test file for clearing';
    const testFilePath = path.join(__dirname, 'temp', 'clear-test.txt');
    
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, testContent);

    try {
      await page.goto(`${baseUrl}/file-upload/local`);
      await page.waitForSelector('[data-slot="file-upload"]');

      // Datei hochladen
      const fileInput = await page.$('input[type="file"]');
      await fileInput!.uploadFile(testFilePath);

      // Warten auf Dateiauswahl
      await page.waitForSelector('[data-slot="file-upload-item"]');

      // Clear-Button suchen und klicken falls vorhanden
      const clearButton = await page.$('[data-slot="file-upload-clear"]');
      if (clearButton) {
        await clearButton.click();

        // Überprüfen ob alle Dateien entfernt wurden
        const fileItems = await page.$$('[data-slot="file-upload-item"]');
        expect(fileItems.length).toBe(0);
      }
    } finally {
      await fs.unlink(testFilePath).catch(() => {});
    }
  });
});

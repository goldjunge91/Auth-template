# File Upload E2E Tests mit Puppeteer

Diese E2E-Tests verwenden Puppeteer, um die File-Upload-Funktionalität in einem echten Browser zu testen, während die Website in einem separaten Terminal läuft.

## 📁 Test-Struktur

```
all-tests/puppeteer/
├── setup.ts                           # Test-Setup und Utilities
├── file-upload-api.test.ts            # API Endpunkt Tests (/api/upload)
├── file-upload-component.test.ts      # UI Component Tests
├── file-upload-integration.test.ts    # Integration Tests
└── temp/                              # Temporäre Test-Dateien
```

## 🚀 Tests ausführen

### Alle E2E Tests
```bash
# Mit Skript (empfohlen)
./scripts/run-e2e-tests.sh

# Oder direkt mit pnpm
pnpm test:puppeteer:run
```

### Spezifische Test-Suites
```bash
# Nur API Tests
./scripts/run-e2e-tests.sh api

# Nur Component Tests  
./scripts/run-e2e-tests.sh component

# Nur Integration Tests
./scripts/run-e2e-tests.sh integration
```

### Interaktiver Modus
```bash
pnpm test:puppeteer        # Watch mode
pnpm test:puppeteer:ui     # Mit UI
```

## 🎯 Test-Szenarien

### API Tests (`file-upload-api.test.ts`)
- ✅ Kleine Datei-Uploads über API
- ✅ Chunked Uploads für große Dateien  
- ✅ Ablehnung ungültiger Dateitypen
- ✅ Validierung fehlender Felder
- ✅ Concurrent Uploads
- ✅ Dateigrößen-Limits

### Component Tests (`file-upload-component.test.ts`)
- ✅ Korrektes Rendering der Upload-Komponente
- ✅ Dateiauswahl über File Input
- ✅ Upload-Progress Anzeige
- ✅ Drag & Drop Funktionalität
- ✅ Fehler-Handling für ungültige Dateien
- ✅ Datei-Entfernung vor Upload
- ✅ Multiple File Selection
- ✅ State Preservation

### Integration Tests (`file-upload-integration.test.ts`)
- ✅ Kompletter Upload-Workflow (Component → API)
- ✅ Authentifizierung für Uploads
- ✅ Netzwerk-Fehler Behandlung
- ✅ Upload-Cancellation
- ✅ Upload-Queue für mehrere Dateien
- ✅ Upload-History und File Management

## ⚙️ Konfiguration

### Environment Variables
```bash
# Browser-Verhalten
export HEADLESS=false         # Browser sichtbar machen
export SLOW_MO=250           # Verlangsamung in ms
export DEVTOOLS=true         # DevTools öffnen

# Test-Umgebung  
export NODE_ENV=test
export PORT=3000
```

### Test-Daten Attribute

Die Tests verwenden spezifische `data-testid` Attribute:

#### Upload Component
```html
<div data-testid="file-upload-component">
<div data-testid="file-upload-dropzone">
<input type="file" data-testid="file-input">
<div data-testid="upload-text">
<div data-testid="selected-file">
<div data-testid="file-name">
<div data-testid="file-size">
<button data-testid="upload-button">
<button data-testid="remove-file-button">
```

#### Progress & States
```html
<div data-testid="upload-progress" aria-valuenow="75">
<div data-testid="upload-success">
<div data-testid="upload-error">
<div data-testid="upload-cancelled">
<button data-testid="cancel-upload-button">
<button data-testid="retry-upload-button">
```

#### Multi-File Support
```html
<div data-testid="selected-files">
<div data-testid="file-item">
<button data-testid="upload-all-button">
<div data-testid="upload-queue">
<div data-testid="file-upload-progress">
<div data-testid="file-upload-complete">
```

#### File Management
```html
<div data-testid="upload-history">
<div data-testid="history-item">
<div data-testid="uploaded-file-info">
<button data-testid="download-file-button">
<button data-testid="delete-file-button">
```

## 🛠️ Troubleshooting

### Tests schlagen fehl
1. **Server startet nicht**: Port 3000 bereits belegt
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Selektoren nicht gefunden**: `data-testid` Attribute prüfen
3. **Timeouts**: `testTimeout` in vitest.puppeteer.config.mjs erhöhen
4. **Flaky Tests**: `SLOW_MO` Environment Variable setzen

### Debug-Modus
```bash
# Browser sichtbar + langsam
HEADLESS=false SLOW_MO=500 ./scripts/run-e2e-tests.sh

# Mit DevTools
HEADLESS=false DEVTOOLS=true ./scripts/run-e2e-tests.sh
```

### Screenshots bei Fehlern
```typescript
// In Tests hinzufügen:
await page.screenshot({ 
  path: `./all-tests/puppeteer/screenshots/error-${Date.now()}.png`,
  fullPage: true 
});
```

## 📊 Test Reports

Nach Test-Ausführung verfügbar:
- `all-tests/puppeteer/test-results.html` - HTML Report
- `all-tests/puppeteer/test-results.json` - JSON Report  
- `dev-server.log` - Development Server Logs

## 🔧 Erweiterung

### Neue Tests hinzufügen
1. Test-Datei in `all-tests/puppeteer/` erstellen
2. `setup.ts` utilities nutzen
3. `data-testid` Attribute in Components hinzufügen
4. Tests in `vitest.puppeteer.config.mjs` includieren

### Custom Utilities
```typescript
// In setup.ts erweitern
export const waitForToast = async (page: Page, type: 'success' | 'error') => {
  return page.waitForSelector(`[data-testid="toast-${type}"]`);
};

export const loginUser = async (page: Page, email: string, password: string) => {
  // Login logic
};
```

## ✨ Best Practices

1. **Reliable Selectors**: `data-testid` > CSS selectors > XPath
2. **Wait Strategies**: `waitForSelector` > `waitForTimeout`
3. **Cleanup**: Temporäre Dateien nach Tests löschen
4. **Isolation**: Jeder Test unabhängig und idempotent
5. **Realistic Data**: Echte Dateien für Upload-Tests verwenden

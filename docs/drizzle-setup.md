# Drizzle ORM Setup

Diese Anwendung verwendet Drizzle ORM mit SQLite für die Datenbankinteraktion.

## Übersicht

- **ORM**: Drizzle ORM
- **Datenbank**: SQLite (lokale Datei)
- **Schema**: `src/lib/db/schema.ts`
- **Konfiguration**: `drizzle.config.ts`

## Installierte Pakete

```bash
# Produktions-Dependencies
pnpm add drizzle-orm better-sqlite3

# Development-Dependencies  
pnpm add -D drizzle-kit @types/better-sqlite3 tsx
```

## Verfügbare Scripts

```bash
# Schema-Änderungen zu Migrationen generieren
pnpm db:generate

# Migrationen auf die Datenbank anwenden
pnpm db:migrate

# Schema direkt zur Datenbank pushen (ohne Migration)
pnpm db:push

# Drizzle Studio öffnen (Web-UI für Datenbankinteraktion)
pnpm db:studio

# Testdaten in die Datenbank laden
pnpm db:seed
```

## Datenbankschema

### Tabellen

1. **products** - Produktdaten
   - id, name, description, price, image, category, inStock
   - timestamps: createdAt, updatedAt

2. **cartItems** - Warenkorbeinträge
   - id, sessionId, productId, quantity
   - timestamps: createdAt, updatedAt
   - Foreign Key zu products

3. **categories** - Produktkategorien
   - id, name, description, createdAt

4. **contacts** - Kontaktformular-Einträge
   - id, name, email, message, submittedAt

## Verwendung

### Neue Migration erstellen

1. Schema in `src/lib/db/schema.ts` ändern
2. Migration generieren: `pnpm db:generate`
3. Migration anwenden: `pnpm db:migrate`

### Datenbankabfragen

```typescript
import { db, products, eq } from '@/lib/db';

// Alle Produkte abrufen
const allProducts = await db.select().from(products);

// Produkt nach ID finden
const product = await db.select().from(products).where(eq(products.id, 'some-id'));

// Neues Produkt einfügen
await db.insert(products).values({
  id: 'new-product',
  name: 'Produktname',
  price: 99.99,
  // ...
});
```

### Drizzle Studio

Für eine grafische Datenbank-Oberfläche:

```bash
pnpm db:studio
```

Dies öffnet eine Web-UI unter `https://local.drizzle.studio`

## Datenbankdatei

Die SQLite-Datenbank wird in `sqlite.db` im Root-Verzeichnis gespeichert. Diese Datei ist in `.gitignore` enthalten.

## Aktionen (Server Actions)

Die folgenden Server Actions wurden für Drizzle aktualisiert:

- `src/app/actions/product.ts` - Produktabfragen
- `src/app/actions/cart.ts` - Warenkorbfunktionen  
- `src/app/actions/contact.ts` - Kontaktformular

## Session-Management

Der Warenkorb verwendet Session-IDs aus HTTP-Cookies statt lokaler Speicherung, um Daten in der Datenbank zu persistieren.

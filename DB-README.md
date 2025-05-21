# Authentifizierungs-Template mit Dual-Datenbank-Unterstützung

Dieses Projekt unterstützt sowohl SQLite (für lokale Entwicklung) als auch PostgreSQL (für Produktion).

## Datenbank-Setup

### Lokale Entwicklung mit SQLite

Für die lokale Entwicklung können Sie SQLite verwenden, das keine zusätzliche Konfiguration erfordert:

```bash
# Erstellen der SQLite-Datenbank und initialisieren der Tabellen
npm run db:migrate:sqlite
```

Die SQLite-Datenbank wird automatisch in `src/db/local.db` gespeichert.

### Produktion mit PostgreSQL

Für die Produktionsumgebung müssen Sie eine PostgreSQL-Datenbank konfigurieren:

1. Stellen Sie sicher, dass die Umgebungsvariable `DATABASE_URL` gesetzt ist mit der PostgreSQL-Verbindungszeichenfolge.
2. Führen Sie die Migrationen aus:

```bash
npm run db:migrate
```

## Umgebungsvariablen

- `DATABASE_URL`: PostgreSQL-Verbindung für Produktionsumgebungen (erforderlich in Produktionsumgebungen)
- `DEV_DATABASE_URL`: Optionale PostgreSQL-Verbindung für die lokale Entwicklung (wenn Sie PostgreSQL lokal verwenden möchten)
- `NEXTAUTH_SECRET`: Secret für NextAuth (erforderlich)

Wenn keine der Datenbank-URLs gesetzt ist, wird automatisch auf eine lokale SQLite-Datei zurückgegriffen.

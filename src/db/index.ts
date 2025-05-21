import { drizzle as drizzleBetterSqlite3, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { drizzle as drizzleLibsql, LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient, Client as LibsqlClient } from '@libsql/client';

import * as schema from "./schema/sqlite/index.sql"; // Annahme: Dieses Schema wird für beide Datenbanktypen verwendet.

// Typdefinition für die Datenbankinstanz, die entweder SQLite oder TursoDB sein kann.
type DbInstance = LibSQLDatabase<typeof schema> | BetterSQLite3Database<typeof schema>;

const createDbConnection = (): DbInstance => {
  const nodeEnv = process.env.NODE_ENV;
  // Logger ist standardmäßig nur in der Entwicklungsumgebung aktiv.
  const enableLogger = nodeEnv === 'development';

  if (nodeEnv === 'development') {
    console.log("DB: Entwicklungsmodus - Verwende lokale SQLite-Datenbank.");
    const sqlitePath = process.env.SQLITE_DB_PATH;
    console.log(`SQLite-Pfad: ${sqlitePath}`);
    try {
      const sqlite = new Database(sqlitePath);
      return drizzleBetterSqlite3(sqlite, { schema, logger: enableLogger });
    } catch (error) {
      console.error(`Fehler beim Initialisieren der SQLite-Datenbank unter ${sqlitePath}:`, error);
      throw new Error(`Konnte SQLite-Datenbank nicht initialisieren: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log("DB: Produktions-/Standardmodus - Verwende TursoDB.");
    const tursoUrl = process.env.TURSO_URL;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

    if (!tursoUrl) {
      throw new Error(
        'TURSO_URL ist nicht gesetzt. Diese Umgebungsvariable wird für TursoDB benötigt.'
      );
    }
    if (!tursoAuthToken) {
      // In Ihrer ursprünglichen auskommentierten Konfiguration war dies eine Warnung.
      console.warn(
        'TURSO_AUTH_TOKEN ist nicht gesetzt. Dies könnte für die Verbindung zu TursoDB erforderlich sein.'
      );
    }

    try {
      const client: LibsqlClient = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken, // createClient behandelt undefined authToken, falls nicht gesetzt
      });
      // Der Logger wird auch hier durch enableLogger gesteuert (d.h. für Nicht-Entwicklung standardmäßig aus).
      return drizzleLibsql(client, { schema, logger: enableLogger });
    } catch (error) {
      console.error('Fehler beim Initialisieren des TursoDB-Clients:', error);
      throw new Error(`Konnte TursoDB-Client nicht initialisieren: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export const db: DbInstance = createDbConnection();

// import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
// import { drizzle as drizzleLibSql, LibSQLDatabase } from 'drizzle-orm/libsql';
// import { createClient, Client } from '@libsql/client';
// import Database from 'better-sqlite3';
// import { eq } from 'drizzle-orm';
// import * as schema from './schema/sqlite/index.sql';

// // Typdefinition für die zurückgegebene Datenbankinstanz
// type DbInstance = LibSQLDatabase<typeof schema> | BetterSQLite3Database<typeof schema>;

// const createDbInstance = (): DbInstance => {
//   const nodeEnv = process.env.NODE_ENV;
//   const enableLogger = nodeEnv === 'development';

//   console.log(`Initialisiere Datenbank für Umgebung: ${nodeEnv || 'nicht gesetzt (produktiv angenommen)'}`);

//   if (nodeEnv === 'development') {
//     console.log("Verwende SQLite für die lokale Entwicklung.");
//     const sqlitePath = process.env.SQLITE_DB_PATH || './src/db/local.db';
//     console.log(`SQLite-Pfad: ${sqlitePath}`);
//     try {
//       const sqlite = new Database(sqlitePath);
//       return drizzle(sqlite, { schema, logger: enableLogger });
//     } catch (error) {
//       console.error(`Fehler beim Initialisieren der SQLite-Datenbank unter ${sqlitePath}:`, error);
//       throw new Error(`Konnte SQLite-Datenbank nicht initialisieren: ${error instanceof Error ? error.message : String(error)}`);
//     }
//   } else {
//     console.log("Verwende TursoDB.");
//     const tursoUrl = process.env.TURSO_DATABASE_URL;
//     const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

//     if (!tursoUrl) {
//       throw new Error(
//         'TURSO_DATABASE_URL ist nicht gesetzt. Diese Variable wird für Nicht-Entwicklungsumgebungen benötigt.'
//       );
//     }
//     if (!tursoAuthToken) {
//       console.warn(
//         'TURSO_AUTH_TOKEN ist nicht gesetzt. Dies könnte für die Verbindung zu TursoDB erforderlich sein.'
//       );
//     }

//     try {
//       const turso: Client = createClient({
//         url: tursoUrl,
//         authToken: tursoAuthToken,
//       });
//       return drizzleLibSql(turso, { schema, logger: enableLogger });
//     } catch (error) {
//       console.error('Fehler beim Initialisieren des TursoDB-Clients:', error);
//       throw new Error(`Konnte TursoDB-Client nicht initialisieren: ${error instanceof Error ? error.message : String(error)}`);
//     }
//   }
// };

// export const db: DbInstance = createDbInstance();

// export { eq };
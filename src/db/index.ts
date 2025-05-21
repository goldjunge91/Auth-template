import { drizzle as drizzleBetterSqlite3, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient, Client } from '@libsql/client'; // Geändert
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema/sqlite/index.sql";

// Typdefinition für die Datenbankinstanz, die entweder SQLite oder TursoDB sein kann.
type DbInstance = LibSQLDatabase<typeof schema> | BetterSQLite3Database<typeof schema>;

const createDbConnection = (): DbInstance => {
  const nodeEnv = process.env.NODE_ENV;
  // Logger ist standardmäßig nur in der Entwicklungsumgebung aktiv.
  const enableLogger = nodeEnv === 'development';

  if (nodeEnv === 'development') {
    console.log("DB: Entwicklungsmodus - Verwende lokale SQLite-Datenbank.");
    let sqlitePathFromEnv = process.env.SQLITE_DB_PATH;

    if (!sqlitePathFromEnv) {
      // Fallback, falls SQLITE_DB_PATH nicht gesetzt ist, obwohl Sie es erwarten.
      console.warn("SQLITE_DB_PATH ist nicht in den Umgebungsvariablen gesetzt. Verwende Standardpfad './src/db/local.db'.");
      sqlitePathFromEnv = './src/db/local.db'; // Oder Ihr bevorzugter Standard, falls nicht per Env gesetzt
    }

    // Entferne das "file:" Präfix, falls vorhanden
    if (sqlitePathFromEnv.startsWith("file:")) {
      sqlitePathFromEnv = sqlitePathFromEnv.substring(5);
    }

    // Wandle den Pfad in einen absoluten Pfad um.
    const resolvedSqlitePath = path.resolve(sqlitePathFromEnv);

    console.log(`SQLite-Pfad wird verwendet: ${resolvedSqlitePath}`);
    try {
      // Extrahiere das Verzeichnis aus dem Pfad.
      const dir = path.dirname(resolvedSqlitePath);

      // Stelle sicher, dass das Verzeichnis existiert.
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Verzeichnis ${dir} wurde erstellt.`);
      }

      const sqlite = new Database(resolvedSqlitePath);
      console.log(`SQLite-Datenbank erfolgreich initialisiert unter: ${resolvedSqlitePath}`);
      return drizzleBetterSqlite3(sqlite, { schema, logger: enableLogger });
    } catch (error) {
      console.error(`Fehler beim Initialisieren der SQLite-Datenbank unter ${resolvedSqlitePath}:`, error);
      throw new Error(`Konnte SQLite-Datenbank nicht initialisieren (${resolvedSqlitePath}): ${error instanceof Error ? error.message : String(error)}`);
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
      console.warn(
        'TURSO_AUTH_TOKEN ist nicht gesetzt. Dies könnte für die Verbindung zu TursoDB erforderlich sein.'
      );
    }

    try {
      const client: Client = createClient({ // Geändert
        url: tursoUrl,
        authToken: tursoAuthToken,
      });
      return drizzle(client, { schema, logger: enableLogger });
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
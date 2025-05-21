import { getDbUrl, isDatabaseSqlite } from '@/lib/utilities/constants';
import * as pgSchemaImport from './schema/postgres';
import * as sqliteSchemaImport from './schema/sqlite/index.sql';

// Drizzle Importe
import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
// Importiere die spezifischen eq-Funktionen und SQL/Column Typen
import { eq, SQL, Column, AnyColumn } from 'drizzle-orm';


// Holen der Datenbankverbindungszeichenfolge
const dbUrl = getDbUrl();
console.log(`Verwende Datenbank: ${dbUrl}`);

// Typdefinitionen für eine bessere Abstraktion
type GenericDatabase = NodePgDatabase<typeof pgSchemaImport> | BetterSQLite3Database<typeof sqliteSchemaImport>;
type GenericSchema = typeof pgSchemaImport | typeof sqliteSchemaImport;
type GenericEq = (col: AnyColumn, val: any) => SQL;

let db: GenericDatabase;
let schema: GenericSchema;
let genericEq: GenericEq;

if (isDatabaseSqlite()) {
  console.log('SQLite wird verwendet (lokale Entwicklung)');
  // SQLite-spezifische Konfiguration
  const sqlitePath = dbUrl.replace('sqlite:', '');
  const sqlite = new Database(sqlitePath);
  db = drizzleSqlite(sqlite, { schema: sqliteSchemaImport }) as BetterSQLite3Database<typeof sqliteSchemaImport>;
  schema = sqliteSchemaImport;
  genericEq = eq as GenericEq;
} else {
  console.log('PostgreSQL wird verwendet');
  // PostgreSQL-spezifische Konfiguration
  const pool = new Pool({
    connectionString: dbUrl,
  });
  db = drizzlePg(pool, { schema: pgSchemaImport }) as NodePgDatabase<typeof pgSchemaImport>;
  schema = pgSchemaImport;
  genericEq = eq as GenericEq;
}

export { db, schema, genericEq };

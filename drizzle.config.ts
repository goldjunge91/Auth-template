// import * as dotenv from 'dotenv';
// import { isDatabaseSqlite } from "./src/lib/utilities/constants";

// dotenv.config({
//   path: '.env',
// });

// // Verwende die richtige Konfiguration basierend auf dem Datenbanktyp
// // Diese Datei delegiert nur an die spezifischen Konfigurationsdateien
// if (isDatabaseSqlite()) {
//   module.exports = require('./drizzle.sqlite.config');
// } else {
//   module.exports = require('./drizzle.pg.config');
// }
import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { join } from 'node:path';

dotenv.config({
  path: '.env',
});

// SQLite Konfiguration
export default defineConfig({
  schema: './src/db/schema/sqlite/*.sql.ts',
  out: './src/db/drizzle/sqlite',
    dialect: "sqlite",
      dbCredentials: {
        url: join(process.cwd(), './src/db/local.db'),
      },
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations-sql__",
  },
});

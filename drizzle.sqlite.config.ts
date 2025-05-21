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

import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { join } from 'path';

dotenv.config({
  path: '.env',
});

// Lokaler Datenbankpfad als Fallback
const localDbPath = join(process.cwd(), './src/db/local.db');

// Verwende DATABASE_URL aus Umgebungsvariablen, oder lokale Datei als Fallback
const dbUrl = process.env.DATABASE_URL || localDbPath;

export default defineConfig({
  dialect: "postgresql",
  schema: './src/db/schema/*',
  out: './src/db/drizzle',
  driver: "pglite",
  dbCredentials: {
    url: dbUrl,
  },
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations__",
    schema: 'public',
  },
  entities: {
    roles: {
      provider: '',
      exclude: [],
      include: []
    }
  },
  verbose: true,
  strict: true,
  breakpoints: true,
});
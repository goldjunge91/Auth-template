import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({
  path: '.env',
});

// PostgreSQL Konfiguration
export default defineConfig({
  dialect: "postgresql",
  schema: './src/db/schema/postgres/*',
  out: './src/db/drizzle/postgres',
  driver: "pglite",
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/local_db',
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

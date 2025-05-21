// import * as dotenv from 'dotenv';
// import { defineConfig } from 'drizzle-kit';
// import { join } from 'path';
// import { getDbUrl, isDatabaseSqlite } from "./src/lib/utilities/constants"

// dotenv.config({
//   path: '.env',
// });

// // SQLite Konfiguration
// const sqliteConfig = defineConfig({
//   dialect: "sqlite",
//   schema: './src/db/schema/sqlite/*.sql.ts',
//   out: './src/db/drizzle/sqlite',
//   driver: "better-sqlite",
//   dbCredentials: {
//     url: join(process.cwd(), './src/db/local.db'),
//   },
//   migrations: {
//     prefix: "timestamp",
//     table: "__drizzle_migrations__",
//   },
//   verbose: true,
//   strict: true,
//   breakpoints: true,
// });

// // PostgreSQL Konfiguration
// const postgresConfig = defineConfig({
//   dialect: "postgresql",
//   schema: './src/db/schema/*',
//   out: './src/db/drizzle/postgres',
//   driver: "pglite",
//   dbCredentials: {
//     url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/local_db',
//   },
//   migrations: {
//     prefix: "timestamp",
//     table: "__drizzle_migrations__",
//     schema: 'public',
//   },
//   entities: {
//     roles: {
//       provider: '',
//       exclude: [],
//       include: []
//     }
//   },
//   verbose: true,
//   strict: true,
//   breakpoints: true,
// });

// // Exportiere die passende Konfiguration basierend auf der aktiven Datenbank
// export default isDatabaseSqlite() ? sqliteConfig : postgresConfig;

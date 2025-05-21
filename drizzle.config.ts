import * as dotenv from 'dotenv';
import { isDatabaseSqlite } from "./src/lib/utilities/constants";

dotenv.config({
  path: '.env',
});

// Verwende die richtige Konfiguration basierend auf dem Datenbanktyp
// Diese Datei delegiert nur an die spezifischen Konfigurationsdateien
if (isDatabaseSqlite()) {
  module.exports = require('./drizzle.sqlite.config');
} else {
  module.exports = require('./drizzle.pg.config');
}
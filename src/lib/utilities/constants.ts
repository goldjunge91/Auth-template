import { join } from 'path';

export function getDbUrl() {
	// Wenn die Umgebung Produktion ist, verwenden wir die DATABASE_URL
	if (process.env.NODE_ENV === "production") {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL ist nicht für die Produktionsumgebung konfiguriert");
		}
		return process.env.DATABASE_URL;
	}

	// Für die Entwicklung bevorzugen wir DEV_DATABASE_URL, wenn gesetzt
	if (process.env.DEV_DATABASE_URL) {
		return process.env.DEV_DATABASE_URL;
	}

	// Als letzten Fallback verwenden wir eine lokale SQLite-Datei
	const localDbPath = join(process.cwd(), './src/db/local.db'); 
	return `sqlite:${localDbPath}`;
}

export function isDatabaseSqlite(): boolean {
	const dbUrl = getDbUrl();
	return dbUrl.startsWith('sqlite:');
}
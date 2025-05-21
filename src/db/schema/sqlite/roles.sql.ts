// SQLite unterstützt keine Enumerationen wie PostgreSQL, daher verwenden wir eine einfache Liste
export const ROLES = ['admin', 'manager', 'user'] as const;
export type Role = typeof ROLES[number];

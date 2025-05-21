import { createId } from '@paralleldrive/cuid2';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: integer('emailVerified', { mode: 'timestamp' }),
  image: text('image'),
  passwordHash: text('passwordHash'),
  role: text('role').default('user'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const roles = pgEnum('roles', ['admin', 'manager', 'user']);

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createBrotliDecompress()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('passwordHash'),
  role: roles('role').default('user'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow(),
});

/**
 * @remarks
 * TODO: Consider adding more fields to the user schema, such as phone number or address.
 * TODO: Explore options for more granular role-based access control.
 */
import { createId } from '@paralleldrive/cuid2';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Defines the schema for the 'users' table in the SQLite database.
 */
export const users = sqliteTable('users', {
  /**
   * Unique identifier for the user.
   * @remarks `.$defaultFn(() => createId())`: Automatically generates a CUID2 for new records.
   */
  id: text('id').primaryKey().$defaultFn(() => createId()),
  /** User's full name (optional). */
  name: text('name'),
  /** User's email address. Must be unique and cannot be null. */
  email: text('email').unique().notNull(),
  /**
   * Timestamp indicating when the user's email address was verified (optional).
   * @remarks Stored as an integer, but treated as a timestamp in JavaScript.
   */
  emailVerified: integer('emailVerified', { mode: 'timestamp' }),
  /** URL of the user's profile image (optional). */
  image: text('image'),
  /** Hashed password for users who sign up with credentials (optional). */
  passwordHash: text('passwordHash'),
  /** User's role (e.g., 'admin', 'user'). Defaults to 'user'. */
  role: text('role').default('user'),
  /**
   * Timestamp indicating when the user account was created.
   * @remarks
   * `.$defaultFn(() => new Date())`: Automatically sets the current date and time for new records.
   * Stored as an integer, but treated as a timestamp in JavaScript.
   */
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  /**
   * Timestamp indicating when the user account was last updated.
   * @remarks
   * `.$defaultFn(() => new Date())`: Automatically sets the current date and time for new records and on updates.
   * Stored as an integer, but treated as a timestamp in JavaScript.
   * TODO: Ensure this field is automatically updated on every record modification by the database trigger or application logic if not handled by ORM.
   */
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

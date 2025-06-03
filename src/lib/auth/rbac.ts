import { Session } from 'next-auth';

/**
 * Checks if the user in the current session has one of the specified roles.
 *
 * @param session - The current user session object, or `null` if no session exists.
 *                  The session object is expected to have a `user` property,
 *                  which in turn has a `role` property (string).
 * @param roles - An array of role strings to check against the user's role.
 * @returns `true` if the user's role is included in the `roles` array, `false` otherwise.
 *          Returns `false` if the session is `null`, or if `session.user` or `session.user.role` is not defined.
 */
export function hasRole(session: Session | null, roles: string[]): boolean {
  if (!session?.user?.role) {
    return false;
  }
  return roles.includes(session.user.role);
}

/**
 * Checks if the user in the current session has the specified role.
 *
 * @param session - The current user session object, or `null` if no session exists.
 *                  The session object is expected to have a `user` property,
 *                  which in turn has a `role` property (string).
 * @param role - The role string to check against the user's role.
 * @returns `true` if the user's role matches the specified `role`, `false` otherwise.
 *          Returns `false` if the session is `null`, or if `session.user` or `session.user.role` is not defined.
 */
export function isRole(session: Session | null, role: string): boolean {
  if (!session?.user?.role) {
    return false;
  }
  return session.user.role === role;
}
import { Session } from 'next-auth'; // Assuming Session type is available

/**
 * Checks if the user in the current session has one of the specified roles.
 *
 * @param session The current user session object, or null if no session.
 * @param roles An array of role strings to check against.
 * @returns True if the user has one of the specified roles, false otherwise.
 */
export function hasRole(session: Session | null, roles: string[]): boolean {
  if (!session || !session.user || !session.user.role) {
    return false;
  }
  return roles.includes(session.user.role);
}

/**
 * Checks if the user in the current session has the specified role.
 *
 * @param session The current user session object, or null if no session.
 * @param role The role string to check against.
 * @returns True if the user has the specified role, false otherwise.
 */
export function isRole(session: Session | null, role: string): boolean {
  if (!session || !session.user || !session.user.role) {
    return false;
  }
  return session.user.role === role;
}
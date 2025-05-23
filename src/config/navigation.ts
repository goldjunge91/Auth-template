// @/config/navigation.ts

export interface NavigationItem {
  href: string;
  label: string;
  icon?: string;
  roles?: string[]; // Für rollenbasierte Sichtbarkeit
}

/**
 * Navigation configuration for UI components
 * Separated from routing logic for better separation of concerns
 */
export const navigationConfig = {
  /**
   * Öffentliche Navigation - für alle Benutzer sichtbar
   */
  public: [
    { href: '/', label: 'Startseite' },
    { href: '/file-handling-demo', label: 'Datei-Demo' },
    { href: '/animated-border-trail-demo', label: 'Animations-Demo' },
    { href: '/file-upload', label: 'Datei-Upload' },
    { href: '/impressum', label: 'Impressum' },
    { href: '/tests', label: 'Tests' },
  ] as NavigationItem[],

  /**
   * Authentifizierte Navigation - nur für eingeloggte Benutzer
   */
  authenticated: [
    { href: '/profile', label: 'Profil' },
    // { href: '/dashboard', label: 'Dashboard' },
    // { href: '/bookings', label: 'Meine Termine' },
    // { href: '/settings', label: 'Einstellungen' },
  ] as NavigationItem[],

  /**
   * Admin Navigation - nur für Administratoren
   */
  admin: [
    { 
      href: '/admin-dashboard', 
      label: 'Admin Dashboard',
      icon: 'LayoutDashboard',
      roles: ['admin']
    },
    { 
      href: '/user-management', 
      label: 'Benutzerverwaltung',
      icon: 'Users',
      roles: ['admin']
    },
  ] as NavigationItem[],

  /**
   * Manager Navigation - für Manager und Admins
   */
  manager: [
    // Hier können Manager-spezifische Links hinzugefügt werden
  ] as NavigationItem[],
};

/**
 * Hilfsfunktion zur Generierung lesbarer Labels aus Pfaden
 * @param path Der URL-Pfad
 * @returns Ein lesbares Label
 */
export const generateLabelFromPath = (path: string): string => {
  if (path === "/") return "Startseite";
  const name = path.substring(path.lastIndexOf("/") + 1);
  // Ersetze Bindestriche durch Leerzeichen und mache den ersten Buchstaben jedes Wortes groß
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Rolle-basierte Navigation-Logik
 * @param role Die Benutzerrolle
 * @returns Array von Navigation-Items basierend auf der Rolle
 */
export const getNavigationForRole = (role?: string): NavigationItem[] => {
  const navigation = [...navigationConfig.public];
  
  if (role) {
    navigation.push(...navigationConfig.authenticated);
    
    if (role === 'admin') {
      navigation.push(...navigationConfig.admin);
      navigation.push(...navigationConfig.manager);
    } else if (role === 'manager') {
      navigation.push(...navigationConfig.manager);
    }
  }
  
  return navigation;
};

/**
 * Legacy-Kompatibilität: Migration von den alten Exporten
 * @deprecated Diese Funktionen werden in der Refaktorierung entfernt
 */

// Für Rückwärtskompatibilität während der Migration
export const BASE_NAV_ITEMS = navigationConfig.public.map(({ href, label }) => ({ href, label }));
export const AUTH_NAV_ITEMS = navigationConfig.authenticated.map(({ href, label }) => ({ href, label }));
export const ADMIN_NAV_ITEMS = navigationConfig.admin;

/**
 * @deprecated Verwende stattdessen getNavigationForRole
 */
export const getRoleBasedNavItems = (role?: string) => {
  return getNavigationForRole(role).map(({ href, label }) => ({ href, label }));
};

// @/config/routes.ts

/**
 * These routes are public and don't need authentication
 * @type {string[]}
 */
export const publicRoutes = [
  // Main pages
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms-of-service',
  '/privacy-policy',
  '/contact',
  '/impressum',
  
  // Demo- und Testseiten
  '/file-handling-demo',
  '/animated-border-trail-demo',
  '/file-upload',
  '/file-upload-demo',
  '/tests',
  '/upload',
  '/grandSlam',
  
  // SEO und System
  '/robots.txt',
  '/sitemap',
  
  // API-Routen
  '/api/auth',
  '/api/uploadthing',
];

/**
 * These routes are used for authentication,
 * redirect logged-in users to DEFAULT_LOGIN_REDIRECT
 * @type {string[]}
 */
export const authRoutes = [
  // Authentication routes
  '/login',
  '/register',
  '/reset-password',
];

/**
 * The prefix for API authentication routes
 * Routes that start with this prefix are used for api
 * authentication purposes
 * @type {string}
 */
export const apiAuthPrefix = '/api/auth';

/**
 * Default redirect path for logged-in users
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = '/profile';

/**
 * Default Allowed Redirects from callbackUrl searchParams
 * @type {string}
 */
export const ALLOWED_REDIRECTS = ['/server', '/admin', '/client', '/settings'];

/**
 * Protected routes that require authentication
 * @type {string[]}
 */
export const protectedRoutes = [
  // Authentifizierte Benutzer
  '/profile',
  
  // Manager-Routen
  '/user-management',
  
  // Admin-Routen
  '/admin-dashboard',
];

/**
 * OAuth callback routes that should bypass middleware
 * @type {string[]}
 */
export const oauthCallbackRoutes = [
  '/api/auth/callback/google',
  '/api/auth/callback/github',
  // Add other OAuth providers here as needed
];

// Hilfsfunktion, um ein lesbares Label aus einem Pfad zu generieren
export const generateLabelFromPath = (path: string): string => {
  if (path === "/") return "Startseite";
  const name = path.substring(path.lastIndexOf("/") + 1);
  // Ersetze Bindestriche durch Leerzeichen und mache den ersten Buchstaben jedes Wortes groß
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Navigation basierend auf tatsächlich existierenden Seiten im App-Router
export const BASE_NAV_ITEMS = [
  { href: '/', label: 'Startseite' },
  { href: '/file-handling-demo', label: 'Datei-Demo' },
  { href: '/animated-border-trail-demo', label: 'Animations-Demo' },
  { href: '/file-upload', label: 'Datei-Upload' },
  { href: '/impressum', label: 'Impressum' },
  { href: '/tests', label: 'Tests' },
];

// Benutzer-spezifische Navigationsseiten
export const AUTH_NAV_ITEMS = [
  { href: '/profile', label: 'Profil' },
  // { href: '/dashboard', label: 'Dashboard' },
  // { href: '/bookings', label: 'Meine Termine' },
  // { href: '/settings', label: 'Einstellungen' },
];

// Admin-spezifische Navigationsseiten mit Icons
export const ADMIN_NAV_ITEMS = [
  {
    href: '/admin-dashboard',
    label: 'Admin Dashboard',
    icon: 'LayoutDashboard',
  },
  {
    href: '/user-management',
    label: 'Benutzerverwaltung',
    icon: 'Users',
  },
];

// Rolle-basierte Navigationshilfe für die Navbar
export const getRoleBasedNavItems = (role?: string) => {
  // Standardmäßig BASE_NAV_ITEMS zurückgeben
  const navItems = [...BASE_NAV_ITEMS];
  
  // Füge authentifizierte Routen für eingeloggte Benutzer hinzu
  if (role) {
    navItems.push(...AUTH_NAV_ITEMS);
    
    // Füge Admin-spezifische Routen hinzu, wenn Benutzer Admin ist
    if (role === 'admin') {
      // Einfachere Version ohne Icons für Menüs
      const adminItems = ADMIN_NAV_ITEMS.map(({ href, label }) => ({ href, label }));
      navItems.push(...adminItems);
    }
    
    // Füge Manager-spezifische Routen hinzu, wenn Benutzer Manager ist
    if (role === 'manager' || role === 'admin') {
      // Hier könnten Manager-spezifische Routen hinzugefügt werden, wenn benötigt
    }
  }
  
  return navItems;
};

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
 * @type {string[]}
 */
export const ALLOWED_REDIRECTS = ['/profile', '/admin-dashboard', '/user-management'];

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

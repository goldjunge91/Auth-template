# Refaktorierungs-Plan: Separation of Concerns für Routing und Navigation

## 🎯 Ziel der Refaktorierung

Aktuell vermischt die `routes.ts`-Datei Routing-Logik mit UI-Navigation-Daten, was zu schlechter Trennung der Verantwortlichkeiten führt. Diese Refaktorierung implementiert eine saubere Separation of Concerns basierend auf bewährten Praktiken.

### **Hauptprobleme der aktuellen Implementierung:**
- ❌ `routes.ts` mischt Routing-Konfiguration mit UI-Navigation-Daten
- ❌ `navbar.tsx` enthält komplexe Logik zur Bestimmung sichtbarer Links
- ❌ Middleware schützt nur einzelne Routen, nutzt nicht die zentrale Route-Konfiguration
- ❌ Keine klare Trennung zwischen Authentifizierung, Autorisierung und Navigation

### **Ziele nach der Refaktorierung:**
- ✅ **Routing-Konfiguration**: Nur für Middleware/Zugriffskontrolle
- ✅ **Navigation-UI-Daten**: Separate Konfiguration für Komponenten
- ✅ **Autorisierungs-Logik**: Rollenbasierte Features isoliert
- ✅ **Komponenten-Architektur**: Klare Aufgabentrennung

---

## 📁 Neue Dateistruktur

```
src/
├── config/
│   ├── routes.ts                   # ✨ NUR Routing-Definitionen
│   └── navigation.ts               # ✨ UI-Navigation-Konfiguration
├── components/
│   └── layout/
│       ├── navbar.tsx              # 🔄 Container-Komponente (vereinfacht)
│       ├── navigation-menu.tsx     # ✨ Client-Komponente für Navigation
│       └── user-avatar-menu.tsx    # ✨ Server-Komponente für Benutzer-Dropdown
├── middleware.ts                   # 🔄 Vollständige Middleware-Implementierung
└── lib/auth/
    ├── rbac.ts                     # ✅ Bereits gut strukturiert
    └── auth-utils.ts               # ✨ Erweiterte Autorisierungs-Utils
```

**Legende:**
- ✨ Neu erstellt
- 🔄 Refaktoriert
- ✅ Bleibt unverändert

---

## 🔧 Implementierungs-Schritte

### **Schritt 1: routes.ts refaktorieren**

**Aktueller Zustand:** Mischt Routing und UI-Navigation
```typescript
// ❌ Problem: UI-Navigation in Routing-Datei
export const BASE_NAV_ITEMS = [
  { href: '/', label: 'Startseite' },
  // ...
];
export const getRoleBasedNavItems = (role?: string) => { /* ... */ };
```

**Neuer Zustand:** Nur Routing-Definitionen
```typescript
/**
 * These routes are public and don't need authentication
 * @type {string[]}
 */
export const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms-of-service',
  '/privacy-policy',
  '/contact',
  '/impressum',
  '/file-handling-demo',
  '/animated-border-trail-demo',
  '/file-upload',
  '/file-upload-demo',
  '/tests',
  '/upload',
  '/grandSlam',
  '/robots.txt',
  '/sitemap',
  '/api/auth',
  '/api/uploadthing',
];

/**
 * These routes are used for authentication,
 * redirect logged-in users to DEFAULT_LOGIN_REDIRECT
 * @type {string[]}
 */
export const authRoutes = [
  '/login',
  '/register',
  '/reset-password',
];

/**
 * Protected routes that require authentication
 * @type {string[]}
 */
export const protectedRoutes = [
  '/profile',
  '/admin-dashboard',
  '/user-management',
];

/**
 * The prefix for API authentication routes
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
export const ALLOWED_REDIRECTS = ['/profile', '/admin-dashboard', '/user-management'];

/**
 * OAuth callback routes that should bypass middleware
 * @type {string[]}
 */
export const oauthCallbackRoutes = [
  '/api/auth/callback/google',
  '/api/auth/callback/github',
];
```

---

### **Schritt 2: Navigation-Konfiguration separieren**

**Neue Datei:** `src/config/navigation.ts`
```typescript
export interface NavigationItem {
  href: string;
  label: string;
  icon?: string;
  roles?: string[]; // Für rollenbasierte Sichtbarkeit
}

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
 */
export const generateLabelFromPath = (path: string): string => {
  if (path === "/") return "Startseite";
  const name = path.substring(path.lastIndexOf("/") + 1);
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Rolle-basierte Navigation-Logik
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
```

---

### **Schritt 3: Middleware implementieren**

**Aktueller Zustand:** Minimale Middleware
```typescript
// ❌ Nur ein Matcher, keine echte Route-Logik
export { default } from "next-auth/middleware";
export const config = { matcher: ["/profile"] };
```

**Neuer Zustand:** Vollständige Middleware basierend auf routes.ts
```typescript
import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth-options';
import { 
  authRoutes, 
  DEFAULT_LOGIN_REDIRECT, 
  publicRoutes, 
  protectedRoutes,
  apiAuthPrefix,
  oauthCallbackRoutes 
} from '@/config/routes';

const { auth } = NextAuth(authOptions);

export default auth(async (req) => {
  const { nextUrl } = req;
  const ip = req.ip ?? '127.0.0.1';
  
  const isLoggedIn = !!req.auth;
  
  // Prüfe Route-Typen
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
  const isOAuthCallback = oauthCallbackRoutes.includes(nextUrl.pathname);
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  
  // OAuth Callbacks durchlassen
  if (isOAuthCallback) {
    return NextResponse.next();
  }
  
  // API Auth Routen durchlassen
  if (isApiAuthRoute) {
    return NextResponse.next();
  }
  
  // Auth-Routen: Redirect wenn bereits eingeloggt
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    
    // IP-Header für Rate Limiting hinzufügen
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('request-ip', ip);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Geschützte Routen: Redirect zu Login wenn nicht eingeloggt
  if (!isLoggedIn && isProtectedRoute) {
    let callbackUrl = nextUrl.pathname;
    
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }
  
  // Öffentliche Routen und andere durchlassen
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

---

### **Schritt 4: Navbar-Komponenten aufteilen**

#### **4.1 Hauptcontainer: navbar.tsx**
```typescript
import type { ReactNode } from 'react';
import { NavigationMenu } from './navigation-menu';
import { UserAvatarMenu } from './user-avatar-menu';

export const Navbar = ({ children }: { children?: ReactNode }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <UserCircle className="h-6 w-6" />
          <span className="font-bold inline-block">YourAppName</span>
        </Link>
        
        {/* Navigation */}
        <NavigationMenu />
        
        {/* Zusätzliche Inhalte */}
        {children}
        
        {/* Benutzer-Bereich */}
        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <UserAvatarMenu />
        </div>
      </div>
    </header>
  );
};
```

#### **4.2 Navigation: navigation-menu.tsx**
```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { getNavigationForRole } from '@/config/navigation';

export const NavigationMenu = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  
  const navigationItems = getNavigationForRole(userRole);
  
  return (
    <nav className="flex flex-1 items-center space-x-4 lg:space-x-6">
      {navigationItems.map((item) => (
        <Button 
          key={item.href}
          asChild 
          variant={pathname === item.href ? 'default' : 'ghost'}
        >
          <Link href={item.href} prefetch={false}>
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
};
```

#### **4.3 Benutzer-Menu: user-avatar-menu.tsx**
```typescript
import 'server-only';
import { ExitIcon } from '@radix-ui/react-icons';
import { FaUser } from 'react-icons/fa';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogoutButton } from '@/components/auth/logout-button';
import { currentSessionUser } from '@/lib/auth/auth-utils';

export const UserAvatarMenu = async () => {
  const user = await currentSessionUser();
  
  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={user.image || ''} />
          <AvatarFallback className='bg-primary'>
            <FaUser className='text-primary-foreground' />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profil</Link>
        </DropdownMenuItem>
        <LogoutButton>
          <DropdownMenuItem>
            <ExitIcon className='mr-2 h-4 w-4' />
            Logout
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

### **Schritt 5: Auth-Utils erweitern**

**Neue Datei:** `src/lib/auth/auth-utils.ts`
```typescript
import { auth } from '@/auth';
import { hasRole, isRole } from './rbac';

/**
 * Server-seitige Session-Utilities
 */
export const currentSessionUser = async () => {
  const session = await auth();
  return session?.user;
};

export const currentSession = async () => {
  return await auth();
};

/**
 * Autorisierungs-Helpers
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await currentSession();
  return !!session?.user;
};

export const hasAnyRole = async (roles: string[]): Promise<boolean> => {
  const session = await currentSession();
  return hasRole(session, roles);
};

export const isUserRole = async (role: string): Promise<boolean> => {
  const session = await currentSession();
  return isRole(session, role);
};

export const isAdmin = async (): Promise<boolean> => {
  return await isUserRole('admin');
};

export const isManager = async (): Promise<boolean> => {
  return await hasAnyRole(['manager', 'admin']);
};
```

---

## ✅ Vorteile der neuen Architektur

### **1. Single Responsibility Principle**
- 📁 `routes.ts`: Nur Routing-Definitionen
- 📁 `navigation.ts`: Nur UI-Navigation-Daten
- 📁 Komponenten: Jede hat eine klare Aufgabe

### **2. Bessere Testbarkeit**
- 🧪 Middleware kann isoliert getestet werden
- 🧪 Navigation-Logik ist von UI getrennt
- 🧪 Komponenten sind einfacher zu mocken

### **3. Verbesserte Wartbarkeit**
- 🔧 Routing-Änderungen beeinflussen nicht die UI
- 🔧 Navigation kann unabhängig angepasst werden
- 🔧 Klare Abhängigkeiten zwischen Modulen

### **4. Performance-Optimierungen**
- ⚡ Server-Komponenten wo möglich
- ⚡ Client-Komponenten nur für Interaktivität
- ⚡ Besseres Code-Splitting

### **5. Typsicherheit**
- 🔒 Bessere TypeScript-Unterstützung
- 🔒 Interface-basierte Konfiguration
- 🔒 Compile-Zeit-Validierung

---

## 🚀 Implementierungs-Reihenfolge

### **Phase 1: Grundlagen**
1. ✅ `routes.ts` refaktorieren (nur Routing-Definitionen)
2. ✅ `navigation.ts` erstellen (UI-Navigation-Konfiguration)
3. ✅ `middleware.ts` vollständig implementieren

### **Phase 2: Komponenten**
4. ✅ `navigation-menu.tsx` erstellen
5. ✅ `user-avatar-menu.tsx` erstellen
6. ✅ `navbar.tsx` vereinfachen

### **Phase 3: Utilities**
7. ✅ `auth-utils.ts` erweitern
8. ✅ Tests anpassen und erweitern

### **Phase 4: Validierung**
9. ✅ E2E-Tests für Navigation
10. ✅ Performance-Tests
11. ✅ Dokumentation aktualisieren

---

## 📝 Migrations-Checklist

- [ ] **Schritt 1**: Routes refaktorieren
  - [ ] Navigation-Daten aus `routes.ts` entfernen
  - [ ] Nur Routing-Definitionen beibehalten
  
- [ ] **Schritt 2**: Navigation-Konfiguration
  - [ ] `navigation.ts` erstellen
  - [ ] UI-Navigation-Daten migrieren
  
- [ ] **Schritt 3**: Middleware
  - [ ] Vollständige Middleware implementieren
  - [ ] Route-Schutz testen
  
- [ ] **Schritt 4**: Komponenten
  - [ ] `NavigationMenu` erstellen
  - [ ] `UserAvatarMenu` erstellen
  - [ ] `Navbar` vereinfachen
  
- [ ] **Schritt 5**: Tests
  - [ ] Navigation-Tests anpassen
  - [ ] Middleware-Tests hinzufügen
  - [ ] E2E-Tests aktualisieren

---

## 🔍 Nach der Migration

Nach erfolgreicher Implementierung sollten folgende Verbesserungen sichtbar sein:

- **Klarere Codebase**: Jede Datei hat eine eindeutige Verantwortlichkeit
- **Einfachere Tests**: Isolierte Funktionen sind leichter zu testen
- **Bessere Performance**: Server/Client-Komponenten optimal genutzt
- **Wartbarkeit**: Änderungen haben geringere Auswirkungen auf andere Teile
- **Typsicherheit**: Bessere IDE-Unterstützung und Fehlerprävention

---

*Erstellt am: $(date)*
*Autor: GitHub Copilot*
*Version: 1.0*

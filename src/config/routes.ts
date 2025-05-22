// @/config/routes.ts

// Die NavItem-Schnittstelle wird nicht mehr benötigt, wenn wir nur Pfad-Strings verwenden.
// export interface NavItem {
//   href: string;
//   label: string;
//   icon?: React.ComponentType<{ className?: string }>;
// }

export interface RoutesConfig {
  publicRoutes: string[];
  authenticatedRoutes: string[]; // Routen für jeden authentifizierten Benutzer
  managerRoutes: string[];     // Routen für Benutzer mit Manager- oder Admin-Rolle
  adminRoutes: string[];       // Routen für Benutzer mit Admin-Rolle
}

export const routesConfig: RoutesConfig = {
  publicRoutes: [
    // Beispiel:
    // "/about",
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/terms-of-service",
    "/privacy-policy",
    "/contact",
    "/impressum",
    "/file-handling-demo",
    "/animated-border-trail-demo",
    "/file-upload",
    "/file-upload-demo",
    "/tests",
    "/upload",
  ],
  authenticatedRoutes: [
    "/profile",
    // "/animated-border-trail-demo",
    // "/file-upload",
    // "/file-upload-demo",
    // "/tests",
    // "/upload",
  ],
  managerRoutes: [
    "/user-management",
  ],
  adminRoutes: [
    "/admin-dashboard",
    // Admins erben auch Manager-Routen, müssen hier also nicht doppelt aufgeführt werden
  ],
};

// Hilfsfunktion, um ein lesbares Label aus einem Pfad zu generieren
export const generateLabelFromPath = (path: string): string => {
  if (path === "/") return "Home";
  const name = path.substring(path.lastIndexOf("/") + 1);
  // Ersetze Bindestriche durch Leerzeichen und mache den ersten Buchstaben jedes Wortes groß
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Hilfsfunktion, um alle zugänglichen Routen für einen Benutzer zu erhalten
export const getAllAccessibleRoutes = (
  isAuthenticated: boolean,
  roles: string[] = []
): string[] => {
  let accessibleRoutes: string[] = [...routesConfig.publicRoutes];

  if (isAuthenticated) {
    accessibleRoutes.push(...routesConfig.authenticatedRoutes);

    // Prüfe auf Admin-Rolle zuerst, da Admins auch Manager-Rechte haben könnten
    if (roles.includes("admin")) {
      accessibleRoutes.push(...routesConfig.adminRoutes);
      accessibleRoutes.push(...routesConfig.managerRoutes); // Admins erben Manager-Routen
    } else if (roles.includes("manager")) { // Geändert von "user_manager" zu "manager"
      accessibleRoutes.push(...routesConfig.managerRoutes);
    }
  }
  // Dedupliziere Routen am Ende, um die korrekte Reihenfolge und Einzigartigkeit sicherzustellen
  return Array.from(new Set(accessibleRoutes));
};

// NEUE STRUKTUR UND FUNKTION FÜR NAVBAR-LINKS

export interface NavbarLink { // Hinzugefügt für Klarheit und Export
  href: string;
  label: string;
}

export interface NavbarLinkGroup {
  // title?: string; // Optional, falls wir Gruppen-Titel im Dropdown bräuchten
  links: NavbarLink[]; // Geändert von paths: string[] zu links: NavbarLink[]
}

export interface NavbarStructure {
  alwaysVisible: NavbarLinkGroup;
  authenticated: NavbarLinkGroup;
  manager: NavbarLinkGroup;
  admin: NavbarLinkGroup;
}

// Definiere hier, welche öffentlichen Routen auch in der Navbar für eingeloggte User erscheinen sollen
const publicNavbarLinksConfig: Array<{path: string, label?: string}> = [ // Geändert zu Array von Objekten
    { path: "/" },
    { path: "/file-handling-demo" },
    { path: "/animated-border-trail-demo", label: "Animation Demo" }, // Beispiel mit benutzerdefiniertem Label
];


export const getNavbarLinks = (
  isAuthenticated: boolean,
  roles: string[] = []
): NavbarStructure => {
  const structure: NavbarStructure = {
    alwaysVisible: { links: [] },
    authenticated: { links: [] },
    manager: { links: [] },
    admin: { links: [] },
  };

  const allAccessible = getAllAccessibleRoutes(isAuthenticated, roles);

  const createNavbarLink = (path: string, label?: string): NavbarLink => ({
    href: path,
    label: label || generateLabelFromPath(path),
  });

  // 1. Fülle "alwaysVisible" mit den definierten öffentlichen Links, die zugänglich sind
  structure.alwaysVisible.links = publicNavbarLinksConfig
    .filter(item => allAccessible.includes(item.path))
    .map(item => createNavbarLink(item.path, item.label));

  if (isAuthenticated) {
    // Hilfsfunktion, um Duplikate basierend auf href zu filtern
    const getUniqueLinks = (targetGroup: NavbarLink[], ...otherGroups: NavbarLinkGroup[]): NavbarLink[] => {
        const existingHrefs = otherGroups.flatMap(group => group.links.map(l => l.href));
        return targetGroup.filter(link => !existingHrefs.includes(link.href));
    };

    // 2. Authenticated-spezifische Links
    const authSpecificPaths = routesConfig.authenticatedRoutes.filter(path => allAccessible.includes(path));
    structure.authenticated.links = getUniqueLinks(
        authSpecificPaths.map(path => createNavbarLink(path)),
        structure.alwaysVisible
    );

    // 3. Manager-spezifische Links
    if (roles.includes("manager") || roles.includes("admin")) {
      const managerSpecificPaths = routesConfig.managerRoutes.filter(path => allAccessible.includes(path));
      structure.manager.links = getUniqueLinks(
        managerSpecificPaths.map(path => createNavbarLink(path)),
        structure.alwaysVisible,
        structure.authenticated
      );
    }

    // 4. Admin-spezifische Links
    if (roles.includes("admin")) {
      const adminSpecificPaths = routesConfig.adminRoutes.filter(path => allAccessible.includes(path));
      structure.admin.links = getUniqueLinks(
        adminSpecificPaths.map(path => createNavbarLink(path)),
        structure.alwaysVisible,
        structure.authenticated,
        structure.manager
      );
    }
  }
  return structure;
};

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
  ],
  authenticatedRoutes: [
    "/profile",
    "/animated-border-trail-demo",
    "/file-upload",
    "/file-upload-demo",
    "/tests",
    "/upload",
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
    accessibleRoutes = [...accessibleRoutes, ...routesConfig.authenticatedRoutes];

    if (roles.includes("admin")) {
      // Admins erhalten Admin-, Manager- und authentifizierte Routen
      accessibleRoutes = [
        ...accessibleRoutes,
        ...routesConfig.adminRoutes,
        ...routesConfig.managerRoutes,
      ];
    } else if (roles.includes("user_manager")) {
      // Manager erhalten Manager- und authentifizierte Routen
      accessibleRoutes = [...accessibleRoutes, ...routesConfig.managerRoutes];
    }
  }
  // Dedupliziere Routen, um mehrfache Links zur selben Seite zu vermeiden
  const uniqueRoutes = Array.from(new Set(accessibleRoutes));
  return uniqueRoutes;
};

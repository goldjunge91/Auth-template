"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Menu as MenuIcon, UserCircle, Moon, Sun, BarChart3, CreditCard, FileText, Users, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BASE_NAV_ITEMS, AUTH_NAV_ITEMS, ADMIN_NAV_ITEMS, getRoleBasedNavItems } from "@/config/routes";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

// Typdefinitionen für Navbar-Links
export interface NavbarLink {
  href: string;
  label: string;
  icon?: string;
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const userRole = useMemo(() => user?.role || "", [user?.role]);
  const { setTheme, theme } = useTheme();

  const [allOrderedLinks, setAllOrderedLinks] = useState<NavbarLink[]>([]);
  const [visibleLinks, setVisibleLinks] = useState<NavbarLink[]>([]);
  const [dropdownLinks, setDropdownLinks] = useState<NavbarLink[]>([]);
  const navRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null); // For individual link measurements

  useEffect(() => {
    if (status === "loading") return;

    // Verwende die neue getRoleBasedNavItems Funktion
    const links = getRoleBasedNavItems(userRole);
    setAllOrderedLinks(links);
  }, [userRole, status]);

  useEffect(() => {
    if (status === "loading" || allOrderedLinks.length === 0) {
      setVisibleLinks([]);
      setDropdownLinks([]);
      return;
    }

    const calculateLinks = () => {
      if (!navRef.current || !linksContainerRef.current) return;

      const availableWidth = navRef.current.offsetWidth;
      let currentWidth = 0;
      const newVisibleLinks: NavbarLink[] = [];
      const newDropdownLinks: NavbarLink[] = [];
      const dropdownTriggerWidthEstimate = 50;
      const adminAreaEstimate = userRole === 'admin' ? 140 : 0; // Platz für den Admin-Bereich reservieren
      const userAreaEstimate = 60; // Platz für den Benutzerbereich reservieren (Theme-Toggle + Profil)

      const linkElements = Array.from(linksContainerRef.current.children) as HTMLElement[];

      // Verfügbare Breite unter Berücksichtigung von Admin- und Userbereich
      const actualAvailableWidth = availableWidth - adminAreaEstimate - userAreaEstimate;

      for (let i = 0; i < allOrderedLinks.length; i++) {
        const link = allOrderedLinks[i];
        const linkElement = linkElements[i];
        const linkWidth = linkElement ? linkElement.offsetWidth + 20 : 100; // Extraplatz für Padding
        const willHaveDropdown = newDropdownLinks.length > 0 || (i < allOrderedLinks.length - 1);
        const spaceForTrigger = willHaveDropdown ? dropdownTriggerWidthEstimate : 0;

        if (currentWidth + linkWidth < actualAvailableWidth - spaceForTrigger) {
          newVisibleLinks.push(link);
          currentWidth += linkWidth;
        } else {
          newDropdownLinks.push(link);
        }
      }
      setVisibleLinks(newVisibleLinks);
      setDropdownLinks(newDropdownLinks);
    };

    calculateLinks();
    window.addEventListener("resize", calculateLinks);

    return () => {
      window.removeEventListener("resize", calculateLinks);
    };
  }, [allOrderedLinks, status, userRole]);

  if (status === "loading") {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <UserCircle className="h-6 w-6" />
            <span className="font-bold inline-block">YourApp</span>
          </Link>
          <nav className="flex flex-1 items-center space-x-4 lg:space-x-6">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </nav>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </header>
    );
  }

  // Funktion zum Rendern von Navigationslinks
  const renderNavLink = (link: NavbarLink, isDropdownItem = false, keyPrefix = "link") => {
    const className = cn(
      "relative text-foreground hover:text-primary transition-colors group",
      isDropdownItem && "block px-4 py-3 text-sm hover:bg-accent/50 whitespace-normal break-words",
    );

    return (
      <Link
        key={`${keyPrefix}-${link.href}`}
        href={link.href}
        className={className}
      >
        {link.label}
        {!isDropdownItem && (
          <span className="absolute left-0 -bottom-[2px] w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        )}
      </Link>
    );
  };

  // Funktion zum Rendern von Icon-basierten Admin-Links
  const renderIconLink = (icon: string) => {
    switch (icon) {
      case 'BarChart3': return <BarChart3 className="h-5 w-5" />;
      case 'CreditCard': return <CreditCard className="h-5 w-5" />;
      case 'FileText': return <FileText className="h-5 w-5" />;
      case 'Users': return <Users className="h-5 w-5" />;
      case 'LayoutDashboard': return <LayoutDashboard className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  // Vereinfachte Version von Admin-Links ohne Icons
  const adminNavItems = userRole === 'admin' ? ADMIN_NAV_ITEMS.map(({ href, label }) => ({ href, label })) : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Hidden container for measuring link widths */}
      <div ref={linksContainerRef} className="absolute -top-[9999px] left-0 flex opacity-0 pointer-events-none">
        {allOrderedLinks.map(link => renderNavLink(link, false, "measure"))}
      </div>

      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <UserCircle className="h-6 w-6" />
          <span className="font-bold inline-block">YourAppName</span>
        </Link>

        <nav ref={navRef} className="flex flex-1 items-center space-x-4 lg:space-x-6 overflow-hidden">
          {visibleLinks.map((link, i) => renderNavLink(link, false, `nav-${i}`))}
        </nav>

        {dropdownLinks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <MenuIcon className="h-5 w-5" />
                <span className="sr-only">Navigationsmenü öffnen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dropdownLinks.map((link, i) => (
                <DropdownMenuItem key={`dd-${i}-${link.href}`} asChild>
                  {renderNavLink(link, true, `dd-${i}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Theme umschalten</span>
          </Button>
          
          {/* Admin-Bereich-Dropdown, wenn der Benutzer Admin ist */}
          {userRole === 'admin' && (
            <div className="relative group py-2 mx-2">
              <span className="relative group cursor-pointer text-foreground hover:text-primary btn-touch flex items-center h-full">
                Admin-Bereich
                <span className="absolute left-0 -bottom-[2px] w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </span>
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-1 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 bg-background border rounded shadow-lg py-1 z-50">
                {ADMIN_NAV_ITEMS.map((item, i) => (
                  <Link
                    className="block px-4 py-3 text-sm text-foreground hover:text-primary hover:bg-accent/50 whitespace-normal break-words flex items-center"
                    href={item.href}
                    key={`admin-${i}`}
                  >
                    {item.icon && <span className="mr-2">{renderIconLink(item.icon)}</span>}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.image ?? undefined}
                      alt={user.name ?? "User"}
                    />
                    <AvatarFallback>
                      {user.name
                        ? user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Ausloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

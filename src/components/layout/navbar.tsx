"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
// import { usePathname } from "next/navigation";
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
import { ADMIN_NAV_ITEMS, getRoleBasedNavItems } from "@/config/navigation";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Interface defining the structure for a navigation link.
 * @property href - The URL the link points to.
 * @property label - The text displayed for the link.
 * @property icon - (Optional) The name of the icon to display with the link.
 */
export interface NavbarLink {
  href: string;
  label: string;
  icon?: string;
}

/**
 * Main navigation bar component for the application.
 * It handles responsive link display, user authentication status, and theme switching.
 */
export function Navbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const userRole = useMemo(() => user?.role || "", [user?.role]);
  const { setTheme, theme } = useTheme();

  /** State variable to store all navigation links based on user role. */
  const [allOrderedLinks, setAllOrderedLinks] = useState<NavbarLink[]>([]);
  /** State variable to store links that are visible in the navbar. */
  const [visibleLinks, setVisibleLinks] = useState<NavbarLink[]>([]);
  /** State variable to store links that are hidden in the dropdown menu. */
  const [dropdownLinks, setDropdownLinks] = useState<NavbarLink[]>([]);
  /** Ref to the main navigation container, used to measure available width. */
  const navRef = useRef<HTMLDivElement>(null);
  /** Ref to a hidden container used to measure the width of individual links. */
  const linksContainerRef = useRef<HTMLDivElement>(null);

  /**
   * useEffect hook to set `allOrderedLinks` based on user role and authentication status.
   * This effect runs when the user's role or authentication status changes.
   */
  useEffect(() => {
    if (status === "loading") return; // Don't run if authentication status is still loading.

    // Verwende die neue getRoleBasedNavItems Funktion
    const links = getRoleBasedNavItems(userRole);
    setAllOrderedLinks(links);
  }, [userRole, status]);

  /**
   * useEffect hook to calculate which links are visible and which are in the dropdown.
   * This effect runs when `allOrderedLinks`, authentication `status`, or `userRole` changes.
   * It also sets up a resize event listener to recalculate links when the window size changes.
   * @remarks
   * TODO: Refactor the link calculation logic for better readability or performance.
   */
  useEffect(() => {
    if (status === "loading" || allOrderedLinks.length === 0) {
      // If auth status is loading or there are no links, clear visible and dropdown links.
      setVisibleLinks([]);
      setDropdownLinks([]);
      return;
    }

    /**
     * Calculates and updates the visible and dropdown links based on available navbar width.
     */
    const calculateLinks = () => {
      if (!navRef.current || !linksContainerRef.current) return; // Ensure refs are available.

      const availableWidth = navRef.current.offsetWidth; // Total available width in the navbar.
      let currentWidth = 0; // Accumulated width of visible links.
      const newVisibleLinks: NavbarLink[] = []; // Array to store newly calculated visible links.
      const newDropdownLinks: NavbarLink[] = []; // Array to store newly calculated dropdown links.
      const dropdownTriggerWidthEstimate = 50; // Estimated width of the dropdown trigger button.
      const adminAreaEstimate = userRole === 'admin' ? 140 : 0; // Reserved space for the admin area link.
      const userAreaEstimate = 60; // Reserved space for user-specific elements (theme toggle, profile).

      const linkElements = Array.from(linksContainerRef.current.children) as HTMLElement[]; // Get all link elements for width measurement.

      // Calculate the actual available width for navigation links.
      const actualAvailableWidth = availableWidth - adminAreaEstimate - userAreaEstimate;

      // Iterate over all ordered links to determine visibility.
      for (let i = 0; i < allOrderedLinks.length; i++) {
        const link = allOrderedLinks[i];
        const linkElement = linkElements[i];
        const linkWidth = linkElement ? linkElement.offsetWidth + 20 : 100; // Width of the current link (with padding).
        // Check if a dropdown menu will be necessary.
        const willHaveDropdown = newDropdownLinks.length > 0 || (i < allOrderedLinks.length - 1);
        const spaceForTrigger = willHaveDropdown ? dropdownTriggerWidthEstimate : 0; // Space needed for dropdown trigger if it will be shown.

        // If the current link fits within the available width, add it to visible links.
        if (currentWidth + linkWidth < actualAvailableWidth - spaceForTrigger) {
          newVisibleLinks.push(link);
          currentWidth += linkWidth;
        } else {
          // Otherwise, add it to dropdown links.
          newDropdownLinks.push(link);
        }
      }
      setVisibleLinks(newVisibleLinks);
      setDropdownLinks(newDropdownLinks);
    };

    calculateLinks(); // Initial calculation.
    window.addEventListener("resize", calculateLinks); // Recalculate on window resize.

    // Cleanup function to remove the event listener.
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

  /**
   * Helper function to render a navigation link.
   * It handles styling for both regular navbar links and dropdown menu items.
   * @param link - The link object to render.
   * @param isDropdownItem - Boolean indicating if the link is a dropdown item. Defaults to `false`.
   * @param keyPrefix - A prefix for the link's key to ensure uniqueness. Defaults to `"link"`.
   * @returns A React `Link` component.
   */
  const renderNavLink = (link: NavbarLink, isDropdownItem = false, keyPrefix = "link") => {
    const className = cn(
      "relative text-foreground hover:text-primary transition-colors group", // Base styles for the link.
      // Additional styles if the link is a dropdown item.
      isDropdownItem && "block px-4 py-3 text-sm hover:bg-accent/50 whitespace-normal break-words",
    );

    return (
      <Link
        key={`${keyPrefix}-${link.href}`} // Unique key for the link.
        href={link.href} // URL for the link.
        className={className}
      >
        {link.label} {/* Text label for the link. */}
        {/* Underline animation for non-dropdown links on hover. */}
        {!isDropdownItem && (
          <span className="absolute left-0 -bottom-[2px] w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        )}
      </Link>
    );
  };

  /**
   * Helper function to render an icon for admin navigation links based on the icon string.
   * This allows for dynamic icon rendering in the admin dropdown menu.
   * @param icon - The string identifier for the icon.
   * @returns A Lucide icon component or a default icon if no match is found.
   */
  const renderIconLink = (icon: string) => {
    switch (icon) {
      case 'BarChart3': return <BarChart3 className="h-5 w-5" />; // Statistics icon.
      case 'CreditCard': return <CreditCard className="h-5 w-5" />; // Billing/Payments icon.
      case 'FileText': return <FileText className="h-5 w-5" />; // Documents/Reports icon.
      case 'Users': return <Users className="h-5 w-5" />; // Users/Customers icon.
      case 'LayoutDashboard': return <LayoutDashboard className="h-5 w-5" />; // Dashboard icon.
      default: return <FileText className="h-5 w-5" />; // Default icon if no match.
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/** Hidden container for measuring link widths. This is not visible to the user. */}
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

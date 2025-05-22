"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Menu as MenuIcon, UserCircle, Moon, Sun } from "lucide-react";
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
import { getNavbarLinks, type NavbarStructure, type NavbarLink } from "@/config/routes";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const userRoles = useMemo(() => (user?.role ? [user.role] : []), [user?.role]);
  const { setTheme, theme } = useTheme();

  const [allOrderedLinks, setAllOrderedLinks] = useState<NavbarLink[]>([]);
  const [visibleLinks, setVisibleLinks] = useState<NavbarLink[]>([]);
  const [dropdownLinks, setDropdownLinks] = useState<NavbarLink[]>([]);
  const navRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null); // For individual link measurements

  useEffect(() => {
    if (status === "loading") return;

    const navStructure: NavbarStructure = getNavbarLinks(
      isAuthenticated,
      userRoles,
    );
    const newAllOrderedLinks = [
      ...navStructure.alwaysVisible.links,
      ...navStructure.authenticated.links,
      ...navStructure.manager.links,
      ...navStructure.admin.links,
    ];
    setAllOrderedLinks(newAllOrderedLinks);
  }, [isAuthenticated, userRoles, status]);

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

      const linkElements = Array.from(linksContainerRef.current.children) as HTMLElement[];

      for (let i = 0; i < allOrderedLinks.length; i++) {
        const link = allOrderedLinks[i];
        const linkElement = linkElements[i];
        const linkWidth = linkElement ? linkElement.offsetWidth + 16 : 100;
        const willHaveDropdown = newDropdownLinks.length > 0 || (i < allOrderedLinks.length -1) ;
        const spaceForTrigger = willHaveDropdown ? dropdownTriggerWidthEstimate : 0;

        if (currentWidth + linkWidth < availableWidth - spaceForTrigger) {
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
  }, [allOrderedLinks, status]);

  const renderLinkComponent = (link: NavbarLink, isDropdownItem = false, keyPrefix = "link") => (
    <Link
      key={`${keyPrefix}-${link.href}`}
      href={link.href}
      className={cn(
        "nav-link-item text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
        pathname === link.href ? "text-primary" : "text-muted-foreground",
        isDropdownItem && "w-full text-left px-2 py-1.5",
      )}
    >
      {link.label}
    </Link>
  );

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Hidden container for measuring link widths */}
      <div ref={linksContainerRef} className="absolute -top-[9999px] left-0 flex opacity-0 pointer-events-none">
        {allOrderedLinks.map(link => renderLinkComponent(link, false, "measure"))}
      </div>

      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <UserCircle className="h-6 w-6" />
          <span className="font-bold inline-block">YourAppName</span>
        </Link>

        <nav ref={navRef} className="flex flex-1 items-center space-x-4 lg:space-x-6 overflow-hidden">
          {visibleLinks.map(link => renderLinkComponent(link))}
        </nav>

        {dropdownLinks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <MenuIcon className="h-5 w-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dropdownLinks.map(link => (
                <DropdownMenuItem key={`dd-${link.href}`} asChild>
                  {renderLinkComponent(link, true)}
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
            <span className="sr-only">Toggle theme</span>
          </Button>
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
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
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

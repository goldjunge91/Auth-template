"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { siteConfig } from "@/config/site";
import Image from "next/image";
import { getAllAccessibleRoutes, generateLabelFromPath, routesConfig } from "@/config/routes";

export default function Navbar() {
  const { data: session } = useSession();

  const userRole = session?.user?.role;
  const userRoles: string[] = userRole ? [userRole] : [];
  const isAuthenticated = !!session;

  const accessiblePaths = getAllAccessibleRoutes(isAuthenticated, userRoles);

  const navbarPaths = accessiblePaths.filter(path =>
    !routesConfig.publicRoutes.includes(path)
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/apple-think-diff-logo-png-transparent.png"
              alt={`${siteConfig.name} Logo`}
              width={128}
              height={128}
              className="p-0.5 bg-black dark:bg-white rounded-sm"
            />
            <span className="hidden font-bold md:inline-block">
              {siteConfig.name}
            </span>
          </Link>
          {navbarPaths.map((path: string) => (
            <Link key={path} href={path} className="text-gray-300 hover:text-white">
              {generateLabelFromPath(path)}
            </Link>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          {session ? (
            <>
              <Avatar>
                <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User Avatar"} />
                <AvatarFallback>
                  {session.user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground mr-4">Welcome, {session.user?.name}</span>
              <Button onClick={() => signOut()} variant="outline" className="text-foreground hover:bg-accent">
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn()} variant="outline" className="text-foreground hover:bg-accent">
              Sign In
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}

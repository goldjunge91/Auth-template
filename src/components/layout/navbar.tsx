"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { hasRole, isRole } from "@/lib/auth/rbac";
import { ModeToggle } from "./mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { siteConfig } from "@/config/site";
import { Icons } from "@/components/icons";
// import { File } from "lucide-react";
import Image from "next/image"; // Next.js Image Komponente importieren

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              // src="/logo/apple-think-diff-logo-svg-vector.svg" // Pfad zu Ihrem Logo
              src="/logo/apple-think-diff-logo-png-transparent.png" // Pfad zu Ihrem Logo
              alt={`${siteConfig.name} Logo`}
              width={128}
              height={128}
              className="p-0.5 bg-black dark:bg-white rounded-sm" 
            />
            <span className="hidden font-bold md:inline-block">
              {siteConfig.name}
            </span>
          </Link>
          {session && (
            <Link href="/profile" className="text-gray-300 hover:text-white">
              Profil
            </Link>
          )}
          {session && hasRole(session, ["admin", "user_manager"]) && (
            <Link href="/user-management" className="text-gray-300 hover:text-white">
              User Management
            </Link>
          )}
          {session && isRole(session, "admin") && (
            <Link href="/admin-dashboard" className="text-foreground/80 hover:text-foreground">
              Admin Dashboard
            </Link>
          )}
          {/* <Link
            href={siteConfig.links.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Docs
          </Link> */}
        </div>
        <div className="flex items-center space-x-2">
          {session ? (
            <>
              <Avatar>
                <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User Avatar"} />
                <AvatarFallback>
                  {/* Fallback, z.B. Initialen oder ein Icon */}
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
          {/* <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link
              aria-label="GitHub repo"
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.gitHub className="size-4" />
            </Link>
          </Button> */}
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}

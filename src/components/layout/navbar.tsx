"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { hasRole, isRole } from "@/lib/auth/rbac"; // Importiere die RBAC-Funktionen

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-white text-lg font-bold">
            Home
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
            <Link href="/admin-dashboard" className="text-gray-300 hover:text-white">
              Admin Dashboard
            </Link>
          )}
        </div>
        <div>
          {session ? (
            <>
              <span className="text-white mr-4">Welcome, {session.user?.name}</span>
              <Button onClick={() => signOut()} variant="outline" className="text-white hover:bg-gray-700">
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn()} variant="outline" className="text-white hover:bg-gray-700">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

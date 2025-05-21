"use client";

import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserManagementPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-screen flex items-center justify-center"><p>Laden...</p></div>;
  }

  if (!session) {
    return <div className="h-screen flex items-center justify-center"><p>Bitte anmelden, um diese Seite zu sehen.</p></div>;
  }

  // Zugriff erlaubt für 'admin' oder 'user_manager'
  if (!hasRole(session, ["admin", "user_manager"])) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sie haben nicht die erforderlichen Berechtigungen, um diese Seite anzuzeigen.</p>
            <p>Erforderliche Rollen: Admin oder User Manager.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-start min-h-screen pt-16">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Willkommen auf der User Management Seite.</p>
          <p>Diese Seite ist für Administratoren und User Manager zugänglich.</p>
          {/* Inhalt für User Management hier einfügen */}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { isRole } from "@/lib/auth/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-screen flex items-center justify-center"><p>Laden...</p></div>;
  }

  if (!session) {
    return <div className="h-screen flex items-center justify-center"><p>Bitte anmelden, um diese Seite zu sehen.</p></div>;
  }

  // Zugriff nur für 'admin' erlaubt
  if (!isRole(session, "admin")) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Sie haben nicht die erforderlichen Berechtigungen, um diese Seite anzuzeigen.</p>
            <p>Erforderliche Rolle: Admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-start min-h-screen pt-16">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Willkommen im Admin Dashboard.</p>
          <p>Diese Seite ist nur für Administratoren zugänglich.</p>
          {/* Inhalt für Admin Dashboard hier einfügen */}
        </CardContent>
      </Card>
    </div>
  );
}

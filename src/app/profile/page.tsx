"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar"; // Avatar und AvatarImage importieren

export default function ProfilePage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Laden...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center items-start min-h-screen pt-16">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || "Benutzer"} />
            </Avatar>
          </div>
          <CardTitle className="text-2xl">{session.user?.name || "Benutzerprofil"}</CardTitle>
          <CardDescription>{session.user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2">Sitzungsdetails:</h3>
          <div className="bg-muted p-4 rounded-md overflow-x-auto">
            <pre className="text-sm">{JSON.stringify(session, null, 2)}</pre>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          {/* Hier könnten weitere Aktionen oder Links platziert werden */}
        </CardFooter>
      </Card>
    </div>
  );
}
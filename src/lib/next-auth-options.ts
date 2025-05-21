import { AuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import bcryptjs from 'bcryptjs';
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema/sqlite/index.sql";

// Erweitere ggf. den User-Typ, falls deine User-Objekte mehr Felder haben
// Dieser Typ repräsentiert die Struktur eines Benutzerdatensatzes,
// wie er direkt aus der Datenbanktabelle 'users' gelesen wird.
// Er wird automatisch von Drizzle ORM basierend auf dem Datenbankschema abgeleitet (schema inference).
type UserRecord = typeof schema.users.$inferSelect;

interface DbUser extends NextAuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
}

export const authOptions: AuthOptions = {
  // ... providers
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email", placeholder: "john.doe@example.com" }, // Geändert von username zu email
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<DbUser | null> {
        console.log("authorize credentials:", credentials);

        if (!credentials?.email || !credentials.password) {
          console.log("Fehlende Anmeldeinformationen");
          return null;
        }

        try {
          // Direkter Zugriff auf db, schema und eq
          const users = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, credentials.email))
            .limit(1);
          
          const user = users.length > 0 ? users[0] as UserRecord : null;

          if (!user) {
            console.log("Benutzer nicht gefunden:", credentials.email); // Geändert von username zu email
            return null;
          }

          if (!user.passwordHash) {
            console.log("Benutzer hat kein Passwort-Hash gespeichert:", user.email);
            return null;
          }
          
          const isPasswordCorrect = await bcryptjs.compare(credentials.password, user.passwordHash);

          if (isPasswordCorrect) {
            console.log("Benutzer erfolgreich authentifiziert:", user.email);
            // Stelle sicher, dass die ID ein String ist.
            // Die Datenbank könnte eine Zahl zurückgeben, NextAuth erwartet einen String.
            const userIdAsString = typeof user.id === 'number' ? String(user.id) : user.id;

            return {
              id: userIdAsString,
              name: user.name,
              email: user.email,
              image: user.image, // user.image könnte null sein
              role: user.role || "user", 
            } as DbUser;
          } else {
            console.log("Falsches Passwort für Benutzer:", user.email);
            return null;
          }
        } catch (error) {
          console.error("Fehler während der Autorisierung:", error);
          return null;
        }
      },
    }),
  ],
  // ... session config
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      const dbUser = user as DbUser | undefined;
      if (dbUser) {
        token.id = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.name;
        token.picture = dbUser.image;
        token.role = dbUser.role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as DbUser; // Typanpassung
        sessionUser.id = token.id as string;
        sessionUser.email = token.email as string;
        sessionUser.name = token.name as string;
        sessionUser.image = token.picture as string | null | undefined; // Bild aus Token holen
        sessionUser.role = token.role;
      }
      return session;
    },
  },
};
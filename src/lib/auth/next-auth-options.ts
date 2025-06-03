import { AuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import bcryptjs from 'bcryptjs';
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema/sqlite/index.sql";

/**
 * Represents the structure of a user record as read directly from the 'users' database table.
 * This type is automatically inferred by Drizzle ORM based on the database schema.
 * @remarks
 * Erweitere ggf. den User-Typ, falls deine User-Objekte mehr Felder haben (Consider extending the User type if your user objects have more fields).
 */
type UserRecord = typeof schema.users.$inferSelect;

/**
 * Extends the `NextAuthUser` type with additional properties specific to the application's user model.
 * This interface is used to type user objects returned from the `authorize` function
 * and used in the `jwt` and `session` callbacks.
 */
interface DbUser extends NextAuthUser {
  /** User's unique identifier. */
  id: string;
  /** User's name (optional). */
  name?: string | null;
  /** User's email address (optional). */
  email?: string | null;
  /** URL to the user's profile image (optional). */
  image?: string | null;
  /** User's role (e.g., "admin", "user"). */
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
      /**
       * Authenticates a user based on the provided credentials.
       * It looks up the user in the database and compares the provided password with the stored password hash.
       *
       * @param credentials - The credentials provided by the user (email and password).
       * @returns A `DbUser` object if authentication is successful, otherwise `null`.
       * @remarks
       * TODO: Handle different error scenarios more gracefully (e.g., invalid email format, network errors).
       */
      async authorize(credentials): Promise<DbUser | null> {
        console.log("authorize credentials:", credentials);

        if (!credentials?.email || !credentials.password) {
          console.log("Fehlende Anmeldeinformationen");
          // TODO: Return a more specific error message to the client.
          return null;
        }

        try {
          // Look up the user in the database by email.
          const users = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, credentials.email))
            .limit(1);
          
          const user = users.length > 0 ? users[0] as UserRecord : null;

          // If the user is not found, return null.
          if (!user) {
            console.log("Benutzer nicht gefunden:", credentials.email); // Geändert von username zu email
            // TODO: Return a more specific error message to the client.
            return null;
          }

          // If the user does not have a password hash stored, return null.
          // This should ideally not happen for users created through a proper registration process.
          if (!user.passwordHash) {
            console.log("Benutzer hat kein Passwort-Hash gespeichert:", user.email);
            // TODO: Return a more specific error message to the client or handle this case differently.
            return null;
          }

          // Compare the provided password with the stored password hash.
          const isPasswordCorrect = await bcryptjs.compare(credentials.password, user.passwordHash);
          if (isPasswordCorrect) {
            console.log("Benutzer erfolgreich authentifiziert:", user.email);
            // Ensure the user ID is a string, as NextAuth expects.
            const userIdAsString = typeof user.id === 'number' ? String(user.id) : user.id;

            // Return the user object in the DbUser format.
            return {
              id: userIdAsString,
              name: user.name,
              email: user.email,
              image: user.image, // user.image could be null
              role: user.role || "user", // Default to "user" role if not specified.
            } as DbUser;
          } else {
            console.log("Falsches Passwort für Benutzer:", user.email);
            // TODO: Return a more specific error message to the client.
            return null;
          }
        } catch (error) {
          console.error("Fehler während der Autorisierung:", error);
          // TODO: Return a more specific error message to the client.
          return null;
        }
      },
    }),
  ],
  /** Session configuration. */
  session: {
    /** Use JSON Web Tokens for session strategy. */
    strategy: "jwt",
  },

  pages: {
    /** Custom sign-in page URL. */
    signIn: "/login",
  },

  callbacks: {
    /**
     * Invoked when a JWT is created (i.e., on sign in) or updated (i.e., whenever a session is accessed in the client).
     * The `user` parameter is only passed on sign in. For subsequent calls, only `token` is available.
     * This callback is used to persist custom data in the JWT.
     *
     * @param params - Object containing token, user, account, profile, and isNewUser.
     * @param params.token - The JWT token.
     * @param params.user - The user object (only available on sign in).
     * @returns The updated JWT token.
     * @remarks
     * TODO: Consider encrypting sensitive data in the JWT if necessary.
     */
    async jwt({ token, user }) {
      const dbUser = user as DbUser | undefined;
      if (dbUser) {
        // If the user object is available (on sign in), populate the token with custom claims.
        token.id = dbUser.id;
        /** User's email address. */
        token.email = dbUser.email;
        /** User's name. */
        token.name = dbUser.name;
        /** URL to the user's profile image. */
        token.picture = dbUser.image;
        /** User's role, default to "user". */
        token.role = dbUser.role || "user";
      }
      return token;
    },
    /**
     * Invoked when a session is checked (i.e., on every request to `/api/auth/session`).
     * It receives the session and the token as parameters.
     * This callback is used to customize the session object that is returned to the client.
     *
     * @param params - Object containing session and token.
     * @param params.session - The session object.
     * @param params.token - The JWT token.
     * @returns The updated session object.
     * @remarks
     * TODO: Ensure that sensitive data is not unnecessarily exposed to the client-side session.
     */
    async session({ session, token }) {
      if (session.user) {
        // Cast session.user to DbUser to include custom properties.
        const sessionUser = session.user as DbUser;
        // Populate the session user object with data from the token.
        sessionUser.id = token.id as string;
        sessionUser.email = token.email as string;
        sessionUser.name = token.name as string;
        /** Get image from token. */
        sessionUser.image = token.picture as string | null | undefined;
        /** Get role from token. */
        sessionUser.role = token.role as string;
      }
      return session;
    },
  },
};
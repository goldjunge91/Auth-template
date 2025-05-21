import { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        username: { label: "Username", type: "text", placeholder: "John Doe" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("authorize");
        console.log(credentials);

        return {
          id: "1",
          name: "John",
          email: credentials?.username,
        } as User;
      },
    }),
  ],

  // session configuration
  session: {
    strategy: "jwt", // this is the default config
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {      }
      return token;
    },
    async session({ session, token }) {
      session.user.age = token.age;

      return session;
    },
  },
};
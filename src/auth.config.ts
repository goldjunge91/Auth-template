
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string | null;
  }
}

export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, String(credentials.email)),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordsMatch = await bcryptjs.compare(
          String(credentials.password),
          user.passwordHash
        );

        if (passwordsMatch) {
          return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { // User is available during sign-in
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login', // Optional: customize sign-in page
  },
} satisfies NextAuthConfig;

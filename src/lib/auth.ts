import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          select: { id: true, email: true, name: true, passwordHash: true, emailVerified: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        if (!user.emailVerified) return null;

        return { id: user.id, email: user.email, name: user.name || user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) { token.id = user.id; }
      // Refresh subscription status on sign-in or session update
      if (user || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionStatus: true, isAdmin: true },
        });
        if (dbUser) {
          token.subscriptionStatus = dbUser.subscriptionStatus;
          token.isAdmin = dbUser.isAdmin;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; subscriptionStatus?: string; isAdmin?: boolean }).id = token.id as string;
        (session.user as { subscriptionStatus?: string }).subscriptionStatus = token.subscriptionStatus as string;
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};

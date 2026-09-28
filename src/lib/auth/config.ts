import type { NextAuthConfig } from "next-auth";

// Provider-free base config shared with proxy.ts (route protection). The full config in
// src/lib/auth/index.ts adds the Prisma adapter and providers.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "BUYER";
        session.user.status = token.status ?? "ACTIVE";
        session.user.isEmailVerified = Boolean(token.emailVerified);
        session.user.onboardingCompleted = Boolean(token.onboardingCompleted);
        if (token.name !== undefined) session.user.name = token.name;
        if (token.picture !== undefined) session.user.image = token.picture;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

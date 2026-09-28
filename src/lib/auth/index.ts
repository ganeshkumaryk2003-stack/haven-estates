import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { env, googleAuthConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validations/auth";

// How often the JWT re-reads role/status/verification from the database so that suspensions,
// role changes and email verification take effect without forcing a new sign in.
const REFRESH_INTERVAL_MS = 5 * 60_000;

const providers = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        include: { profile: { select: { onboardingCompleted: true } } },
      });
      if (!user?.passwordHash) return null;
      const valid = await verifyPassword(parsed.data.password, user.passwordHash);
      if (!valid) return null;
      if (user.status === "SUSPENDED") return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.profile?.onboardingCompleted ?? false,
      };
    },
  }),
  ...(googleAuthConfigured
    ? [
        Google({
          clientId: env.AUTH_GOOGLE_ID,
          clientSecret: env.AUTH_GOOGLE_SECRET,
          allowDangerousEmailAccountLinking: false,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  // The adapter's type points at the legacy @prisma/client class; the generated Prisma 7 client
  // has the same runtime shape.
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers,
  events: {
    async createUser({ user }) {
      // OAuth users get a profile row as soon as their account is created.
      if (user.id) {
        await prisma.profile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email }, select: { status: true } });
        if (existing?.status === "SUSPENDED") return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "BUYER";
        token.status = user.status ?? "ACTIVE";
        token.emailVerified = Boolean(user.emailVerified);
        token.onboardingCompleted = Boolean(user.onboardingCompleted);
        token.refreshedAt = Date.now();
        return token;
      }

      const stale = !token.refreshedAt || Date.now() - token.refreshedAt > REFRESH_INTERVAL_MS;
      if (token.id && (stale || trigger === "update")) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            name: true,
            image: true,
            role: true,
            status: true,
            emailVerified: true,
            profile: { select: { onboardingCompleted: true } },
          },
        });
        // Deleted or suspended users are signed out on their next request.
        if (!fresh || fresh.status === "SUSPENDED") return null;
        token.name = fresh.name;
        token.picture = fresh.image;
        token.role = fresh.role;
        token.status = fresh.status;
        token.emailVerified = Boolean(fresh.emailVerified);
        token.onboardingCompleted = fresh.profile?.onboardingCompleted ?? false;
        token.refreshedAt = Date.now();
      }
      return token;
    },
  },
});

export { googleAuthConfigured };

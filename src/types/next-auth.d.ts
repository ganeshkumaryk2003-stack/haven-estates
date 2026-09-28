import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      isEmailVerified: boolean;
      onboardingCompleted: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: Date | null;
    onboardingCompleted?: boolean;
  }
}

// next-auth/jwt re-exports @auth/core/jwt, so the JWT interface has to be augmented at the source.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
    onboardingCompleted?: boolean;
    refreshedAt?: number;
  }
}

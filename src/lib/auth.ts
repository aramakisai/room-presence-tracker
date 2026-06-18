import NextAuth, { type DefaultSession } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// OAuth redirect_uri 構築用。未設定だと 0.0.0.0:3000 (Node bind address) が
// 使われてしまい、Authentikログイン後のリダイレクトが壊れる
if (!process.env.AUTH_URL && process.env.NEXT_PUBLIC_APP_URL) {
  process.env.AUTH_URL = process.env.NEXT_PUBLIC_APP_URL;
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isKiosk: boolean;
      studentId: string | null;
      discordId: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Cloudflare Tunnel 経由でリクエストが届くため Host ヘッダーを信頼する
  trustHost: true,
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER,
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      // Request extra scopes for custom claims
      authorization: {
        params: {
          scope: "openid email profile student_id discord groups",
        },
      },
    },
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!profile?.sub) return false;

      const sub = profile.sub as string;
      const name = (profile.name as string | undefined) ?? user.name ?? "Unknown";
      const email = (profile.email as string | undefined) ?? user.email ?? "";

      // Extract custom Authentik claims
      const studentId = (profile.student_id as string | undefined) ?? null;
      // Authentik stores Discord info as a nested object in the `discord` attribute,
      // e.g. { id: "541454672179757066", nick: "...", username: "...", ... }
      const discordAttr = profile.discord as
        | { id?: string; nick?: string; username?: string; avatar_url?: string; global_name?: string }
        | undefined;
      const discordId = discordAttr?.id ?? null;
      const groups = (profile.groups as string[] | undefined) ?? [];
      const isKiosk = groups.includes("kiosk");

      // Upsert user in DB
      await db
        .insert(users)
        .values({ sub, name, email, studentId, discordId, isKiosk })
        .onConflictDoUpdate({
          target: users.sub,
          set: {
            name,
            email,
            studentId,
            discordId,
            isKiosk,
            updatedAt: new Date(),
          },
        });

      return true;
    },

    async jwt({ token, profile }) {
      if (profile?.sub) {
        token.sub = profile.sub as string;
      }
      if (token.sub) {
        // Load fresh data from DB on each token creation
        const dbUser = await db.query.users.findFirst({
          where: eq(users.sub, token.sub),
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.isKiosk = dbUser.isKiosk;
          token.studentId = dbUser.studentId;
          token.discordId = dbUser.discordId;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.isKiosk = (token.isKiosk as boolean) ?? false;
      session.user.studentId = (token.studentId as string | null) ?? null;
      session.user.discordId = (token.discordId as string | null) ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

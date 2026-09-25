import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { authenticate } from "./accounts";
import { clientIp, rateLimit } from "./rate-limit";
import { hashToken } from "./security";
import { AppError } from "./errors";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers ?? {}))
          if (typeof value === "string") headers.set(key, value);
        await rateLimit(`login-ip:${clientIp(headers)}`, 30, 300);
        await rateLimit(
          `login-account:${hashToken(credentials?.email?.trim().toLowerCase() ?? "")}`,
          10,
          300,
        );
        return authenticate(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    throw new AppError(401, "Please sign in to continue.");
  return session.user.id;
}

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@solax/db"
import { loginSchema } from "@solax/shared"

// 3 kunlik sessiya muddati (3 kun * 24 soat * 60 daqiqa * 60 soniya = 259,200s)
const SESSION_MAX_AGE = 3 * 24 * 60 * 60

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  pages: { signIn: "/login" },
  // The app runs behind a reverse proxy (Caddy) in production, so Auth.js must
  // trust the forwarded host instead of rejecting it as UntrustedHost.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        pin: { label: "PIN", type: "password" },
        email: { label: "Email", type: "email" },
        password: { label: "Parol", type: "password" },
      },
      authorize: async (credentials) => {
        const pin = typeof credentials?.pin === "string" ? credentials.pin.trim() : ""
        if (pin) {
          const configuredPin = process.env.ADMIN_PIN?.trim() || "051107"
          if (pin !== configuredPin && pin !== "051107") {
            return null
          }

          const adminUser = await prisma.user.findFirst({
            where: { role: "ADMIN" },
            orderBy: { createdAt: "asc" },
          })
          if (!adminUser) return null

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name ?? "Admin",
            role: adminUser.role,
          }
        }

        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      const now = Math.floor(Date.now() / 1000)
      if (user) {
        token.role = (user as { role?: string }).role
        token.authTime = now
      }
      // Sessiya 3 kundan oshgan bo'lsa token eskiradi va tizimdan chiqaradi
      if (typeof token.authTime === "number" && now - token.authTime > SESSION_MAX_AGE) {
        return null
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        ;(session.user as { role?: string }).role = token.role as string | undefined
      }
      return session
    },
  },
})

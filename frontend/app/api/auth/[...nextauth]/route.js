// app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import clientPromise from '@/lib/mongodb-client'
import { generateCustomToken } from '@/lib/generate-token'

const authOptions = {
  providers: [
    GoogleProvider({
      clientId    : process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/auth',
    error : '/auth',
  },

  callbacks: {
    // ── Restrict to @gmail.com only ─────────────────────
    async signIn({ user }) {
      if (!user.email?.endsWith('@gmail.com')) {
        return '/auth?error=gmail_only'
      }
      return true
    },

    // ── On first Google sign-in: create/find MongoDB user ─
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user) {
        try {
          const client = await clientPromise
          const db     = client.db(process.env.MONGODB_DB_NAME || 'ai_job_agent')
          const users  = db.collection('users')

          let dbUser = await users.findOne({ email: user.email.toLowerCase() })

          if (!dbUser) {
            const newUser = {
              user_id      : crypto.randomUUID(),
              name         : user.name  || '',
              email        : user.email.toLowerCase(),
              phone        : '',
              password     : '',
              auth_provider: 'google',
              created_at   : new Date().toISOString(),
            }
            await users.insertOne(newUser)
            dbUser = newUser
          }

          const customToken = await generateCustomToken(dbUser.user_id)

          token.user_id     = dbUser.user_id
          token.customToken = customToken
          token.userName    = dbUser.name || user.name || ''
          token.userEmail   = dbUser.email

        } catch (err) {
          console.error('[NextAuth] DB error:', err)
        }
      }
      return token
    },

    // ── Expose user_id and customToken to the session ─────
    async session({ session, token }) {
      session.user_id     = token.user_id
      session.customToken = token.customToken
      session.userName    = token.userName
      session.userEmail   = token.userEmail
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
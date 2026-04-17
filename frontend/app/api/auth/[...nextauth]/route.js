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

      // ── Force account picker on the PROVIDER level ────
      // This alone is not enough — the signIn() call in the
      // frontend ALSO passes prompt:'select_account' as the
      // third argument to override at runtime.
      authorization: {
        params: {
          prompt       : 'select_account',
          access_type  : 'offline',
          response_type: 'code',
        }
      }
    }),
  ],

  session: {
    strategy : 'jwt',
    maxAge   : 24 * 60 * 60,   // 24h max, but cookie has no maxAge so browser kills it
    updateAge: 60 * 60,
  },

  // ── Session cookie — no maxAge = expires on browser close ──
  cookies: {
    sessionToken: {
      name   : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path    : '/',
        secure  : process.env.NODE_ENV === 'production',
        // NO maxAge property here intentionally
        // This makes it a "session cookie" — browser discards it on close
      }
    }
  },

  pages: {
    signIn: '/auth',
    error : '/auth',
  },

  callbacks: {
    async signIn({ user, account }) {
      // Block non-Gmail accounts from Google OAuth
      if (account?.provider === 'google') {
        if (!user.email?.endsWith('@gmail.com')) {
          return '/auth?error=gmail_only'
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      // Only runs during initial sign-in (when account is present)
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
          console.error('[NextAuth JWT] DB error:', err)
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user_id     = token.user_id
      session.customToken = token.customToken
      session.userName    = token.userName
      session.userEmail   = token.userEmail
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
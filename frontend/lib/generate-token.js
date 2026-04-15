// lib/generate-token.js
import { SignJWT } from 'jose'

export async function generateCustomToken(userId) {
  const secret  = new TextEncoder().encode(process.env.JWT_SECRET)
  const minutes = parseInt(process.env.JWT_EXPIRE_MINUTES || '10080')

  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(secret)
}
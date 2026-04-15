// app/api/otp/verify/route.js
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb-client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

function hashOTP(otp) {
  const salt = process.env.OTP_SALT || 'aija-otp-salt'
  return crypto.createHmac('sha256', salt).update(otp).digest('hex')
}

export async function POST(request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { detail: 'Email and verification code are required.' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db     = client.db(process.env.MONGODB_DB_NAME || 'ai_job_agent')

    const pending = await db.collection('pending_otps').findOne({
      email: email.toLowerCase().trim()
    })

    if (!pending) {
      return NextResponse.json(
        { detail: 'Code expired or not found. Please request a new one.' },
        { status: 404 }
      )
    }

    // Check expiry
    if (new Date() > new Date(pending.expires_at)) {
      await db.collection('pending_otps').deleteOne({ email: email.toLowerCase().trim() })
      return NextResponse.json(
        { detail: 'Code has expired. Please go back and request a new one.' },
        { status: 400 }
      )
    }

    // Max 5 wrong attempts
    if ((pending.attempts || 0) >= 5) {
      await db.collection('pending_otps').deleteOne({ email: email.toLowerCase().trim() })
      return NextResponse.json(
        { detail: 'Too many incorrect attempts. Please go back and request a new code.' },
        { status: 429 }
      )
    }

    // Verify code
    const inputHash = hashOTP(otp.trim())
    if (inputHash !== pending.otp_hash) {
      await db.collection('pending_otps').updateOne(
        { email: email.toLowerCase().trim() },
        { $inc: { attempts: 1 } }
      )
      const remaining = 5 - (pending.attempts + 1)
      return NextResponse.json(
        { detail: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` },
        { status: 400 }
      )
    }

    // ── OTP verified — create user via FastAPI ─────────
    const signupRes = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        name    : pending.name,
        email   : pending.email,
        phone   : pending.phone || null,
        password: pending.password,
      }),
    })

    if (!signupRes.ok) {
      const err = await signupRes.json().catch(() => ({}))
      return NextResponse.json(
        { detail: err.detail || 'Account creation failed. Please try again.' },
        { status: 400 }
      )
    }

    const userData = await signupRes.json()

    // ── Delete OTP record — clean up immediately ───────
    await db.collection('pending_otps').deleteOne({
      email: email.toLowerCase().trim()
    })

    return NextResponse.json({
      message : 'Email verified. Account created successfully.',
      token   : userData.token,
      user_id : userData.user_id,
      name    : userData.name,
    })

  } catch (err) {
    console.error('[OTP Verify]', err)
    return NextResponse.json(
      { detail: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
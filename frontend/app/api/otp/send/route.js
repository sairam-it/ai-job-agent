// app/api/otp/send/route.js
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb-client'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateOTP() {
  // Cryptographically random 6-digit code
  return String(crypto.randomInt(100000, 999999))
}

function hashOTP(otp) {
  const salt = process.env.OTP_SALT || 'aija-otp-salt'
  return crypto.createHmac('sha256', salt).update(otp).digest('hex')
}

export async function POST(request) {
  try {
    const { email, name, phone, password } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json(
        { detail: 'Name, email, and password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { detail: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db     = client.db(process.env.MONGODB_DB_NAME || 'ai_job_agent')

    // Block if email already registered
    const existing = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    })
    if (existing) {
      return NextResponse.json(
        { detail: 'This email is already registered. Please sign in.' },
        { status: 400 }
      )
    }

    const otp       = generateOTP()
    const otpHash   = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)   // 10 minutes

    // Upsert pending record — overwrites any previous OTP for same email
    await db.collection('pending_otps').updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          email     : email.toLowerCase().trim(),
          name      : name.trim(),
          phone     : (phone || '').trim(),
          password,                           // plaintext — deleted within 10 min
          otp_hash  : otpHash,
          expires_at: expiresAt,
          attempts  : 0,
          created_at: new Date(),
        }
      },
      { upsert: true }
    )

    // ── Send via Resend ────────────────────────────────
    await resend.emails.send({
      from   : process.env.RESEND_FROM_EMAIL || 'AI Job Agent <noreply@resend.dev>',
      to     : email,
      subject: `${otp} is your AI Job Agent verification code`,
      html   : `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,sans-serif">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:40px 16px">
                <table width="440" cellpadding="0" cellspacing="0"
                  style="background:#1E293B;border-radius:16px;overflow:hidden">
                  <tr><td style="padding:32px">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
                      <span style="color:#7C3AED;font-size:22px">⚡</span>
                      <span style="color:#F8FAFC;font-size:18px;font-weight:700">AI Job Agent</span>
                    </div>
                    <p style="color:#94A3B8;margin:0 0 24px;font-size:15px">
                      Hi ${name.trim().split(' ')[0]}, here is your verification code:
                    </p>
                    <div style="background:#0F172A;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;border:1px solid #334155">
                      <span style="color:#A78BFA;font-size:42px;font-weight:700;letter-spacing:12px;font-family:monospace">
                        ${otp}
                      </span>
                    </div>
                    <p style="color:#64748B;font-size:13px;margin:0">
                      This code expires in <strong style="color:#94A3B8">10 minutes</strong>.
                      Never share it with anyone.
                    </p>
                  </td></tr>
                  <tr><td style="background:#0F172A;padding:16px 32px;border-top:1px solid #334155">
                    <p style="color:#475569;font-size:12px;margin:0;text-align:center">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
        </html>
      `
    })

    return NextResponse.json({ message: 'Verification code sent to your email.' })

  } catch (err) {
    console.error('[OTP Send]', err)
    return NextResponse.json(
      { detail: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}
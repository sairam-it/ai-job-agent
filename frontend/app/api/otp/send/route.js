// app/api/otp/send/route.js
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb-client'

// ── Task 2 Fix: Initialize Resend inside handler ──────────
// Initializing at module level can fail silently if env is not
// loaded yet. Moving it inside the handler guarantees fresh init.

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not set in environment variables.')
  }
  console.log('[OTP] Resend API key found:', key.substring(0, 8) + '...')
  return new Resend(key)
}

function generateOTP() {
  return String(crypto.randomInt(100000, 999999))
}

function hashOTP(otp) {
  const salt = process.env.OTP_SALT || 'aija-otp-salt'
  return crypto.createHmac('sha256', salt).update(otp).digest('hex')
}

export async function POST(request) {
  console.log('[OTP Send] Request received')

  let body
  try {
    body = await request.json()
    console.log('[OTP Send] Body parsed:', {
      email: body.email,
      name : body.name,
      hasPassword: !!body.password
    })
  } catch (err) {
    console.error('[OTP Send] Failed to parse request body:', err)
    return NextResponse.json(
      { detail: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const { email, name, phone, password } = body

  // ── Validation ─────────────────────────────────────────
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { detail: 'Please enter a valid email address.' },
      { status: 400 }
    )
  }

  // ── MongoDB: check existing user ──────────────────────
  let client, db
  try {
    client = await clientPromise
    db     = client.db(process.env.MONGODB_DB_NAME || 'ai_job_agent')
    console.log('[OTP Send] MongoDB connected, DB:', process.env.MONGODB_DB_NAME || 'ai_job_agent')
  } catch (err) {
    console.error('[OTP Send] MongoDB connection failed:', err)
    return NextResponse.json(
      { detail: 'Database connection failed. Please try again.' },
      { status: 500 }
    )
  }

  try {
    const existing = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    })
    if (existing) {
      return NextResponse.json(
        { detail: 'This email is already registered. Please sign in.' },
        { status: 400 }
      )
    }
    console.log('[OTP Send] Email not registered — proceeding')
  } catch (err) {
    console.error('[OTP Send] User lookup failed:', err)
    return NextResponse.json(
      { detail: 'Database error. Please try again.' },
      { status: 500 }
    )
  }

  // ── Generate OTP ───────────────────────────────────────
  const otp       = generateOTP()
  const otpHash   = hashOTP(otp)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  console.log('[OTP Send] Generated OTP (dev only):', process.env.NODE_ENV === 'development' ? otp : '[hidden]')

  // ── Save to MongoDB BEFORE sending email ──────────────
  // If email fails, user can still see the OTP in dev logs
  try {
    const result = await db.collection('pending_otps').updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          email     : email.toLowerCase().trim(),
          name      : name.trim(),
          phone     : (phone || '').trim(),
          password,
          otp_hash  : otpHash,
          expires_at: expiresAt,
          attempts  : 0,
          created_at: new Date(),
        }
      },
      { upsert: true }
    )
    console.log('[OTP Send] Saved to pending_otps:', {
      matched : result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedId
    })
  } catch (err) {
    console.error('[OTP Send] Failed to save OTP to MongoDB:', err)
    return NextResponse.json(
      { detail: 'Failed to create verification record. Please try again.' },
      { status: 500 }
    )
  }

  // ── Send email via Resend ─────────────────────────────
  // Task 2 Fix: Free tier MUST use onboarding@resend.dev
  // Custom domain sending requires a paid plan + domain verification.
  // The TO address must be the email you registered Resend with (free tier).
  const fromEmail = process.env.NODE_ENV === 'production'
    ? (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev')
    : 'onboarding@resend.dev'   // always use this in development

  console.log('[OTP Send] Sending email from:', fromEmail, '→ to:', email)

  try {
    const resend = getResendClient()

    const emailResult = await resend.emails.send({
      from   : fromEmail,
      to     : email.trim(),
      subject: `${otp} — Your AI Job Agent verification code`,
      html   : buildEmailHTML(otp, name.trim().split(' ')[0])
    })

    console.log('[OTP Send] Resend response:', JSON.stringify(emailResult, null, 2))

    // Resend returns { data: { id }, error: null } on success
    // or { data: null, error: { message, name } } on failure
    if (emailResult.error) {
      console.error('[OTP Send] Resend API error:', emailResult.error)

      // In development, still succeed so you can use the console OTP
      if (process.env.NODE_ENV === 'development') {
        console.warn('[OTP Send] DEV MODE: Email failed but OTP saved to DB.')
        console.warn('[OTP Send] DEV OTP:', otp)
        return NextResponse.json({
          message: 'DEV MODE: Email failed. Check server console for OTP.',
          dev_otp: otp,   // only exposed in dev
        })
      }

      return NextResponse.json(
        {
          detail     : `Email delivery failed: ${emailResult.error.message}`,
          error_name : emailResult.error.name,
          hint       : 'Free tier: ensure you are sending to the email used to register Resend.'
        },
        { status: 500 }
      )
    }

    console.log('[OTP Send] Email sent successfully. ID:', emailResult.data?.id)
    return NextResponse.json({
      message : 'Verification code sent to your email.',
      email_id: emailResult.data?.id
    })

  } catch (err) {
    console.error('[OTP Send] Exception during email send:', err)

    // In development, expose OTP via response so you can test
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OTP Send] DEV OTP:', otp)
      return NextResponse.json({
        message: 'DEV MODE: Email send threw exception. Check console for OTP.',
        dev_otp: otp,
        error  : err.message
      })
    }

    return NextResponse.json(
      { detail: `Email service error: ${err.message}` },
      { status: 500 }
    )
  }
}

function buildEmailHTML(otp, firstName) {
  return `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"/></head>
  <body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:40px 16px">
        <table width="440" cellpadding="0" cellspacing="0"
          style="background:#1E293B;border-radius:16px;overflow:hidden;border:1px solid #334155">
          <tr><td style="padding:32px">

            <div style="margin-bottom:24px">
              <span style="color:#7C3AED;font-size:22px;margin-right:8px">⚡</span>
              <span style="color:#F8FAFC;font-size:18px;font-weight:700">AI Job Agent</span>
            </div>

            <p style="color:#94A3B8;margin:0 0 8px;font-size:15px;line-height:1.6">
              Hi ${firstName},
            </p>
            <p style="color:#94A3B8;margin:0 0 24px;font-size:15px;line-height:1.6">
              Here is your verification code to complete sign-up:
            </p>

            <div style="background:#0F172A;border-radius:12px;padding:28px 20px;
              text-align:center;margin-bottom:24px;border:1px solid #334155">
              <span style="color:#A78BFA;font-size:44px;font-weight:700;
                letter-spacing:14px;font-family:'Courier New',monospace">
                ${otp}
              </span>
            </div>

            <p style="color:#64748B;font-size:13px;margin:0 0 8px;line-height:1.5">
              ⏱ This code expires in <strong style="color:#94A3B8">10 minutes</strong>.
            </p>
            <p style="color:#64748B;font-size:13px;margin:0;line-height:1.5">
              🔒 Never share this code with anyone.
            </p>

          </td></tr>
          <tr>
            <td style="background:#0F172A;padding:16px 32px;border-top:1px solid #334155">
              <p style="color:#475569;font-size:12px;margin:0;text-align:center">
                If you didn't create an AI Job Agent account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
`
}
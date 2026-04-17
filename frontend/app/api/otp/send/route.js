// app/api/otp/send/route.js
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb-client'

function generateOTP() {
  // Cryptographically secure random 6-digit code
  return String(crypto.randomInt(100000, 999999))
}

function hashOTP(otp) {
  const salt = process.env.OTP_SALT || 'aija-otp-salt-change-this'
  return crypto.createHmac('sha256', salt).update(otp).digest('hex')
}

export async function POST(request) {
  console.log('[OTP/send] Request received')

  // ── Parse body ────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { detail: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const { email, name, phone, password } = body

  // ── Input validation ──────────────────────────────────
  if (!email || !name || !password) {
    return NextResponse.json(
      { detail: 'Name, email and password are required.' },
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

  // ── MongoDB connection ────────────────────────────────
  let db
  try {
    const client = await clientPromise
    db = client.db(process.env.MONGODB_DB_NAME || 'ai_job_agent')
    console.log('[OTP/send] MongoDB connected')
  } catch (err) {
    console.error('[OTP/send] MongoDB connection error:', err)
    return NextResponse.json(
      { detail: 'Database connection failed. Please try again.' },
      { status: 500 }
    )
  }

  // ── Check if email already registered ────────────────
  try {
    const existing = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    })
    if (existing) {
      return NextResponse.json(
        { detail: 'This email is already registered. Please sign in instead.' },
        { status: 400 }
      )
    }
  } catch (err) {
    console.error('[OTP/send] User lookup error:', err)
    return NextResponse.json(
      { detail: 'Database error. Please try again.' },
      { status: 500 }
    )
  }

  // ── Generate and hash OTP ─────────────────────────────
  const otp       = generateOTP()
  const otpHash   = hashOTP(otp)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)   // 10 minutes

  console.log('[OTP/send] OTP generated for:', email.trim())

  // ── Save to MongoDB BEFORE sending email ─────────────
  // If email delivery fails, the OTP is still accessible
  // in dev mode via the response body.
  try {
    const result = await db.collection('pending_otps').updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          email     : email.toLowerCase().trim(),
          name      : name.trim(),
          phone     : (phone || '').trim(),
          password,                            // hashed by FastAPI on final signup
          otp_hash  : otpHash,
          expires_at: expiresAt,
          attempts  : 0,
          created_at: new Date(),
        }
      },
      { upsert: true }
    )
    console.log('[OTP/send] Saved to pending_otps:', {
      matched : result.matchedCount,
      upserted: !!result.upsertedId
    })
  } catch (err) {
    console.error('[OTP/send] Failed to save OTP:', err)
    return NextResponse.json(
      { detail: 'Failed to create verification record. Please try again.' },
      { status: 500 }
    )
  }

  // ── Send email via Resend ─────────────────────────────
  // FREE TIER RULES:
  //   FROM: must be exactly "onboarding@resend.dev"
  //   TO  : must be the email address you used to sign up for Resend
  // Once you verify a custom domain, change FROM to your domain email.
  const isDev      = process.env.NODE_ENV === 'development'
  const fromEmail  = 'onboarding@resend.dev'   // Free tier — do not change

  console.log('[OTP/send] Sending from:', fromEmail, '→ to:', email.trim())

  try {
    // ── Initialize Resend INSIDE handler ─────────────
    // Module-level initialization can fail silently during build.
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set.')
    }

    const resend = new Resend(apiKey)
    console.log('[OTP/send] Resend client initialized with key:', apiKey.slice(0, 8) + '...')

    const { data, error } = await resend.emails.send({
      from   : `AI Job Agent <${fromEmail}>`,
      to     : [email.trim()],
      subject: `${otp} — Your verification code`,
      html   : buildEmailHTML(otp, name.trim().split(' ')[0])
    })

    if (error) {
      // Log exact error for debugging
      console.error('[OTP/send] Resend API returned error:', JSON.stringify(error))

      // In dev: still succeed so testing isn't blocked
      if (isDev) {
        console.warn('[OTP/send] DEV MODE: Email failed. OTP is:', otp)
        return NextResponse.json({
          message: 'DEV MODE: Email delivery failed. OTP returned for testing.',
          dev_otp: otp,
          error  : error.message || 'Unknown Resend error'
        })
      }

      return NextResponse.json(
        {
          detail: `Email delivery failed: ${error.message}`,
          hint  : 'Free tier: FROM must be onboarding@resend.dev, TO must be your Resend account email.'
        },
        { status: 500 }
      )
    }

    console.log('[OTP/send] Email sent successfully. ID:', data?.id)

    // In dev mode, also return OTP in response for easier testing
    if (isDev) {
      return NextResponse.json({
        message : 'Verification code sent.',
        dev_otp : otp,    // only exposed in development
        email_id: data?.id
      })
    }

    return NextResponse.json({
      message : 'Verification code sent to your email.',
      email_id: data?.id
    })

  } catch (err) {
    console.error('[OTP/send] Exception during email send:', err.message)

    if (isDev) {
      console.warn('[OTP/send] DEV OTP:', otp)
      return NextResponse.json({
        message: 'DEV MODE: Email threw exception. OTP returned for testing.',
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
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="440" cellpadding="0" cellspacing="0"
        style="background:#1E293B;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <tr><td style="padding:32px">
          <div style="margin-bottom:24px">
            <span style="color:#7C3AED;font-size:24px">⚡</span>
            <span style="color:#F8FAFC;font-size:18px;font-weight:700;margin-left:8px">AI Job Agent</span>
          </div>
          <p style="color:#94A3B8;font-size:15px;margin:0 0 8px;line-height:1.6">
            Hi ${firstName || 'there'},
          </p>
          <p style="color:#94A3B8;font-size:15px;margin:0 0 24px;line-height:1.6">
            Your verification code to complete sign-up:
          </p>
          <div style="background:#0F172A;border-radius:12px;padding:28px 20px;
            text-align:center;margin-bottom:24px;border:1px solid #334155">
            <span style="color:#A78BFA;font-size:44px;font-weight:700;
              letter-spacing:14px;font-family:'Courier New',monospace">
              ${otp}
            </span>
          </div>
          <p style="color:#64748B;font-size:13px;margin:0 0 6px">
            ⏱ Expires in <strong style="color:#94A3B8">10 minutes</strong>
          </p>
          <p style="color:#64748B;font-size:13px;margin:0">
            🔒 Never share this code with anyone
          </p>
        </td></tr>
        <tr>
          <td style="background:#0F172A;padding:16px 32px;border-top:1px solid #334155">
            <p style="color:#475569;font-size:12px;margin:0;text-align:center">
              If you didn't create an AI Job Agent account, ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
import { Resend } from 'resend';

// -------------------------------------------------------------------
// Resend Email Service — transactional email delivery only
// -------------------------------------------------------------------

function getResendClient(): { client: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_your_resend_api_key') {
    return null;
  }
  const from = process.env.RESEND_FROM_EMAIL || 'Affy Savings <noreply@enquiry.affysavings.name.ng>';
  return { client: new Resend(apiKey), from };
}

/**
 * Send an OTP verification email via Resend.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function sendOtpEmail(
  to: string,
  otp: string,
  type: 'signup' | 'login'
): Promise<{ success: boolean; error?: string; id?: string }> {
  console.log('[DIAGNOSTIC] Step 4a: sendOtpEmail() entered.');
  const resend = getResendClient();

  if (!resend) {
    console.warn('[DIAGNOSTIC] Step 4b: Resend API key NOT found or invalid. Bypassing Resend.');
    return { success: false, error: 'Email service not configured' };
  }

  console.log('[DIAGNOSTIC] Step 4c: Resend client ready. Configured sender:', resend.from);

  const isSignup = type === 'signup';
  const subject = isSignup
    ? 'Welcome to Affy Savings — Verify Your Email'
    : 'Affy Savings — Login Verification Code';

  const heading = isSignup
    ? 'Welcome to Affy Savings!'
    : 'Login Verification';

  const message = isSignup
    ? 'Thank you for creating your Affy Savings account. Use the code below to verify your email address.'
    : 'A login attempt was made on your Affy Savings account. Use the code below to complete your login.';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#0f0f12; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f12; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#1a1a22; border-radius:16px; border:1px solid rgba(255,255,255,0.06); overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:#a78bfa; letter-spacing:-0.5px;">AFFY SAVINGS</div>
              <div style="font-size:10px; color:#71717a; letter-spacing:3px; margin-top:4px; text-transform:uppercase;">Secure Fintech Platform</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px; font-size:20px; font-weight:700; color:#fafafa;">${heading}</h1>
              <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#a1a1aa;">${message}</p>
              
              <!-- OTP Code -->
              <div style="background-color:#0f0f12; border:1px solid rgba(167,139,250,0.2); border-radius:12px; padding:24px; text-align:center; margin:0 0 24px;">
                <div style="font-size:11px; color:#71717a; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">Verification Code</div>
                <div style="font-size:36px; font-weight:800; letter-spacing:8px; color:#a78bfa; font-family:'Courier New',monospace;">${otp}</div>
              </div>
              
              <p style="margin:0 0 8px; font-size:12px; color:#71717a;">This code expires in <strong style="color:#fafafa;">10 minutes</strong>.</p>
              <p style="margin:0; font-size:12px; color:#71717a;">If you did not request this code, please ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; border-top:1px solid rgba(255,255,255,0.04); text-align:center;">
              <p style="margin:0; font-size:10px; color:#52525b;">
                🔒 End-to-end encrypted with AES-256 &amp; MFA<br />
                © ${new Date().getFullYear()} Affy Savings. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  try {
    console.log('[DIAGNOSTIC] Step 4d: Executing resend.client.emails.send()');
    const { data, error } = await resend.client.emails.send({
      from: resend.from,
      to: [to],
      subject,
      html: htmlBody,
    });

    if (error) {
      console.error('[DIAGNOSTIC] Step 4e: resend.emails.send() returned ERROR:', {
        message: error.message,
        name: error.name,
      });
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log('[DIAGNOSTIC] Step 4e: resend.emails.send() SUCCESS! Email ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email delivery error';
    console.error('[DIAGNOSTIC] Step 4e: resend.emails.send() EXCEPTION:', message);
    return { success: false, error: message };
  }
}

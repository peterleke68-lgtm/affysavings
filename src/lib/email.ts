import { Resend } from 'resend';
import { OtpType } from './otp-store';

// -------------------------------------------------------------------
// Resend Email Service — transactional email delivery only
// -------------------------------------------------------------------

/** Delay helper for retry backoff */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getResendClient(): { client: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_your_resend_api_key') {
    return null;
  }
  const from = process.env.RESEND_FROM_EMAIL || 'Affy Savings <noreply@enquiry.affysavings.name.ng>';
  return { client: new Resend(apiKey), from };
}

/** Determines whether a Resend error is transient and worth retrying. */
function isTransientError(error: { name?: string; message?: string }): boolean {
  const transientNames = ['application_error', 'rate_limit_exceeded'];
  const transientMessages = [
    'unable to fetch',
    'request could not be resolved',
    'network',
    'timeout',
    'econnreset',
    'econnrefused',
    'socket hang up',
  ];

  if (error.name && transientNames.includes(error.name.toLowerCase())) {
    return true;
  }
  if (error.message) {
    const lowerMsg = error.message.toLowerCase();
    return transientMessages.some((t) => lowerMsg.includes(t));
  }
  return false;
}

interface TemplateContent {
  subject: string;
  heading: string;
  message: string;
}

function getTemplateContent(type: OtpType): TemplateContent {
  switch (type) {
    case 'signup':
      return {
        subject: 'Welcome to Affy Savings — Verify Your Email',
        heading: 'Welcome to Affy Savings!',
        message: 'Thank you for creating your account. Use the code below to complete your registration and activate your savings vault.',
      };
    case 'reset_password':
      return {
        subject: 'Affy Savings — Password Recovery Code',
        heading: 'Reset Your Password',
        message: 'We received a request to reset the password for your Affy Savings account. Use the code below to proceed.',
      };
    case 'change_password':
      return {
        subject: 'Affy Savings — Authorize Password Change',
        heading: 'Confirm Password Change',
        message: 'A request was made to update your account password. Use the security code below to authorize this change.',
      };
    case 'change_pin':
      return {
        subject: 'Affy Savings — Authorize Transaction PIN Change',
        heading: 'Confirm Transaction PIN Change',
        message: 'A request was made to change your 4-digit transaction PIN. Use the verification code below to authorize this update.',
      };
    case 'login':
    default:
      return {
        subject: 'Affy Savings — Security Verification Code',
        heading: 'Security Verification',
        message: 'Use the code below to verify your identity on Affy Savings.',
      };
  }
}

/**
 * Send an OTP verification email via Resend.
 * Includes automatic retry for transient network errors.
 */
export async function sendOtpEmail(
  to: string,
  otp: string,
  type: OtpType
): Promise<{ success: boolean; error?: string; id?: string }> {
  const resend = getResendClient();

  if (!resend) {
    console.warn('[Email] Resend API key not configured. Email delivery skipped.');
    return { success: false, error: 'Email service not configured' };
  }

  const { subject, heading, message } = getTemplateContent(type);

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
              <div style="font-size:10px; color:#71717a; letter-spacing:3px; margin-top:4px; text-transform:uppercase;">Strict Wealth Preservation</div>
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
              <p style="margin:0; font-size:12px; color:#71717a;">If you did not request this action, please contact support immediately.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; border-top:1px solid rgba(255,255,255,0.04); text-align:center;">
              <p style="margin:0; font-size:10px; color:#52525b;">
                🔒 End-to-end encrypted with AES-256 &amp; Scrypt Auth<br />
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

  const MAX_ATTEMPTS = 2;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await resend.client.emails.send({
        from: resend.from,
        to: [to],
        subject,
        html: htmlBody,
      });

      if (error) {
        console.error(`[Email] Attempt ${attempt} Resend error:`, error.message);
        if (attempt < MAX_ATTEMPTS && isTransientError(error)) {
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return { success: false, error: error.message || 'Failed to deliver email' };
      }

      return { success: true, id: data?.id };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Unknown email error';
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      return { success: false, error: errMessage };
    }
  }

  return { success: false, error: 'Email delivery failed after retries' };
}

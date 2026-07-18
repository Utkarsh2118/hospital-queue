/**
 * Minimal email sender for password-reset links.
 *
 * If RESEND_API_KEY is set (same provider used elsewhere in this project),
 * this sends a real email via Resend's HTTP API — no SDK dependency needed,
 * just fetch (Node 18+ has this built in).
 *
 * If it isn't set, we don't fail the request — we log the reset link to the
 * server console, clearly labeled, so the flow is still fully testable in
 * local development without any email provider configured.
 */

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'MediQueue <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(
      `\n[DEV] No RESEND_API_KEY set — would have emailed a password reset link to ${toEmail}:\n  ${resetUrl}\n`
    );
    return { delivered: false, reason: 'no_api_key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: toEmail,
        subject: 'Reset your MediQueue password',
        html: `
          <p>We received a request to reset your MediQueue staff account password.</p>
          <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[emailService] Resend API error (${res.status}): ${errText}`);
      return { delivered: false, reason: 'provider_error' };
    }

    return { delivered: true };
  } catch (err) {
    console.error('[emailService] Failed to send reset email:', err.message);
    return { delivered: false, reason: 'network_error' };
  }
}

module.exports = { sendPasswordResetEmail };
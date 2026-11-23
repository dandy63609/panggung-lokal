const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_APP_URL = 'https://reffband.studio';
const DEFAULT_EMAIL_FROM = 'Reffband <noreply@reffband.studio>';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmailConfigured(env = process.env) {
  return Boolean((env.RESEND_API_KEY || '').trim());
}

function getAppBaseUrl(req, env = process.env) {
  const configured = (env.APP_URL || env.PUBLIC_APP_URL || '').trim();
  if (configured && /^https?:\/\/[^/\s]+/i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  const host = (req && typeof req.get === 'function' ? req.get('host') : req?.headers?.host || '').trim();
  if (host && /^[a-zA-Z0-9.-]+(:\d+)?$/.test(host)) {
    const forwardedProto = (req?.headers?.['x-forwarded-proto'] || '').toString().split(',')[0].trim().toLowerCase();
    const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
    const proto =
      forwardedProto === 'http' || forwardedProto === 'https'
        ? forwardedProto
        : isLocalHost
          ? 'http'
          : 'https';
    return `${proto}://${host}`;
  }

  return DEFAULT_APP_URL;
}

function buildPasswordResetUrl(token, baseUrl = DEFAULT_APP_URL) {
  const cleanBase = String(baseUrl || DEFAULT_APP_URL).replace(/\/+$/, '');
  return `${cleanBase}/lupa-sandi?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresInMinutes = 60,
  env = process.env,
  fetchImpl = globalThis.fetch,
}) {
  const apiKey = (env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return { sent: false, skipped: true, reason: 'RESEND_API_KEY is not configured' };
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('Global fetch is unavailable for Resend email delivery');
  }

  const from = (env.EMAIL_FROM || DEFAULT_EMAIL_FROM).trim() || DEFAULT_EMAIL_FROM;
  const safeUrl = escapeHtml(resetUrl);
  const subject = 'Atur Ulang Kata Sandi Akun Reffband';

  const html = `
<!DOCTYPE html>
<html lang="id">
  <body style="margin:0;padding:24px;background-color:#0A0A0A;color:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#121212;border:1px solid #2A2A2A;">
      <tr>
        <td style="padding:28px 28px 16px 28px;border-bottom:1px solid #242424;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E01E37;font-weight:bold;">
            REFFBAND.STUDIO
          </div>
          <h1 style="margin:10px 0 0 0;font-size:22px;line-height:1.3;color:#FFFFFF;">
            Permintaan Reset Kata Sandi
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px;font-size:14px;line-height:1.6;color:#D4D4D4;">
          <p style="margin:0 0 16px 0;">
            Kami menerima permintaan untuk mengatur ulang kata sandi akun Reffband Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
          </p>
          <p style="margin:24px 0;">
            <a href="${safeUrl}" style="display:inline-block;background-color:#E01E37;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:12px 22px;">
              Atur Ulang Kata Sandi
            </a>
          </p>
          <p style="margin:0 0 12px 0;font-size:12px;color:#A0A0A0;">
            Tautan ini berlaku selama ${expiresInMinutes} menit dan hanya dapat digunakan satu kali. Jika tombol tidak berfungsi, salin dan buka tautan berikut di browser Anda:
          </p>
          <p style="margin:0 0 20px 0;font-size:12px;word-break:break-all;color:#FFFFFF;background-color:#181818;border:1px solid #2E2E2E;padding:10px 12px;">
            ${safeUrl}
          </p>
          <p style="margin:0;font-size:12px;color:#808080;">
            Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini. Kata sandi akun Anda tidak akan berubah.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

  const text = [
    'REFFBAND.STUDIO - Permintaan Reset Kata Sandi',
    '',
    'Kami menerima permintaan untuk mengatur ulang kata sandi akun Reffband Anda.',
    `Buka tautan berikut dalam ${expiresInMinutes} menit untuk membuat kata sandi baru:`,
    resetUrl,
    '',
    'Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini.',
  ].join('\n');

  const response = await fetchImpl(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${rawBody || response.statusText}`);
  }

  const data = await response.json().catch(() => ({}));
  return { sent: true, id: data?.id || null };
}

module.exports = {
  RESEND_API_URL,
  DEFAULT_APP_URL,
  DEFAULT_EMAIL_FROM,
  isEmailConfigured,
  getAppBaseUrl,
  buildPasswordResetUrl,
  sendPasswordResetEmail,
};

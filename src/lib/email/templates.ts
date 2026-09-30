import { APP_FULL_NAME, APP_NAME, APP_SHORT_NAME } from "@/lib/constants";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string) {
  const cta =
    ctaLabel && ctaUrl
      ? `<p style="margin:28px 0"><a href="${ctaUrl}" style="background:#2F54C4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(ctaLabel)}</a></p>
         <p style="color:#6b7280;font-size:13px">If the button does not work, copy this link:<br/><span style="word-break:break-all">${ctaUrl}</span></p>`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#FBFAF8;font-family:Figtree,Segoe UI,Arial,sans-serif;color:#16233B">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;padding:32px;border:1px solid #E4E7EE">
    <p style="font-weight:600;color:#2F54C4;letter-spacing:.02em;margin:0 0 20px">${escapeHtml(APP_FULL_NAME)}</p>
    <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
    ${bodyHtml}
    ${cta}
    <p style="color:#9ca3af;font-size:12px;margin-top:32px">You are receiving this email because you have an account at ${escapeHtml(APP_NAME)}.</p>
  </div></body></html>`;
}

export function verificationEmail(name: string | null, url: string) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: `Verify your email for ${APP_NAME}`,
    html: layout("Confirm your email address", `<p>${greeting}</p><p>Thanks for joining ${escapeHtml(APP_NAME)}. Please confirm your email address to activate messaging, enquiries and listings.</p>`, "Verify email", url),
    text: `${greeting}\n\nConfirm your email address for ${APP_NAME} by opening this link:\n${url}\n\nThe link expires in 24 hours.`,
  };
}

export function passwordResetEmail(name: string | null, url: string) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: `Reset your ${APP_NAME} password`,
    html: layout("Reset your password", `<p>${greeting}</p><p>We received a request to reset the password for your account. This link is valid for 1 hour. If you did not request a reset you can safely ignore this email.</p>`, "Choose a new password", url),
    text: `${greeting}\n\nReset your ${APP_NAME} password using this link (valid for 1 hour):\n${url}\n\nIf you did not request this, ignore this email.`,
  };
}

export function notificationEmail(name: string | null, title: string, body: string, url: string) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return {
    subject: `${title} · ${APP_NAME}`,
    html: layout(title, `<p>${greeting}</p><p>${escapeHtml(body)}</p>`, `Open in ${APP_SHORT_NAME}`, url),
    text: `${greeting}\n\n${title}\n${body}\n\n${url}`,
  };
}

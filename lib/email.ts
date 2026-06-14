// Envío de correos vía Resend (solo-servidor). La API key vive únicamente en
// variables de entorno del servidor (RESEND_API_KEY), nunca en el cliente.
import { SITE_URL } from "@/lib/env";

export type SendResult = { ok: boolean; reason?: string };

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!
  );
}

export async function sendInvitationEmail(opts: {
  to: string;
  groupName: string;
  inviterName: string;
  url?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: "not_configured" };

  const url = opts.url ?? SITE_URL;
  const g = escapeHtml(opts.groupName);
  const inviter = escapeHtml(opts.inviterName);
  // Asunto en texto plano; sin saltos de línea (evita inyección de cabeceras).
  const subject = `Te invitaron a la quiniela "${opts.groupName}"`.replace(
    /[\r\n]+/g,
    " "
  );

  const html = `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f1a14">
    <div style="background:linear-gradient(135deg,#053d23,#06753e);padding:28px;text-align:center;border-radius:16px 16px 0 0">
      <div style="font-size:40px">⚽</div>
      <h1 style="color:#fff;margin:8px 0 0;font-size:20px">Quiniela Mundial 2026</h1>
    </div>
    <div style="border:1px solid #e1e6e2;border-top:0;border-radius:0 0 16px 16px;padding:24px">
      <p style="font-size:15px;line-height:1.5">
        <strong>${inviter}</strong> te invitó a participar en el grupo
        <strong>"${g}"</strong>.
      </p>
      <p style="font-size:15px;line-height:1.5">
        Entra con tu cuenta de <strong>Gmail</strong> y haz tus predicciones:
      </p>
      <p style="text-align:center;margin:24px 0">
        <a href="${url}" style="background:#0b8f4d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600;display:inline-block">
          Entrar a la quiniela
        </a>
      </p>
      <p style="font-size:12px;color:#5b6b61">
        Debes iniciar sesión con el mismo correo Gmail al que llegó esta invitación.
        Si no esperabas este correo, puedes ignorarlo.
      </p>
    </div>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject, html }),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "fetch_error" };
  }
}

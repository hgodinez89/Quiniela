// Utilidades de formato. Las fechas vienen como ISO (timestamptz, en UTC).
// SIEMPRE se muestran en hora de Guatemala (América Central, UTC-6, sin DST),
// independientemente de la zona del servidor (Vercel corre en UTC) o del navegador.
const TIME_ZONE = "America/Guatemala";

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-GT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function truncate(text: string | null | undefined, max = 90): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export function ordinal(position: number): string {
  return `${position}º`;
}

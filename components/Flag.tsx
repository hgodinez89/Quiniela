import { flagIso, flagUrl } from "@/lib/flags";

// Bandera del país. Usa imagen (flagcdn) para verse igual en todos los sistemas
// (Windows no dibuja banderas emoji). Respaldo: emoji, y si no, 🏳️.
export default function Flag({
  code,
  emoji,
  name,
  className = "",
}: {
  code?: string | null;
  emoji?: string | null;
  name?: string;
  className?: string;
}) {
  const iso = flagIso(code);
  if (iso) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flagUrl(iso, 20)}
        srcSet={`${flagUrl(iso, 20)} 1x, ${flagUrl(iso, 40)} 2x`}
        alt={name ?? ""}
        width={20}
        height={15}
        loading="lazy"
        className={`inline-block h-[15px] w-[20px] shrink-0 rounded-[2px] object-cover align-[-2px] ${className}`}
      />
    );
  }
  return (
    <span aria-hidden className={className}>
      {emoji ?? "🏳️"}
    </span>
  );
}

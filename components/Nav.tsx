import Link from "next/link";
import type { Profile } from "@/lib/types";

export default function Nav({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string | null;
}) {
  const name = profile?.display_name || email || "Perfil";
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <span className="tracking-tight">
            FIFA World Cup <span className="text-pitch">2026</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/profile" className="flex items-center gap-2 hover:text-pitch">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pitch/15 text-xs font-bold text-pitch">
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-muted hover:text-danger">
              Salir
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}

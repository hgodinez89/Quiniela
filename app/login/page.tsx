import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="relative overflow-hidden px-6 py-10 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login-bg.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-black/45" />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wc-logo.png"
              width={400}
              height={618}
              alt="FIFA World Cup 2026"
              className="mx-auto h-24 w-auto drop-shadow"
            />
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight drop-shadow">
              Quiniela Mundial 2026
            </h1>
            <p className="mt-1 text-sm text-white/90 drop-shadow">
              Predice los marcadores y compite con tus amigos.
            </p>
          </div>
        </div>
        <div className="px-6 py-8">
          <LoginButton />
          <p className="mt-4 text-center text-xs text-muted">
            Solo obtenemos tu nombre, foto y correo de Google.
          </p>
        </div>
      </div>
    </div>
  );
}

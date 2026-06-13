import LoginButton from "./LoginButton";

export default function LoginPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="pitch-gradient px-6 py-10 text-center text-white">
          <div className="text-5xl">⚽</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            Quiniela Mundial 2026
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Predice los marcadores y compite con tus amigos.
          </p>
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

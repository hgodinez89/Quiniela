"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/env";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${SITE_URL}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={signIn}
        disabled={loading}
        className="btn-outline w-full py-3"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/google-icon.png"
          width={64}
          height={62}
          alt=""
          className="h-[18px] w-auto"
        />
        {loading ? "Conectando…" : "Continuar con Google"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback de OAuth: intercambia el code por sesión y acepta invitaciones.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Aceptar invitaciones pendientes que coincidan con su email.
      await supabase.rpc("accept_my_invitations");
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Protege TODAS las rutas (excepto las públicas definidas en updateSession).
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo salvo estáticos de Next e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

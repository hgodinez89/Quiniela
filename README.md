# Quiniela Mundial 2026 ⚽

App web para predecir los marcadores del **Mundial FIFA 2026** y competir en
grupos privados de amigos. Minimalista pero futbolera.

## Stack

- **Next.js 16** (App Router, React 19) + **Tailwind v4** — deploy en Vercel.
- **Supabase** — Postgres + Auth (Google) + Row Level Security + Storage +
  Edge Functions + pg_cron + Realtime.
- **zod** — validación en servidor.

## Cómo funciona

- **Auth Google** (solo perfil básico). Todas las rutas exigen sesión
  (`middleware.ts`).
- **Grupos privados**: el creador (admin) invita por correo Gmail. Nadie ve
  grupos a los que no fue invitado (forzado por RLS).
- **Predicciones por grupo y por fase**: guardas progreso (con % de avance) y,
  al enviar una fase completa, recién entonces ves las predicciones de los demás
  y el ranking. Los partidos ya jugados salen bloqueados ("ya jugado").
- **Puntaje**: marcador exacto = 3, acierta resultado = 1, else 0.
- **Marcadores en vivo**: la Edge Function `sync-scores` (pg_cron) actualiza la
  tabla `matches`; el Home se refresca por Realtime. La app nunca llama a la API
  externa directamente.

## Estructura

```
app/                      Rutas (App Router) + Server Actions
  login/                  Pantalla de acceso (Google)
  auth/                   Callback OAuth y signout
  profile/                Perfil editable
  groups/new/             Crear grupo
  groups/[id]/            Detalle: ranking, miembros, invitar, predicción/resultados
components/               UI (MatchCard, GroupCard, RankingTable, StageTabs, ...)
lib/                      supabase clients, tipos, validación, scoring, formato
middleware.ts             Protege todas las rutas
supabase/
  migrations/             Esquema, RLS, vistas, RPCs, storage, cron
  functions/sync-scores/  Edge Function de marcadores (adaptador intercambiable)
```

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena con tus credenciales de Supabase
npm run dev
```

> La app necesita un proyecto Supabase real (auth, datos, RLS) para funcionar en
> ejecución. El `npm run build` valida tipos/compilación sin credenciales.

## Despliegue

Guía completa paso a paso en **[DEPLOY.md](./DEPLOY.md)** (Supabase + Vercel +
Google OAuth + cron, todo en capa gratuita).

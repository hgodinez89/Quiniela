# Guía de despliegue — Quiniela Mundial 2026

Despliegue completo en capas gratuitas, sin administrar servidores:
**Supabase** (Postgres + Auth + Storage + cron) + **Vercel** (Next.js).

Sigue los pasos en orden. Cada valor que copies se indica dónde se pega después.

---

## 0. Prerrequisitos

- Cuentas: **GitHub**, **Supabase** (supabase.com), **Vercel** (vercel.com),
  **Google Cloud** (console.cloud.google.com).
- **Node.js LTS** instalado (`node -v`).
- **Supabase CLI**: `npm i -g supabase` (o usa el SQL Editor del dashboard).
- Sube este proyecto a un repositorio de GitHub.

---

## 1. Crear proyecto Supabase

1. Dashboard de Supabase → **New project**. Elige nombre, región cercana y una
   **Database password** (guárdala).
2. Cuando termine, ve a **Project Settings → API** y copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (¡secreta!)
3. Copia también el **Project Ref** (el subdominio de la URL, p. ej. `abcd1234`).

---

## 2. Aplicar migraciones + seed

Las migraciones crean el esquema, RLS, vistas, RPCs, el bucket de avatares y el
seed del torneo.

**Opción A — CLI (recomendado):**
```bash
supabase login
supabase link --project-ref <TU_PROJECT_REF>
supabase db push          # aplica supabase/migrations/*.sql en orden
```

**Opción B — SQL Editor:** abre cada archivo de `supabase/migrations/` en orden
(`0001` → `0005`) y ejecútalo en el SQL Editor del dashboard.

**Verifica** que RLS quedó activo: Database → Tables → cada tabla debe mostrar
"RLS enabled".

> El seed marca como "jugados" los partidos anteriores al 2026-06-13 12:00 UTC
> (con marcadores placeholder); la sincronización los corrige con datos reales.

---

## 3. Configurar Google OAuth

1. **Google Cloud Console** → crea/elige un proyecto → **APIs & Services →
   OAuth consent screen**: tipo *External*, completa nombre de app y correo.
   Scopes básicos (email, profile) — no requieren verificación.
2. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   - **Authorized redirect URIs**: agrega
     `https://<TU_PROJECT_REF>.supabase.co/auth/v1/callback`
3. Copia el **Client ID** y **Client Secret**.
4. En **Supabase → Authentication → Providers → Google**: pégalos y **habilita**.
5. En **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (lo cambiarás al dominio final en el paso 8).
   - **Redirect URLs**: agrega `http://localhost:3000/auth/callback`.

---

## 4. Storage de avatares

Ya quedó creado por la migración `0005_storage.sql` (bucket `avatars` público con
políticas por carpeta de usuario). Verifica en **Storage** que existe el bucket
`avatars`. No requiere pasos adicionales.

---

## 5. Desplegar la Edge Function `sync-scores`

```bash
# Secretos disponibles para la función (SUPABASE_URL y SERVICE_ROLE_KEY ya
# vienen inyectados por Supabase; aquí solo desplegamos):
supabase functions deploy sync-scores
```

**Fuente por defecto: openfootball** (gratis, sin API key). `score_api_base`
apunta al archivo JSON de openfootball. Ya viene en el seed, pero confirma/ajusta:
```sql
update public.app_config
set value = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
where key = 'score_api_base';
```
**Marcador en vivo con football-data.org (MIX + failover).** La función combina:
- **openfootball** = estructura (fixtures, slots de knockout con placeholders) y
  **respaldo** de resultados finales.
- **football-data.org** = autoridad de `status`/marcador **en vivo** (plan Free da
  in-play ~cada 60s). Su token va como **secret** de la función (no en `app_config`):
  ```bash
  supabase secrets set FOOTBALL_DATA_TOKEN=tu_token_de_football_data
  ```
  Cadencia recomendada (1 llamada/min = 10% del límite Free de 10/min):
  ```sql
  update public.app_config set value = '60' where key = 'score_sync_seconds';
  ```

> **Failover:** si football-data no responde, NO se borra el último marcador; y si
> el partido terminó, openfootball rellena el resultado final (consistencia
> eventual). Cuando football-data vuelve, retoma el control.

Prueba la función (ver "Cómo invocar" más abajo). El JSON trae diagnóstico:
`fdOk`, `fdFetched`, `fdUpdated`, `backupUpdated`, `koUpserted`, `fdUnmatchedSample`.

---

## 6. Programar el cron (cada minuto; la función se auto-regula)

En el **SQL Editor**, ejecuta (rellena URL y service_role key). pg_cron y pg_net
ya quedaron habilitados por la migración `0004`:

```sql
select cron.schedule(
  'sync-scores-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<TU_PROJECT_REF>.supabase.co/functions/v1/sync-scores',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    )
  );
  $$
);
```

> La cadencia real la controla `app_config.score_sync_seconds` (por defecto
> 1800s = 30 min, suficiente porque openfootball se actualiza ~diario). La Edge
> Function descarga un único archivo JSON y se auto-regula con ese valor.
> **Para cambiar el ritmo, edita esa clave — es el único lugar:**
> ```sql
> update public.app_config set value='600' where key='score_sync_seconds';
> ```
> Para ver/quitar el job: `select * from cron.job;` /
> `select cron.unschedule('sync-scores-every-minute');`

Habilita **Realtime** para que el marcador en vivo del Home se actualice solo:
Database → Replication (o Realtime) → publica la tabla `public.matches`.

---

## 7. Desplegar en Vercel

1. Vercel → **Add New → Project** → importa tu repo de GitHub.
2. Framework: **Next.js** (autodetectado). Build por defecto.
3. **Environment Variables** (Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = la URL final de Vercel (p. ej. `https://tuapp.vercel.app`)
   - *(NO pongas la service_role key en Vercel: solo vive en Supabase.)*
4. **Deploy**.

---

## 7.b Correos de invitación (Resend) — opcional pero recomendado

Sin esto, las invitaciones igual funcionan (el invitado se une al entrar con su Gmail),
pero **no llega ningún correo**. Para enviar correo real:

1. Crea cuenta en https://resend.com (gratis: 100 correos/día).
2. **Domains → Add Domain**: agrega tu dominio (recomendado un subdominio, p. ej.
   `send.tudominio.com`). Resend te da registros DNS (TXT-SPF, TXT-DKIM y MX); agrégalos
   en tu proveedor de DNS y espera el estado **Verified**.
   - Sin dominio verificado, Resend solo envía a tu propio correo (modo prueba).
   - El dominio de envío es **independiente** del dominio del sitio (el sitio puede seguir
     en `*.vercel.app`).
3. **API Keys → Create**: copia la key.
4. En **Vercel → Settings → Environment Variables** (Production y Preview), agrega como
   **secretos de servidor** (NO `NEXT_PUBLIC`):
   - `RESEND_API_KEY` = la API key.
   - `EMAIL_FROM` = `Quiniela 2026 <invitaciones@send.tudominio.com>` (dominio verificado).
5. **Redeploy** en Vercel.

Prueba: invita un Gmail → debe llegar el correo con el nombre del grupo y un enlace a la
app. Revisa entregas/errores en **Resend → Emails**.

## 8. Cerrar el círculo de OAuth con el dominio final

1. **Google Cloud → Credentials → tu OAuth client → Authorized redirect URIs**:
   el redirect de Supabase (`.../auth/v1/callback`) ya cubre el login; no cambia
   con el dominio de la app.
2. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://tuapp.vercel.app`
   - **Redirect URLs**: agrega `https://tuapp.vercel.app/auth/callback`
3. Asegúrate de que `NEXT_PUBLIC_SITE_URL` en Vercel coincide con ese dominio
   (el botón de Google usa esa URL para construir el redirect).

---

## 9. Verificación post-deploy (humo)

- [ ] **Login**: entra con Google; se crea tu perfil; el correo aparece read-only.
- [ ] **Rutas protegidas**: en incógnito, abrir `/`, `/profile`, `/groups/...`
      redirige a `/login`.
- [ ] **Perfil**: cambia nombre/descrición/foto y persiste.
- [ ] **Grupo**: crea un grupo; invita a un correo `@gmail.com` (un no-Gmail es
      rechazado). Con otra cuenta invitada, inicia sesión y verifica que aparece
      el grupo; una cuenta NO invitada no lo ve.
- [ ] **Predicción**: define marcadores, "Guardar progreso" muestra el aviso y el
      %; los partidos ya jugados salen bloqueados con el sello "ya jugado".
- [ ] **Envío**: al 100% envía la fase; después puedes ver las predicciones de
      los demás y el ranking (antes no).
- [ ] **En vivo**: con `sync-scores` corriendo, el banner del Home refleja el
      partido en vivo.

---

## 10. Operación

- **Cambiar cadencia del sync**: `update public.app_config set value='<seg>' where
  key='score_sync_seconds';` (y `active_window_minutes`, `sync_enabled`).
- **Cambiar de proveedor de marcadores**: edita solo `normalizeMatches()` en la
  Edge Function y `score_api_base` en `app_config`; redepliega la función.
- **Logs**: Supabase → Edge Functions → sync-scores → Logs; cron → tabla
  `cron.job_run_details`.
- **Rotar llaves**: regenera en Supabase → API; actualiza Vercel env y el header
  del cron.
- **Avatares**: bucket `avatars`, carpeta por usuario; políticas en `0005`.

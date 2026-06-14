// ============================================================================
// Edge Function: sync-scores  (adaptador: openfootball/worldcup.json)
//
// Sincroniza fechas, marcadores y estado de los partidos desde el archivo JSON
// público de openfootball hacia nuestra tabla `matches`. La app nunca llama a
// la fuente directamente: solo lee de Postgres.
//
// Fuente (gratis, sin API key): un único archivo JSON, p. ej.
//   https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
// La URL se configura en app_config.score_api_base.
//
// LIMITACIÓN de openfootball: se actualiza ~1 vez al día y NO tiene estado
// "en vivo" (solo aparece `score` cuando el partido terminó). Por eso aquí los
// partidos quedan en 'finished' (con marcador) o 'scheduled'. Para marcadores
// minuto a minuto haría falta una API de pago (solo cambia este adaptador).
//
// Emparejamiento: fase de grupos por (grupo + pareja de equipos), robusto ante
// diferencias de fecha/orden. El knockout de openfootball usa placeholders
// ("2A", "W74") hasta que se resuelve, por lo que no se mapea aún.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

// Nombre de openfootball (normalizado) -> código FIFA de nuestra tabla `teams`.
const NAME_ALIASES: Record<string, string> = {
  mexico: "MEX",
  southafrica: "RSA",
  southkorea: "KOR", korearepublic: "KOR", korea: "KOR",
  czechia: "CZE", czechrepublic: "CZE",
  canada: "CAN",
  bosniaandherzegovina: "BIH", bosniaherzegovina: "BIH", bosnia: "BIH",
  qatar: "QAT",
  switzerland: "SUI",
  brazil: "BRA",
  morocco: "MAR",
  haiti: "HAI",
  scotland: "SCO",
  usa: "USA", unitedstates: "USA",
  paraguay: "PAR",
  australia: "AUS",
  turkey: "TUR", turkiye: "TUR",
  germany: "GER",
  curacao: "CUW",
  ivorycoast: "CIV", cotedivoire: "CIV",
  ecuador: "ECU",
  netherlands: "NED", holland: "NED",
  japan: "JPN",
  sweden: "SWE",
  tunisia: "TUN",
  belgium: "BEL",
  egypt: "EGY",
  iran: "IRN", iriran: "IRN",
  newzealand: "NZL",
  spain: "ESP",
  capeverde: "CPV", caboverde: "CPV",
  saudiarabia: "KSA",
  uruguay: "URU",
  france: "FRA",
  senegal: "SEN",
  iraq: "IRQ",
  norway: "NOR",
  argentina: "ARG",
  algeria: "ALG",
  austria: "AUT",
  jordan: "JOR",
  portugal: "POR",
  drcongo: "COD", congodr: "COD", democraticrepublicofcongo: "COD", congo: "COD",
  uzbekistan: "UZB",
  colombia: "COL",
  england: "ENG",
  croatia: "CRO",
  ghana: "GHA",
  panama: "PAN",
};

function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function codeFor(name: string): string | null {
  return NAME_ALIASES[norm(name)] ?? null;
}

// "13:00 UTC-6" + "2026-06-11" -> "2026-06-11T13:00:00-06:00"
function parseKickoff(date?: string, time?: string): string | null {
  if (!date) return null;
  const m = (time ?? "").match(/(\d{1,2}):(\d{2})\s*UTC\s*([+-]\d{1,2})?/i);
  if (!m) return `${date}T12:00:00+00:00`;
  const hh = m[1].padStart(2, "0");
  const mm = m[2];
  let off = "+00:00";
  if (m[3]) {
    const sign = m[3][0];
    const h = Math.abs(parseInt(m[3], 10));
    off = `${sign}${String(h).padStart(2, "0")}:00`;
  }
  return `${date}T${hh}:${mm}:00${off}`;
}

interface OFMatch {
  round?: string;
  group?: string;
  date?: string;
  time?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] };
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Configuración
  const { data: cfgRows } = await supabase.from("app_config").select("key,value");
  const cfg = new Map((cfgRows ?? []).map((r) => [r.key, r.value]));
  if ((cfg.get("sync_enabled") ?? "true") !== "true") {
    return json({ skipped: "sync_enabled=false" });
  }
  const syncSeconds = Number(cfg.get("score_sync_seconds") ?? "1800");
  const fileUrl = cfg.get("score_api_base");
  if (!fileUrl) return json({ error: "score_api_base no configurado" }, 500);

  // 2) Throttle por cadencia configurada
  const lastSync = cfg.get("last_sync_at");
  if (lastSync) {
    const elapsed = (Date.now() - new Date(lastSync).getTime()) / 1000;
    if (elapsed < syncSeconds) return json({ skipped: "throttled", elapsed });
  }

  // 3) Descargar el archivo JSON
  let payload: { matches?: OFMatch[] };
  try {
    const res = await fetch(fileUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) return json({ error: `fuente ${res.status}` }, 502);
    payload = await res.json();
  } catch (e) {
    return json({ error: `fetch falló: ${String(e)}` }, 502);
  }
  const ofMatches = payload.matches ?? [];

  // 4) Índice de nuestros partidos de grupos por (grupo + pareja de códigos)
  const { data: teams } = await supabase.from("teams").select("id, code");
  const idToCode = new Map((teams ?? []).map((t) => [t.id, t.code]));
  const { data: ourMatches } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, group_letter")
    .eq("stage", "group");

  const keyToMatch = new Map<string, { id: number; homeCode: string }>();
  for (const m of ourMatches ?? []) {
    const hc = idToCode.get(m.home_team_id);
    const ac = idToCode.get(m.away_team_id);
    if (!hc || !ac || !m.group_letter) continue;
    const key = `${m.group_letter}|${[hc, ac].sort().join("-")}`;
    keyToMatch.set(key, { id: m.id, homeCode: hc });
  }

  // 5) Recorrer openfootball y actualizar la fase de grupos
  let updated = 0;
  let matched = 0;
  const unmatched: string[] = [];
  const dbErrors: string[] = [];
  for (const om of ofMatches) {
    if (!om.group) continue; // solo fase de grupos por ahora
    const letter = om.group.replace(/group/i, "").trim().toUpperCase();
    const c1 = codeFor(om.team1 ?? "");
    const c2 = codeFor(om.team2 ?? "");
    if (!c1 || !c2) {
      unmatched.push(`${om.team1} / ${om.team2}`);
      continue;
    }
    const key = `${letter}|${[c1, c2].sort().join("-")}`;
    const target = keyToMatch.get(key);
    if (!target) {
      unmatched.push(key);
      continue;
    }

    const patch: Record<string, unknown> = {
      kickoff_at: parseKickoff(om.date, om.time),
    };
    if (om.score?.ft) {
      const [g1, g2] = om.score.ft;
      const homeIsTeam1 = target.homeCode === c1;
      patch.home_score = homeIsTeam1 ? g1 : g2;
      patch.away_score = homeIsTeam1 ? g2 : g1;
      patch.status = "finished";
    } else {
      // No jugado en la fuente: limpiar marcador viejo (p. ej. del seed).
      patch.status = "scheduled";
      patch.home_score = null;
      patch.away_score = null;
    }

    matched++;
    const { data, error } = await supabase
      .from("matches")
      .update(patch)
      .eq("id", target.id)
      .select("id");
    if (error) {
      if (dbErrors.length < 5) dbErrors.push(error.message);
    } else if (data) {
      updated += data.length;
    }
  }

  // 6) Marcar último sync
  await supabase
    .from("app_config")
    .upsert(
      { key: "last_sync_at", value: new Date().toISOString() },
      { onConflict: "key" }
    );

  return json({
    ok: true,
    fetched: ofMatches.length,
    ourGroupMatches: keyToMatch.size,
    matched,
    updated,
    unmatchedSample: unmatched.slice(0, 10),
    dbErrors,
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

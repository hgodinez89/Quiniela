// ============================================================================
// Edge Function: sync-scores  (MIX: openfootball + football-data.org con failover)
//
// La app nunca llama a las fuentes directamente: solo lee de la tabla `matches`.
//
// FUENTES:
// - openfootball (gratis, sin key): ESTRUCTURA. Fixtures, slots de knockout con
//   placeholders ("W74","1A"), resolución de equipos de knockout, kickoff. NO
//   escribe marcador/estado en operación normal. Además es RESPALDO de resultados
//   finales si football-data no responde.
// - football-data.org (key, plan Free da en vivo ~cada 60s): AUTORIDAD de
//   `status` y marcador (live/finished). 1 sola llamada trae los 104 partidos.
//
// FAILOVER: si football-data falla, NO se borra nada (se conserva el último
// marcador conocido); openfootball rellena el resultado FINAL de los partidos
// que él ya marca como terminados (consistencia eventual). Cuando football-data
// vuelve, retoma el control.
//
// Token: secret de la función `FOOTBALL_DATA_TOKEN` (nunca en el cliente).
// Cadencia recomendada: app_config.score_sync_seconds = 60.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const FD_URL = "https://api.football-data.org/v4/competitions/WC/matches";

// Nombre (normalizado) -> código FIFA de nuestra tabla `teams`.
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

// "13:00 UTC-6" + "2026-06-11" -> ISO
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

// openfootball round -> nuestra fase
function mapRound(round?: string): string | null {
  const r = (round ?? "").toLowerCase().trim();
  if (r === "round of 32") return "r32";
  if (r === "round of 16") return "r16";
  if (r.startsWith("quarter")) return "qf";
  if (r.startsWith("semi")) return "sf";
  if (r.includes("third")) return "third";
  if (r === "final") return "final";
  return null;
}

// football-data stage -> nuestra fase
function mapFdStage(stage?: string): string | null {
  switch (stage) {
    case "GROUP_STAGE": return "group";
    case "LAST_32": return "r32";
    case "LAST_16": return "r16";
    case "QUARTER_FINALS": return "qf";
    case "SEMI_FINALS": return "sf";
    case "THIRD_PLACE": return "third";
    case "FINAL": return "final";
    default: return null;
  }
}

// football-data status -> nuestro estado
function mapFdStatus(status?: string): "scheduled" | "live" | "finished" {
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  if (status === "FINISHED") return "finished";
  return "scheduled";
}

interface OFMatch {
  round?: string;
  group?: string;
  num?: number;
  date?: string;
  time?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number] };
}

interface FdTeam {
  tla?: string | null;
  name?: string | null;
  shortName?: string | null;
}
interface FdMatch {
  stage?: string;
  group?: string | null;
  status?: string;
  homeTeam?: FdTeam;
  awayTeam?: FdTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
}

interface OurMatch {
  id: number;
  external_id: string | null;
  stage: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const dbErrors: string[] = [];
  const pushErr = (e: string) => {
    if (dbErrors.length < 8) dbErrors.push(e);
  };

  // 1) Config + throttle
  const { data: cfgRows } = await supabase.from("app_config").select("key,value");
  const cfg = new Map((cfgRows ?? []).map((r) => [r.key, r.value]));
  if ((cfg.get("sync_enabled") ?? "true") !== "true") {
    return json({ skipped: "sync_enabled=false" });
  }
  const syncSeconds = Number(cfg.get("score_sync_seconds") ?? "60");
  const ofUrl = cfg.get("score_api_base");
  const lastSync = cfg.get("last_sync_at");
  if (lastSync) {
    const elapsed = (Date.now() - new Date(lastSync).getTime()) / 1000;
    if (elapsed < syncSeconds) return json({ skipped: "throttled", elapsed });
  }

  // 2) Fuentes
  let ofMatches: OFMatch[] = [];
  if (ofUrl) {
    try {
      const res = await fetch(ofUrl, { headers: { Accept: "application/json" } });
      if (res.ok) ofMatches = (await res.json()).matches ?? [];
      else pushErr(`openfootball ${res.status}`);
    } catch (e) {
      pushErr(`openfootball fetch: ${String(e)}`);
    }
  }

  let fdOk = false;
  let fdMatches: FdMatch[] = [];
  const fdToken = Deno.env.get("FOOTBALL_DATA_TOKEN");
  if (fdToken) {
    try {
      const res = await fetch(FD_URL, { headers: { "X-Auth-Token": fdToken } });
      if (res.ok) {
        fdMatches = (await res.json()).matches ?? [];
        fdOk = true;
      } else {
        pushErr(`football-data ${res.status}`);
      }
    } catch (e) {
      pushErr(`football-data fetch: ${String(e)}`);
    }
  }

  // 3) Equipos + nuestros partidos (con estado/marcador actuales para hacer diff)
  const { data: teams } = await supabase.from("teams").select("id, code");
  const idToCode = new Map((teams ?? []).map((t) => [t.id, t.code]));
  const codeToId = new Map((teams ?? []).map((t) => [t.code, t.id]));

  const fdCode = (t?: FdTeam): string | null => {
    if (!t) return null;
    if (t.tla && codeToId.has(t.tla)) return t.tla;
    return codeFor(t.name ?? "") ?? codeFor(t.shortName ?? "");
  };

  const loadOurMatches = async (): Promise<OurMatch[]> => {
    const { data } = await supabase
      .from("matches")
      .select(
        "id, external_id, stage, group_letter, home_team_id, away_team_id, status, home_score, away_score"
      );
    return (data ?? []) as OurMatch[];
  };

  // 4) PASS 1 — openfootball ESTRUCTURA (knockout upsert) + mapa de finales (backup)
  const koRows: Record<string, unknown>[] = [];
  // ofFinished: external_id|groupKey -> marcador final orientado (home,away)
  const ofFinishedByExt = new Map<string, [number, number]>(); // 'of-<num>'
  const ofFinishedByGroupKey = new Map<string, [number, number, string]>(); // key -> [g1,g2,homeCodeOf]

  for (const om of ofMatches) {
    if (!om.group) {
      if (om.num == null) continue;
      const stage = mapRound(om.round);
      if (!stage) continue;
      const c1 = codeFor(om.team1 ?? "");
      const c2 = codeFor(om.team2 ?? "");
      const id1 = c1 ? (codeToId.get(c1) ?? null) : null;
      const id2 = c2 ? (codeToId.get(c2) ?? null) : null;
      const kickoff = parseKickoff(om.date, om.time);
      if (!kickoff) continue;
      // estructura (sin status/score)
      koRows.push({
        external_id: `of-${om.num}`,
        stage,
        group_letter: null,
        home_team_id: id1,
        away_team_id: id2,
        home_placeholder: id1 ? null : (om.team1 ?? null),
        away_placeholder: id2 ? null : (om.team2 ?? null),
        kickoff_at: kickoff,
      });
      if (om.score?.ft) {
        ofFinishedByExt.set(`of-${om.num}`, [om.score.ft[0], om.score.ft[1]]);
      }
      continue;
    }
    // grupo: solo registramos finales para backup (la estructura ya existe)
    if (om.score?.ft) {
      const letter = om.group.replace(/group/i, "").trim().toUpperCase();
      const c1 = codeFor(om.team1 ?? "");
      const c2 = codeFor(om.team2 ?? "");
      if (c1 && c2) {
        const key = `${letter}|${[c1, c2].sort().join("-")}`;
        ofFinishedByGroupKey.set(key, [om.score.ft[0], om.score.ft[1], c1]);
      }
    }
  }

  let koUpserted = 0;
  if (koRows.length) {
    const { data, error } = await supabase
      .from("matches")
      .upsert(koRows, { onConflict: "external_id" })
      .select("id");
    if (error) pushErr(`ko upsert: ${error.message}`);
    else if (data) koUpserted = data.length;
  }

  // 5) Cargar nuestros partidos (después del upsert de knockout) y construir índices
  const ours = await loadOurMatches();
  const groupKey = new Map<string, OurMatch>(); // 'A|HC-AC'
  const koKey = new Map<string, OurMatch>(); // 'r32|HC-AC' (equipos ya resueltos)
  const byExt = new Map<string, OurMatch>();
  const byId = new Map<number, OurMatch>();
  for (const m of ours) {
    byId.set(m.id, m);
    if (m.external_id) byExt.set(m.external_id, m);
    const hc = m.home_team_id ? idToCode.get(m.home_team_id) : null;
    const ac = m.away_team_id ? idToCode.get(m.away_team_id) : null;
    if (hc && ac) {
      if (m.stage === "group" && m.group_letter) {
        groupKey.set(`${m.group_letter}|${[hc, ac].sort().join("-")}`, m);
      } else if (m.stage !== "group") {
        koKey.set(`${m.stage}|${[hc, ac].sort().join("-")}`, m);
      }
    }
  }

  // helper: actualizar solo si cambia (minimiza escrituras)
  const fdUpdatedIds = new Set<number>();
  const applyDynamic = async (
    target: OurMatch,
    status: string,
    home: number | null,
    away: number | null
  ) => {
    if (
      target.status === status &&
      target.home_score === home &&
      target.away_score === away
    ) {
      return false; // sin cambios
    }
    const { error } = await supabase
      .from("matches")
      .update({ status, home_score: home, away_score: away })
      .eq("id", target.id);
    if (error) {
      pushErr(`update ${target.id}: ${error.message}`);
      return false;
    }
    return true;
  };

  // 6) PASS 2 — football-data AUTORIDAD (si respondió)
  let fdUpdated = 0;
  const fdUnmatched: string[] = [];
  if (fdOk) {
    for (const fm of fdMatches) {
      const stage = mapFdStage(fm.stage);
      if (!stage) continue;
      const hc = fdCode(fm.homeTeam);
      const ac = fdCode(fm.awayTeam);
      if (!hc || !ac) {
        // En grupos los equipos SIEMPRE están definidos: si no mapea, es un alias faltante.
        if (stage === "group" && fdUnmatched.length < 10) {
          fdUnmatched.push(
            `nomap:${fm.homeTeam?.tla ?? fm.homeTeam?.name}/${fm.awayTeam?.tla ?? fm.awayTeam?.name}`
          );
        }
        continue; // knockout TBD -> dejar placeholder
      }
      let target: OurMatch | undefined;
      if (stage === "group") {
        const letter = (fm.group ?? "").replace(/group_/i, "").trim().toUpperCase();
        target = groupKey.get(`${letter}|${[hc, ac].sort().join("-")}`);
      } else {
        target = koKey.get(`${stage}|${[hc, ac].sort().join("-")}`);
      }
      if (!target) {
        if (fdUnmatched.length < 10) fdUnmatched.push(`${stage}:${hc}-${ac}`);
        continue;
      }
      const status = mapFdStatus(fm.status);
      const ft = fm.score?.fullTime;
      const homeIsHc = (idToCode.get(target.home_team_id ?? -1) ?? "") === hc;
      let h: number | null = null;
      let a: number | null = null;
      if (ft && ft.home != null && ft.away != null) {
        h = homeIsHc ? ft.home : ft.away;
        a = homeIsHc ? ft.away : ft.home;
      }
      const changed = await applyDynamic(target, status, h, a);
      fdUpdatedIds.add(target.id);
      if (changed) fdUpdated++;
    }
  }

  // 7) PASS 3 — BACKUP openfootball (solo finales, sin tocar lo demás)
  // Aplica cuando football-data está caído o no emparejó ese partido.
  let backupUpdated = 0;
  // knockout finales por external_id (home = team1 en nuestras filas of-)
  for (const [ext, ft] of ofFinishedByExt) {
    const target = byExt.get(ext);
    if (!target || fdUpdatedIds.has(target.id)) continue;
    if (await applyDynamic(target, "finished", ft[0], ft[1])) backupUpdated++;
  }
  // grupos finales por (grupo + códigos)
  for (const [key, val] of ofFinishedByGroupKey) {
    const target = groupKey.get(key);
    if (!target || fdUpdatedIds.has(target.id)) continue;
    const [g1, g2, homeCodeOf] = val;
    const homeIsTeam1 =
      (idToCode.get(target.home_team_id ?? -1) ?? "") === homeCodeOf;
    const h = homeIsTeam1 ? g1 : g2;
    const a = homeIsTeam1 ? g2 : g1;
    if (await applyDynamic(target, "finished", h, a)) backupUpdated++;
  }

  // 8) Marcas de tiempo
  const now = new Date().toISOString();
  const stamps = [{ key: "last_sync_at", value: now }];
  if (fdOk) stamps.push({ key: "last_fd_ok_at", value: now });
  await supabase.from("app_config").upsert(stamps, { onConflict: "key" });

  return json({
    ok: true,
    fdOk,
    ofFetched: ofMatches.length,
    fdFetched: fdMatches.length,
    koUpserted,
    fdMatched: fdUpdatedIds.size,
    fdUpdated,
    backupUpdated,
    fdUnmatchedSample: fdUnmatched,
    dbErrors,
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

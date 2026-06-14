// Tipos de dominio (espejo del esquema de Postgres). Ver supabase/migrations.

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
export type MatchStatus = "scheduled" | "live" | "finished";
export type MemberRole = "admin" | "member";
export type InvitationStatus = "pending" | "accepted";

// Orden y etiquetas de las fases (terminología del Mundial 2026 / 48 equipos)
export const STAGES: Stage[] = [
  "group",
  "r32",
  "r16",
  "qf",
  "sf",
  "third",
  "final",
];

export const STAGE_LABEL: Record<Stage, string> = {
  group: "Fase de grupos",
  r32: "16vos de final",
  r16: "8vos de final",
  qf: "Cuartos de final",
  sf: "Semifinales",
  third: "Tercer lugar",
  final: "Final",
};

export const STAGE_SHORT: Record<Stage, string> = {
  group: "Grupos",
  r32: "16vos",
  r16: "8vos",
  qf: "4tos",
  sf: "Semis",
  third: "3er lugar",
  final: "Final",
};

export const isKnockout = (s: Stage) => s !== "group";

export interface Team {
  id: number;
  code: string;
  name: string;
  flag_emoji: string | null;
  group_letter: string | null;
}

export interface Stadium {
  id: number;
  name: string;
  city: string;
  country: string;
}

export interface MatchRow {
  id: number;
  external_id: string | null;
  stage: Stage;
  group_letter: string | null;
  matchday: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  stadium_id: number | null;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
}

// Partido con relaciones cargadas (joins de Supabase)
export interface MatchWithTeams extends MatchRow {
  home_team: Team | null;
  away_team: Team | null;
  stadium: Stadium | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
}

export interface BetGroup {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_email: string;
  invited_by: string;
  status: InvitationStatus;
  created_at: string;
}

export interface Prediction {
  id: string;
  group_id: string;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  updated_at: string;
}

export interface PhaseSubmission {
  id: string;
  group_id: string;
  user_id: string;
  stage: Stage;
  submitted_at: string;
}

export interface GroupRankingRow {
  group_id: string;
  user_id: string;
  total_points: number;
  position: number;
}

// Nombre a mostrar de un lado del partido: equipo real o placeholder.
export function sideLabel(
  team: Team | null,
  placeholder: string | null
): { name: string; flag: string | null; code: string | null; known: boolean } {
  if (team)
    return {
      name: team.name,
      flag: team.flag_emoji,
      code: team.code,
      known: true,
    };
  return { name: placeholder ?? "Por definir", flag: null, code: null, known: false };
}

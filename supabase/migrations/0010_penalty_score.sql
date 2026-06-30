-- ============================================================================
-- Migración 0010: guardar el marcador de la tanda de penales (para mostrarlo).
-- El marcador del CAMPO (empate) se guarda en home_score/away_score; estos son
-- los goles de la tanda (orientación local-visitante, como los da football-data).
-- ============================================================================

alter table public.matches add column if not exists pen_home int;
alter table public.matches add column if not exists pen_away int;

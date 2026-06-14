-- ============================================================================
-- Migración 0007: etiqueta de periodo en vivo.
-- Valores: '1H' (1er tiempo), 'HT' (medio tiempo), '2H' (2do tiempo),
--          'ET' (tiempo extra), 'PEN' (penales). NULL si no aplica.
-- La llena `sync-scores` desde football-data (status + halfTime + duration).
-- ============================================================================

alter table public.matches add column if not exists live_period text;

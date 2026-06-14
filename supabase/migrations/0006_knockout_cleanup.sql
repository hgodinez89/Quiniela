-- ============================================================================
-- Migración 0006: el sync (openfootball) pasa a ser dueño de los partidos de
-- knockout, con clave external_id = 'of-<num>'. Eliminamos los slots de knockout
-- sembrados a mano (external_id 'seed-...') para que `sync-scores` los reponga
-- con los datos reales (equipos/placeholders, fechas y marcadores).
--
-- Nota: borra en cascada cualquier predicción de knockout existente, pero el
-- knockout aún no es predecible (equipos sin definir), así que el impacto es nulo.
-- ============================================================================

delete from public.matches
where stage in ('r32', 'r16', 'qf', 'sf', 'third', 'final')
  and external_id like 'seed-%';

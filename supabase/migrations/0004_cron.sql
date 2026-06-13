-- ============================================================================
-- Migración 0004: extensiones para programar el sync de marcadores.
--
-- NOTA: la PROGRAMACIÓN del cron (cron.schedule) requiere la URL de la Edge
-- Function y la service_role key, que son específicas del proyecto y secretas.
-- Por eso NO se hardcodean aquí: el snippet de `cron.schedule` está en DEPLOY.md
-- (paso 6) para ejecutarse tras desplegar la función. Esta migración solo deja
-- listas las extensiones.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- La cadencia objetivo y la ventana activa se controlan desde public.app_config
-- (claves: score_sync_seconds, active_window_minutes, sync_enabled). La Edge
-- Function se auto-regula según esos valores; el cron solo necesita dispararla
-- cada minuto.

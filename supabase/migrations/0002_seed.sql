-- ============================================================================
-- Migración 0002: seed del torneo (datos de referencia).
--
-- NOTA: en producción, la Edge Function `sync-scores` es la fuente de verdad de
-- MARCADORES y ESTADO (los sobrescribe cada pocos minutos). Este seed bootstrapea
-- el catálogo (equipos, estadios), el calendario de fase de grupos y los slots de
-- knockout. Los marcadores de partidos ya jugados aquí son placeholders y serán
-- corregidos por la sincronización contra la API real.
-- "as-of" del seed: 2026-06-13 12:00 UTC (define qué partidos salen como jugados).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Estadios (16 sedes oficiales). IDs 1..16 por orden de inserción.
-- ---------------------------------------------------------------------------
insert into public.stadiums (name, city, country) values
  ('Mercedes-Benz Stadium', 'Atlanta', 'USA'),
  ('Gillette Stadium', 'Boston', 'USA'),
  ('AT&T Stadium', 'Dallas', 'USA'),
  ('NRG Stadium', 'Houston', 'USA'),
  ('Arrowhead Stadium', 'Kansas City', 'USA'),
  ('SoFi Stadium', 'Los Angeles', 'USA'),
  ('Hard Rock Stadium', 'Miami', 'USA'),
  ('MetLife Stadium', 'New York/New Jersey', 'USA'),
  ('Lincoln Financial Field', 'Philadelphia', 'USA'),
  ('Levi''s Stadium', 'San Francisco Bay Area', 'USA'),
  ('Lumen Field', 'Seattle', 'USA'),
  ('Estadio Azteca', 'Ciudad de México', 'México'),
  ('Estadio Akron', 'Guadalajara', 'México'),
  ('Estadio BBVA', 'Monterrey', 'México'),
  ('BMO Field', 'Toronto', 'Canadá'),
  ('BC Place', 'Vancouver', 'Canadá')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Equipos (48) por grupo A..L
-- ---------------------------------------------------------------------------
insert into public.teams (code, name, flag_emoji, group_letter) values
  ('MEX','México','🇲🇽','A'), ('RSA','Sudáfrica','🇿🇦','A'), ('KOR','Corea del Sur','🇰🇷','A'), ('CZE','Chequia','🇨🇿','A'),
  ('CAN','Canadá','🇨🇦','B'), ('BIH','Bosnia y Herzegovina','🇧🇦','B'), ('QAT','Catar','🇶🇦','B'), ('SUI','Suiza','🇨🇭','B'),
  ('BRA','Brasil','🇧🇷','C'), ('MAR','Marruecos','🇲🇦','C'), ('HAI','Haití','🇭🇹','C'), ('SCO','Escocia','🏴󠁧󠁢󠁳󠁣󠁴󠁿','C'),
  ('USA','Estados Unidos','🇺🇸','D'), ('PAR','Paraguay','🇵🇾','D'), ('AUS','Australia','🇦🇺','D'), ('TUR','Turquía','🇹🇷','D'),
  ('GER','Alemania','🇩🇪','E'), ('CUW','Curazao','🇨🇼','E'), ('CIV','Costa de Marfil','🇨🇮','E'), ('ECU','Ecuador','🇪🇨','E'),
  ('NED','Países Bajos','🇳🇱','F'), ('JPN','Japón','🇯🇵','F'), ('SWE','Suecia','🇸🇪','F'), ('TUN','Túnez','🇹🇳','F'),
  ('BEL','Bélgica','🇧🇪','G'), ('EGY','Egipto','🇪🇬','G'), ('IRN','Irán','🇮🇷','G'), ('NZL','Nueva Zelanda','🇳🇿','G'),
  ('ESP','España','🇪🇸','H'), ('CPV','Cabo Verde','🇨🇻','H'), ('KSA','Arabia Saudita','🇸🇦','H'), ('URU','Uruguay','🇺🇾','H'),
  ('FRA','Francia','🇫🇷','I'), ('SEN','Senegal','🇸🇳','I'), ('IRQ','Irak','🇮🇶','I'), ('NOR','Noruega','🇳🇴','I'),
  ('ARG','Argentina','🇦🇷','J'), ('ALG','Argelia','🇩🇿','J'), ('AUT','Austria','🇦🇹','J'), ('JOR','Jordania','🇯🇴','J'),
  ('POR','Portugal','🇵🇹','K'), ('COD','RD del Congo','🇨🇩','K'), ('UZB','Uzbekistán','🇺🇿','K'), ('COL','Colombia','🇨🇴','K'),
  ('ENG','Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿','L'), ('CRO','Croacia','🇭🇷','L'), ('GHA','Ghana','🇬🇭','L'), ('PAN','Panamá','🇵🇦','L')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Fase de grupos: 72 partidos (round-robin por grupo) generados.
-- Emparejamientos por jornada (posiciones 1..4 dentro del grupo):
--   J1: 1v2, 3v4   J2: 1v3, 2v4   J3: 1v4, 2v3
-- ---------------------------------------------------------------------------
with ranked as (
  select id, group_letter,
         row_number() over (partition by group_letter order by id) as pos,
         (ascii(group_letter) - ascii('A')) as gidx
  from public.teams
  where group_letter is not null
),
pairs(md, slot, hp, ap) as (
  values (1,0,1,2),(1,1,3,4),(2,0,1,3),(2,1,2,4),(3,0,1,4),(3,1,2,3)
)
insert into public.matches
  (external_id, stage, group_letter, matchday, home_team_id, away_team_id,
   stadium_id, kickoff_at, status, home_score, away_score)
select
  'seed-group-' || r1.group_letter || '-' || p.md || '-' || p.slot,
  'group', r1.group_letter, p.md, r1.id, r2.id,
  ((r1.gidx + p.md + p.slot) % 16) + 1,
  ko.kickoff,
  case when ko.kickoff < timestamptz '2026-06-13 12:00:00+00'
       then 'finished'::match_status else 'scheduled'::match_status end,
  case when ko.kickoff < timestamptz '2026-06-13 12:00:00+00'
       then ((r1.id * 2 + p.md) % 4) else null end,
  case when ko.kickoff < timestamptz '2026-06-13 12:00:00+00'
       then ((r2.id + p.md) % 3) else null end
from pairs p
join ranked r1 on r1.pos = p.hp
join ranked r2 on r2.group_letter = r1.group_letter and r2.pos = p.ap
cross join lateral (
  select timestamptz '2026-06-11 16:00:00+00'
       + ((p.md - 1) * interval '6 days')
       + (r1.gidx * interval '7 hours')
       + (p.slot * interval '3 hours') as kickoff
) ko
on conflict (external_id) do nothing;

-- Resultados reales conocidos al 2026-06-13 (sobrescriben placeholders del seed).
update public.matches m set status='finished', home_score=2, away_score=0
  from public.teams h, public.teams a
  where m.stage='group' and m.group_letter='A'
    and m.home_team_id=h.id and m.away_team_id=a.id and h.code='MEX' and a.code='RSA';
update public.matches m set status='finished', home_score=2, away_score=1
  from public.teams h, public.teams a
  where m.stage='group' and m.home_team_id=h.id and m.away_team_id=a.id
    and h.code='KOR' and a.code='CZE';
update public.matches m set status='finished', home_score=1, away_score=1
  from public.teams h, public.teams a
  where m.stage='group' and m.home_team_id=h.id and m.away_team_id=a.id
    and h.code='CAN' and a.code='BIH';

-- ---------------------------------------------------------------------------
-- Knockout: slots con placeholders (equipos null hasta que la fuente los defina).
-- Los equipos reales y marcadores los completa `sync-scores`. Estos slots
-- permiten renderizar las llaves y "abrir" predicciones cuando lleguen equipos.
-- ---------------------------------------------------------------------------
-- Round of 32 (16vos): 16 partidos, 28 jun - 3 jul
insert into public.matches (external_id, stage, matchday, home_placeholder, away_placeholder, stadium_id, kickoff_at)
values
  ('seed-r32-1','r32',1,'1A','2B',8, timestamptz '2026-06-28 16:00:00+00'),
  ('seed-r32-2','r32',1,'1C','2D',3, timestamptz '2026-06-28 20:00:00+00'),
  ('seed-r32-3','r32',1,'1E','2F',6, timestamptz '2026-06-29 16:00:00+00'),
  ('seed-r32-4','r32',1,'1G','2H',12,timestamptz '2026-06-29 20:00:00+00'),
  ('seed-r32-5','r32',1,'1I','2J',7, timestamptz '2026-06-30 16:00:00+00'),
  ('seed-r32-6','r32',1,'1K','2L',2, timestamptz '2026-06-30 20:00:00+00'),
  ('seed-r32-7','r32',1,'2A','1B',5, timestamptz '2026-07-01 16:00:00+00'),
  ('seed-r32-8','r32',1,'2C','1D',9, timestamptz '2026-07-01 20:00:00+00'),
  ('seed-r32-9','r32',1,'2E','1F',1, timestamptz '2026-07-02 16:00:00+00'),
  ('seed-r32-10','r32',1,'2G','1H',10,timestamptz '2026-07-02 20:00:00+00'),
  ('seed-r32-11','r32',1,'2I','1J',4, timestamptz '2026-07-03 16:00:00+00'),
  ('seed-r32-12','r32',1,'2K','1L',11,timestamptz '2026-07-03 20:00:00+00'),
  ('seed-r32-13','r32',1,'1L','3CDFG',13,timestamptz '2026-06-28 23:00:00+00'),
  ('seed-r32-14','r32',1,'1H','3ABCD',14,timestamptz '2026-06-29 23:00:00+00'),
  ('seed-r32-15','r32',1,'1D','3BEFI',15,timestamptz '2026-06-30 23:00:00+00'),
  ('seed-r32-16','r32',1,'1F','3EHIJ',16,timestamptz '2026-07-01 23:00:00+00')
on conflict (external_id) do nothing;

-- Round of 16 (8vos): 8 partidos, 5-7 jul
insert into public.matches (external_id, stage, matchday, home_placeholder, away_placeholder, stadium_id, kickoff_at)
values
  ('seed-r16-1','r16',1,'Ganador 16vos 1','Ganador 16vos 2',8, timestamptz '2026-07-05 16:00:00+00'),
  ('seed-r16-2','r16',1,'Ganador 16vos 3','Ganador 16vos 4',3, timestamptz '2026-07-05 20:00:00+00'),
  ('seed-r16-3','r16',1,'Ganador 16vos 5','Ganador 16vos 6',6, timestamptz '2026-07-06 16:00:00+00'),
  ('seed-r16-4','r16',1,'Ganador 16vos 7','Ganador 16vos 8',12,timestamptz '2026-07-06 20:00:00+00'),
  ('seed-r16-5','r16',1,'Ganador 16vos 9','Ganador 16vos 10',7, timestamptz '2026-07-07 16:00:00+00'),
  ('seed-r16-6','r16',1,'Ganador 16vos 11','Ganador 16vos 12',2, timestamptz '2026-07-07 20:00:00+00'),
  ('seed-r16-7','r16',1,'Ganador 16vos 13','Ganador 16vos 14',5, timestamptz '2026-07-07 23:00:00+00'),
  ('seed-r16-8','r16',1,'Ganador 16vos 15','Ganador 16vos 16',9, timestamptz '2026-07-06 23:00:00+00')
on conflict (external_id) do nothing;

-- Cuartos (4tos): 4 partidos, 9-10 jul
insert into public.matches (external_id, stage, matchday, home_placeholder, away_placeholder, stadium_id, kickoff_at)
values
  ('seed-qf-1','qf',1,'Ganador 8vos 1','Ganador 8vos 2',8, timestamptz '2026-07-09 16:00:00+00'),
  ('seed-qf-2','qf',1,'Ganador 8vos 3','Ganador 8vos 4',3, timestamptz '2026-07-09 20:00:00+00'),
  ('seed-qf-3','qf',1,'Ganador 8vos 5','Ganador 8vos 6',6, timestamptz '2026-07-10 16:00:00+00'),
  ('seed-qf-4','qf',1,'Ganador 8vos 7','Ganador 8vos 8',12,timestamptz '2026-07-10 20:00:00+00')
on conflict (external_id) do nothing;

-- Semifinales: 2 partidos, 14-15 jul
insert into public.matches (external_id, stage, matchday, home_placeholder, away_placeholder, stadium_id, kickoff_at)
values
  ('seed-sf-1','sf',1,'Ganador 4tos 1','Ganador 4tos 2',3, timestamptz '2026-07-14 20:00:00+00'),
  ('seed-sf-2','sf',1,'Ganador 4tos 3','Ganador 4tos 4',8, timestamptz '2026-07-15 20:00:00+00')
on conflict (external_id) do nothing;

-- Tercer lugar: 18 jul
insert into public.matches (external_id, stage, matchday, home_placeholder, away_placeholder, stadium_id, kickoff_at)
values
  ('seed-third-1','third',1,'Perdedor SF 1','Perdedor SF 2',7, timestamptz '2026-07-18 20:00:00+00')
on conflict (external_id) do nothing;

-- Final: 19 jul, MetLife
insert into public.matches (external_id, stage, matchday, home_placeholder, away_placeholder, stadium_id, kickoff_at)
values
  ('seed-final-1','final',1,'Ganador SF 1','Ganador SF 2',8, timestamptz '2026-07-19 19:00:00+00')
on conflict (external_id) do nothing;

-- ---------------------------------------------------------------------------
-- Configuración del sync (único lugar para ajustar la cadencia)
-- ---------------------------------------------------------------------------
insert into public.app_config (key, value) values
  ('sync_enabled', 'true'),
  ('score_sync_seconds', '1800'),      -- cadencia (openfootball se actualiza ~diario)
  ('active_window_minutes', '180'),    -- reservado (no usado por el adaptador openfootball)
  -- Fuente por defecto: openfootball (gratis, sin API key). Es la URL del archivo JSON.
  ('score_api_base', 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json')
on conflict (key) do update set value = excluded.value, updated_at = now();

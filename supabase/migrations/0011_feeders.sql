-- ============================================================================
-- Migración 0011: feeders inmutables del bracket.
-- El diagrama de llave arma el árbol con los feeders W<num>/L<num>. Antes se
-- leían de home_placeholder/away_placeholder, que se borran al resolver el
-- cruce → partidos se caían del árbol. Estas columnas guardan el feeder de
-- forma permanente (estructura oficial fija de R16→Final; no depende de terceros).
-- ============================================================================

alter table public.matches add column if not exists home_feeder text;
alter table public.matches add column if not exists away_feeder text;

-- Mapeo fijo de R16 (of-89..96), 4tos (97..100), Semis (101..102),
-- 3er lugar (103) y Final (104). Verificado contra openfootball.
update public.matches as m set home_feeder = v.hf, away_feeder = v.af
from (values
  ('of-89','W74','W77'),
  ('of-90','W73','W75'),
  ('of-91','W76','W78'),
  ('of-92','W79','W80'),
  ('of-93','W83','W84'),
  ('of-94','W81','W82'),
  ('of-95','W86','W88'),
  ('of-96','W85','W87'),
  ('of-97','W89','W90'),
  ('of-98','W93','W94'),
  ('of-99','W91','W92'),
  ('of-100','W95','W96'),
  ('of-101','W97','W98'),
  ('of-102','W99','W100'),
  ('of-103','L101','L102'),
  ('of-104','W101','W102')
) as v(ext, hf, af)
where m.external_id = v.ext;

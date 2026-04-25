-- ═══════════════════════════════════════════════════════════════
-- Mejía Peralta Construcciones — Supabase Setup
-- Run this entire script in:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════


-- ── 1. Projects table ──────────────────────────────────────────
create table if not exists public.projects (
  id             uuid        primary key default gen_random_uuid(),
  slug           text        unique not null,
  title_es       text        not null,
  title_en       text,
  description_es text,
  description_en text,
  category       text        not null default 'residential'
                   check (category in ('residential','commercial','industrial','cabin')),
  status         text        not null default 'finished'
                   check (status in ('finished','under_construction')),
  year           text,
  location       text,
  area           text,
  client         text,
  featured       boolean     not null default false,
  cover_url      text,
  gallery_urls   jsonb       not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);


-- ── 2. Row Level Security ──────────────────────────────────────
alter table public.projects enable row level security;

-- Anyone (including anonymous visitors) can read
create policy "Public can read projects"
  on public.projects for select
  to anon, authenticated
  using (true);

-- Only authenticated admin users can write
create policy "Authenticated can insert"
  on public.projects for insert
  to authenticated
  with check (true);

create policy "Authenticated can update"
  on public.projects for update
  to authenticated
  using (true);

create policy "Authenticated can delete"
  on public.projects for delete
  to authenticated
  using (true);


-- ── 3. Auto-update updated_at ──────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_projects_update on public.projects;
create trigger on_projects_update
  before update on public.projects
  for each row execute procedure public.handle_updated_at();


-- ── 4. Storage bucket for images ──────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  true,
  10485760,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Public read
create policy "Public can view images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

-- Authenticated upload / update / delete
create policy "Authenticated can upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

create policy "Authenticated can update images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images');

create policy "Authenticated can delete images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');


-- ── 5. Seed initial projects ───────────────────────────────────
-- Remove or comment this block if you don't want demo data
insert into public.projects
  (slug, title_es, title_en, description_es, description_en, category, status, year, location, area, featured, cover_url, gallery_urls)
values
  ('casa-residencial-la-vega',
   'Casa Residencial — La Vega', 'Residential House — La Vega',
   'Construcción de vivienda unifamiliar de dos niveles con diseño moderno, áreas sociales abiertas, 4 habitaciones y acabados de alta calidad en La Vega, República Dominicana.',
   'Construction of a two-story single-family home with modern design, open social areas, 4 bedrooms and high-quality finishes in La Vega, Dominican Republic.',
   'residential', 'finished', '2023', 'La Vega, RD', '280 m²', true, null, '[]'),

  ('local-comercial-la-vega',
   'Local Comercial — La Vega', 'Commercial Space — La Vega',
   'Diseño y construcción de local comercial de 350 m² para uso mixto, con fachada moderna, estacionamiento y sistemas eléctricos e hidráulicos de última generación.',
   'Design and construction of a 350 m² mixed-use commercial space with a modern facade, parking and state-of-the-art electrical and hydraulic systems.',
   'commercial', 'finished', '2023', 'La Vega, RD', '350 m²', true, null, '[]'),

  ('nave-industrial-la-vega',
   'Nave Industrial — La Vega', 'Industrial Building — La Vega',
   'Construcción de nave industrial con estructura metálica de 1,200 m², techos de zinc calibre 26, portones industriales y sistema contra incendios, ideal para almacenamiento y manufactura.',
   'Construction of an industrial building with a 1,200 m² steel structure, 26-gauge zinc roofing, industrial doors and fire suppression system, ideal for storage and manufacturing.',
   'industrial', 'finished', '2022', 'La Vega, RD', '1200 m²', true, null, '[]'),

  ('vivienda-unifamiliar-la-vega',
   'Vivienda Unifamiliar — La Vega', 'Single-Family Home — La Vega',
   'Vivienda unifamiliar de un nivel con diseño arquitectónico contemporáneo, jardín, piscina y terraza. Acabados en granito y porcelanato importado.',
   'Single-story single-family home with contemporary architectural design, garden, pool and terrace. Granite and imported porcelain finishes.',
   'residential', 'under_construction', '2024', 'La Vega, RD', '210 m²', false, null, '[]'),

  ('cabanas-turisticas-la-vega',
   'Cabañas Turísticas — La Vega', 'Tourist Cabins — La Vega',
   'Construcción de complejo de 6 cabañas turísticas en madera de pino tratada, con terrazas, sistemas de agua caliente solar y diseño integrado al entorno natural.',
   'Construction of a complex of 6 tourist cabins in treated pine wood, with terraces, solar hot water systems and design integrated into the natural environment.',
   'cabin', 'finished', '2023', 'La Vega, RD', '420 m²', false, null, '[]'),

  ('edificio-corporativo-la-vega',
   'Edificio Corporativo — La Vega', 'Corporate Building — La Vega',
   'Edificio de oficinas de 4 niveles con fachada de vidrio templado, sistema de climatización central, estacionamiento en sótano y sala de reuniones con tecnología audiovisual.',
   '4-story office building with tempered glass facade, central air conditioning system, basement parking and meeting room with audiovisual technology.',
   'commercial', 'under_construction', '2024', 'La Vega, RD', '900 m²', false, null, '[]'),

  ('estructura-metalica-industrial',
   'Estructura Metálica Industrial', 'Industrial Metal Structure',
   'Diseño y fabricación de estructura metálica para planta de producción. Columnas de acero A36, vigas tipo I y cubierta metaldeck. Superficie total de 800 m².',
   'Design and fabrication of a metal structure for a production plant. A36 steel columns, I-type beams and metaldeck roofing. Total area of 800 m².',
   'industrial', 'finished', '2022', 'La Vega, RD', '800 m²', false, null, '[]'),

  ('residencia-de-lujo-la-vega',
   'Residencia de Lujo — La Vega', 'Luxury Residence — La Vega',
   'Residencia de lujo con 5 habitaciones, spa, piscina infinity, cava de vinos, cine en casa y jardines paisajísticos. Domótica integrada en toda la propiedad.',
   'Luxury residence with 5 bedrooms, spa, infinity pool, wine cellar, home theater and landscape gardens. Integrated home automation throughout the property.',
   'residential', 'finished', '2023', 'La Vega, RD', '650 m²', false, null, '[]'),

  ('pavimentacion-comercial',
   'Pavimentación Comercial', 'Commercial Paving',
   'Pavimentación de área comercial de 2,500 m² con adoquines de hormigón de alta resistencia, drenaje pluvial y señalización horizontal. Incluye áreas de estacionamiento y acceso vehicular.',
   'Paving of 2,500 m² commercial area with high-strength concrete pavers, storm drainage and horizontal signage. Includes parking areas and vehicular access.',
   'commercial', 'finished', '2022', 'La Vega, RD', '2500 m²', false, null, '[]')

on conflict (slug) do nothing;

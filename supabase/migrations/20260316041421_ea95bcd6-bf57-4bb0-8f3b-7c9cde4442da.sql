alter table featured_trips
  add column if not exists slug text unique,
  add column if not exists tagline text,
  add column if not exists overview text,
  add column if not exists itinerary jsonb default '[]'::jsonb,
  add column if not exists included text[] default '{}',
  add column if not exists excluded text[] default '{}',
  add column if not exists gallery_images text[] default '{}',
  add column if not exists group_size text,
  add column if not exists difficulty text,
  add column if not exists rating numeric(3,1),
  add column if not exists review_count int default 0;

-- Auto-generate slug from trip_name for existing rows
update featured_trips
set slug = lower(regexp_replace(
  regexp_replace(trip_name, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
))
where slug is null;
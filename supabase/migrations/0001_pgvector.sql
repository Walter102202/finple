create extension if not exists vector;

create table if not exists ley_chunks (
  id              bigserial primary key,
  id_norma        text         not null,
  ley_alias       text         not null,
  articulo_num    text         not null,
  contenido       text         not null,
  url_oficial     text         not null,
  area_skill      text         not null,
  tokens_aprox    int,
  embedding       vector(1536) not null,
  ingested_at     timestamptz  default now(),
  unique (id_norma, articulo_num)
);

create index if not exists ley_chunks_embedding_idx
  on ley_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists ley_chunks_area_idx on ley_chunks (area_skill);
create index if not exists ley_chunks_idnorma_idx on ley_chunks (id_norma);

alter table ley_chunks enable row level security;

drop policy if exists "anon_can_read_ley_chunks" on ley_chunks;
create policy "anon_can_read_ley_chunks"
  on ley_chunks for select
  to anon, authenticated
  using (true);

create or replace function match_ley_chunks(
  query_embedding vector(1536),
  match_count     int default 6,
  filter_area     text default null
)
returns table (
  id           bigint,
  id_norma     text,
  ley_alias    text,
  articulo_num text,
  contenido    text,
  url_oficial  text,
  area_skill   text,
  similarity   float
)
language sql stable
as $$
  select
    c.id,
    c.id_norma,
    c.ley_alias,
    c.articulo_num,
    c.contenido,
    c.url_oficial,
    c.area_skill,
    1 - (c.embedding <=> query_embedding) as similarity
  from ley_chunks c
  where filter_area is null or c.area_skill = filter_area
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

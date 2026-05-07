-- Multi-source corpus: leyes (BCN), NCGs (CMF), dictámenes (SERNAC)

alter table ley_chunks
  add column if not exists source_type text not null default 'ley',
  add column if not exists documento_id text,
  add column if not exists documento_label text;

update ley_chunks
   set documento_id    = coalesce(documento_id, articulo_num),
       documento_label = coalesce(documento_label, articulo_num)
 where source_type = 'ley';

alter table ley_chunks alter column documento_id set not null;
alter table ley_chunks alter column articulo_num drop not null;

alter table ley_chunks drop constraint if exists ley_chunks_id_norma_articulo_num_key;

alter table ley_chunks
  add constraint ley_chunks_source_doc_unique unique (source_type, id_norma, documento_id);

create index if not exists ley_chunks_source_idx on ley_chunks (source_type);

drop function if exists match_ley_chunks(vector, int, text);

create or replace function match_ley_chunks(
  query_embedding    vector(1536),
  match_count        int  default 6,
  filter_area        text default null,
  filter_source_type text default null
)
returns table (
  id              bigint,
  source_type     text,
  id_norma        text,
  ley_alias       text,
  documento_id    text,
  documento_label text,
  contenido       text,
  url_oficial     text,
  area_skill      text,
  similarity      float
)
language sql stable
as $$
  select
    c.id,
    c.source_type,
    c.id_norma,
    c.ley_alias,
    c.documento_id,
    coalesce(c.documento_label, c.documento_id) as documento_label,
    c.contenido,
    c.url_oficial,
    c.area_skill,
    1 - (c.embedding <=> query_embedding) as similarity
  from ley_chunks c
  where (filter_area is null or c.area_skill = filter_area)
    and (filter_source_type is null or c.source_type = filter_source_type)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

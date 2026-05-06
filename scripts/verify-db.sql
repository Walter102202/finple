select
  (select count(*) from information_schema.tables where table_name = 'ley_chunks') as has_table,
  (select count(*) from pg_proc where proname = 'match_ley_chunks') as has_rpc,
  (select count(*) from pg_extension where extname = 'vector') as has_pgvector,
  (select count(*) from ley_chunks) as total_chunks;

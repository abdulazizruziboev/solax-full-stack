-- Convert `readings` into a TimescaleDB hypertable and enable native columnar
-- compression. Inverter telemetry is append-only time-series data whose bulk is
-- the ~500-byte `raw` JSON per row; compression stores aged chunks ~4-20x
-- smaller. New rows always land in the current (uncompressed) chunk; the policy
-- compresses chunks older than 7 days automatically, so live inserts stay fast.
--
-- NOTE: create_hypertable(migrate_data => true) cannot run inside a transaction.
-- If `prisma migrate deploy` wraps this file in one and fails, apply it manually:
--   psql "$DATABASE_URL" -f migration.sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- migrate_data => false keeps this transaction-safe for `prisma migrate deploy`
-- (Prisma wraps each migration in a transaction; migrate_data => true cannot run
-- in one). On a fresh deploy the table is empty, so there is nothing to migrate.
SELECT create_hypertable(
  'readings', 'ts',
  chunk_time_interval => INTERVAL '1 day',
  migrate_data => false,
  if_not_exists => true
);

ALTER TABLE readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"deviceId"',
  timescaledb.compress_orderby = 'ts DESC'
);

SELECT add_compression_policy('readings', INTERVAL '7 days', if_not_exists => true);

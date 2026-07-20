-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ALARM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlarmSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "sn" TEXT NOT NULL,
    "tokenId" TEXT,
    "name" TEXT NOT NULL,
    "plantName" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" BIGSERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acPower" DOUBLE PRECISION,
    "yieldToday" DOUBLE PRECISION,
    "yieldTotal" DOUBLE PRECISION,
    "batterySoc" DOUBLE PRECISION,
    "gridPower" DOUBLE PRECISION,
    "feedInPower" DOUBLE PRECISION,
    "raw" JSONB,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id","ts")
);

-- CreateTable
CREATE TABLE "alarms" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlarmSeverity" NOT NULL DEFAULT 'WARNING',
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alarms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "devices_sn_key" ON "devices"("sn");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "readings_deviceId_ts_idx" ON "readings"("deviceId", "ts");

-- CreateIndex
CREATE INDEX "alarms_deviceId_ts_idx" ON "alarms"("deviceId", "ts");

-- CreateIndex
CREATE INDEX "alarms_resolvedAt_idx" ON "alarms"("resolvedAt");

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alarms" ADD CONSTRAINT "alarms_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable TimescaleDB and convert "readings" into a hypertable partitioned by "ts".
CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable('readings', 'ts', if_not_exists => TRUE, migrate_data => TRUE);

-- Compress older chunks automatically to keep 175+ devices worth of history cheap to store.
ALTER TABLE "readings" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = '"deviceId"'
);

SELECT add_compression_policy('readings', INTERVAL '7 days', if_not_exists => TRUE);

-- Drop old readings after 2 years to bound storage growth.
SELECT add_retention_policy('readings', INTERVAL '730 days', if_not_exists => TRUE);

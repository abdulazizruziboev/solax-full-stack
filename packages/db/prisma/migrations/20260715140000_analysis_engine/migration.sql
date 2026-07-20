-- CreateEnum
CREATE TYPE "AlarmCategory" AS ENUM ('SYSTEM', 'DATA_QUALITY', 'PERFORMANCE', 'STRING', 'FUSE');

-- AlterTable
ALTER TABLE "alarms" ADD COLUMN     "category" "AlarmCategory" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "string_baselines" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "stringIndex" INTEGER NOT NULL,
    "medianShare" DOUBLE PRECISION NOT NULL,
    "madShare" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "string_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analyses" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completenessPct" DOUBLE PRECISION,
    "specificYield" DOUBLE PRECISION,
    "peerMedianYield" DOUBLE PRECISION,
    "performanceIndex" DOUBLE PRECISION,
    "expectedKwh" DOUBLE PRECISION,
    "actualKwh" DOUBLE PRECISION,
    "maxStringDevPct" DOUBLE PRECISION,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "string_baselines_deviceId_stringIndex_key" ON "string_baselines"("deviceId", "stringIndex");

-- CreateIndex
CREATE INDEX "daily_analyses_date_idx" ON "daily_analyses"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analyses_deviceId_date_key" ON "daily_analyses"("deviceId", "date");

-- AddForeignKey
ALTER TABLE "string_baselines" ADD CONSTRAINT "string_baselines_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_analyses" ADD CONSTRAINT "daily_analyses_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;


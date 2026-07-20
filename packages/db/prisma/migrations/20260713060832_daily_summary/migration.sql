-- DropIndex
DROP INDEX "readings_ts_idx";

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalYieldKwh" DOUBLE PRECISION,
    "peakAcPowerW" DOUBLE PRECISION,
    "offlineCount" INTEGER NOT NULL DEFAULT 0,
    "alarmCount" INTEGER NOT NULL DEFAULT 0,
    "wasOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_summaries_date_idx" ON "daily_summaries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_deviceId_date_key" ON "daily_summaries"("deviceId", "date");

-- AddForeignKey
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

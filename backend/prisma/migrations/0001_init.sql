-- CreateTable
CREATE TABLE "speed_checks" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "zoneType" TEXT NOT NULL,
    "speedLimit" DOUBLE PRECISION NOT NULL,
    "actualSpeed" DOUBLE PRECISION NOT NULL,
    "weatherCondition" TEXT NOT NULL,
    "violation" BOOLEAN NOT NULL,
    "violationProb" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "alerts" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "vehicleId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_cache" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "speed_checks_vehicleId_idx" ON "speed_checks"("vehicleId");
CREATE INDEX "speed_checks_createdAt_idx" ON "speed_checks"("createdAt");
CREATE INDEX "speed_checks_violation_idx" ON "speed_checks"("violation");
CREATE INDEX "alerts_vehicleId_idx" ON "alerts"("vehicleId");
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");
CREATE INDEX "alerts_acknowledged_idx" ON "alerts"("acknowledged");
CREATE INDEX "weather_cache_lat_lon_idx" ON "weather_cache"("lat", "lon");

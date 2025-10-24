-- CreateTable
CREATE TABLE "GoogleSheetsConfig" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "apiKey" TEXT,
    "serviceAccountJson" TEXT,
    "spreadsheetId" TEXT,
    "ccRange" TEXT,
    "fixedRange" TEXT,
    "upgradeRange" TEXT,
    "referralRange" TEXT,
    "allLeadsRange" TEXT,
    "teamsRange" TEXT,
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "syncIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSheetsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSheetsConfig_teamId_key" ON "GoogleSheetsConfig"("teamId");

-- CreateIndex
CREATE INDEX "GoogleSheetsConfig_teamId_idx" ON "GoogleSheetsConfig"("teamId");

-- CreateIndex
CREATE INDEX "GoogleSheetsConfig_autoSync_lastSyncAt_idx" ON "GoogleSheetsConfig"("autoSync", "lastSyncAt");

-- AddForeignKey
ALTER TABLE "GoogleSheetsConfig" ADD CONSTRAINT "GoogleSheetsConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

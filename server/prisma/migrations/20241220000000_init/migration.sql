-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'LEADER');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ABOVE', 'WARNING', 'BELOW');

-- CreateEnum
CREATE TYPE "AlertRuleType" AS ENUM ('BELOW_TARGET', 'MISSING_DATA', 'VARIANCE_SPIKE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('CC', 'FIXED', 'RE', 'UP', 'ALL_LEADS', 'TEAMS');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEADER',
    "teamId" TEXT,
    "calendlyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "mentorName" TEXT NOT NULL,
    "email" TEXT,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDaily" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "weekOfMonth" INTEGER,
    "ccPct" DOUBLE PRECISION,
    "scPct" DOUBLE PRECISION,
    "upPct" DOUBLE PRECISION,
    "fixedPct" DOUBLE PRECISION,
    "referralLeads" INTEGER,
    "referralShowups" INTEGER,
    "referralPaid" INTEGER,
    "referralAchievementPct" DOUBLE PRECISION,
    "totalLeads" INTEGER,
    "recoveredLeads" INTEGER,
    "unrecoveredLeads" INTEGER,
    "conversionPct" DOUBLE PRECISION,
    "notes" TEXT[],
    "ingestionId" TEXT,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "studentLevel" TEXT,
    "packages" TEXT,
    "registrationDate" TIMESTAMP(3),
    "firstOrderDate" TIMESTAMP(3),
    "latestRenewalTime" TIMESTAMP(3),
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "fixedPlansCount" INTEGER NOT NULL DEFAULT 0,
    "fixedTeachersCount" INTEGER NOT NULL DEFAULT 0,
    "completedLessonsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "classConsumptionLastMonth" DOUBLE PRECISION,
    "classConsumptionThisMonth" DOUBLE PRECISION,
    "totalLeadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "isRecovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveryDate" TIMESTAMP(3),
    "lastNoteDate" TIMESTAMP(3),
    "referralLeadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "referralShowups" INTEGER NOT NULL DEFAULT 0,
    "referralPaid" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorStats" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "activeStudents" INTEGER NOT NULL DEFAULT 0,
    "cc0Students" INTEGER NOT NULL DEFAULT 0,
    "cc1to7Students" INTEGER NOT NULL DEFAULT 0,
    "cc8to11Students" INTEGER NOT NULL DEFAULT 0,
    "cc12to14Students" INTEGER NOT NULL DEFAULT 0,
    "cc15to19Students" INTEGER NOT NULL DEFAULT 0,
    "cc20PlusStudents" INTEGER NOT NULL DEFAULT 0,
    "avgClassConsumption" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "superClassPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "excellentStudentRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedStudents" INTEGER NOT NULL DEFAULT 0,
    "totalFixable" INTEGER NOT NULL DEFAULT 0,
    "fixedRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstPurchaseCount" INTEGER NOT NULL DEFAULT 0,
    "upgradedCount" INTEGER NOT NULL DEFAULT 0,
    "upgradeRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "recoveredLeads" INTEGER NOT NULL DEFAULT 0,
    "unrecoveredLeads" INTEGER NOT NULL DEFAULT 0,
    "conversionRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralLeads" INTEGER NOT NULL DEFAULT 0,
    "referralShowups" INTEGER NOT NULL DEFAULT 0,
    "referralPaid" INTEGER NOT NULL DEFAULT 0,
    "weightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetsHit" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'BELOW',
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "ccTarget" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "scTarget" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "upTarget" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "fixedTarget" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "referralAchievementTarget" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "conversionTarget" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "ccWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "scWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "upWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "fixedWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "aboveThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "warningThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "pacingWeek" INTEGER NOT NULL DEFAULT 4,
    "alertThresholds" JSONB NOT NULL DEFAULT '{"belowTargetPct": 70, "consecutivePeriods": 3, "missingDataDays": 2, "varianceThreshold": 30}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceDetail" TEXT,
    "checksum" TEXT,
    "createdBy" TEXT,
    "meta" JSONB,
    "status" "IngestionStatus" NOT NULL,
    "recordsProcessed" INTEGER NOT NULL,
    "recordsAccepted" INTEGER NOT NULL,
    "recordsRejected" INTEGER NOT NULL,
    "recordsUpdated" INTEGER NOT NULL,
    "recordsCreated" INTEGER NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "period" TIMESTAMP(3) NOT NULL,
    "ccTarget" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "scTarget" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "upTarget" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "fixedTarget" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "referralAchievementTarget" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "conversionTarget" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "aboveThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "warningThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "ccWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "scWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "upWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "fixedWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ruleType" "AlertRuleType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "mentorName" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "severity" "Severity" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "columnMap" JSONB NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'PENDING',
    "scoreThreshold" DOUBLE PRECISION,
    "notes" TEXT,
    "aiInsights" JSONB,
    "emailsSent" BOOLEAN NOT NULL DEFAULT false,
    "emailsSentAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "emailReplied" BOOLEAN NOT NULL DEFAULT false,
    "emailRepliedAt" TIMESTAMP(3),
    "aiPrepNotes" JSONB,
    "manualNotes" TEXT,
    "actionItems" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_mentorId_key" ON "Mentor"("mentorId");

-- CreateIndex
CREATE INDEX "Mentor_mentorId_idx" ON "Mentor"("mentorId");

-- CreateIndex
CREATE INDEX "Mentor_teamId_idx" ON "Mentor"("teamId");

-- CreateIndex
CREATE INDEX "Mentor_mentorName_idx" ON "Mentor"("mentorName");

-- CreateIndex
CREATE INDEX "Mentor_teamId_mentorId_idx" ON "Mentor"("teamId", "mentorId");

-- CreateIndex
CREATE INDEX "Mentor_email_idx" ON "Mentor"("email");

-- CreateIndex
CREATE INDEX "MetricDaily_mentorId_periodDate_idx" ON "MetricDaily"("mentorId", "periodDate");

-- CreateIndex
CREATE INDEX "MetricDaily_teamId_periodDate_idx" ON "MetricDaily"("teamId", "periodDate");

-- CreateIndex
CREATE INDEX "MetricDaily_periodDate_idx" ON "MetricDaily"("periodDate");

-- CreateIndex
CREATE INDEX "MetricDaily_weekOfMonth_idx" ON "MetricDaily"("weekOfMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDaily_mentorId_periodDate_key" ON "MetricDaily"("mentorId", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE INDEX "Student_studentId_idx" ON "Student"("studentId");

-- CreateIndex
CREATE INDEX "Student_mentorId_idx" ON "Student"("mentorId");

-- CreateIndex
CREATE INDEX "Student_teamName_idx" ON "Student"("teamName");

-- CreateIndex
CREATE INDEX "Student_isFixed_idx" ON "Student"("isFixed");

-- CreateIndex
CREATE INDEX "Student_isRecovered_idx" ON "Student"("isRecovered");

-- CreateIndex
CREATE INDEX "MentorStats_mentorId_idx" ON "MentorStats"("mentorId");

-- CreateIndex
CREATE INDEX "MentorStats_periodDate_idx" ON "MentorStats"("periodDate");

-- CreateIndex
CREATE INDEX "MentorStats_status_idx" ON "MentorStats"("status");

-- CreateIndex
CREATE INDEX "MentorStats_rank_idx" ON "MentorStats"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "MentorStats_mentorId_periodDate_key" ON "MentorStats"("mentorId", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "Config_teamId_key" ON "Config"("teamId");

-- CreateIndex
CREATE INDEX "Config_teamId_idx" ON "Config"("teamId");

-- CreateIndex
CREATE INDEX "Upload_source_createdAt_idx" ON "Upload"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Upload_status_idx" ON "Upload"("status");

-- CreateIndex
CREATE INDEX "Upload_createdBy_idx" ON "Upload"("createdBy");

-- CreateIndex
CREATE INDEX "Target_period_idx" ON "Target"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Target_teamId_period_key" ON "Target"("teamId", "period");

-- CreateIndex
CREATE INDEX "AlertRule_enabled_idx" ON "AlertRule"("enabled");

-- CreateIndex
CREATE INDEX "Alert_ruleId_idx" ON "Alert"("ruleId");

-- CreateIndex
CREATE INDEX "Alert_mentorId_period_idx" ON "Alert"("mentorId", "period");

-- CreateIndex
CREATE INDEX "Alert_dismissed_createdAt_idx" ON "Alert"("dismissed", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "UploadPreset_name_key" ON "UploadPreset"("name");

-- CreateIndex
CREATE INDEX "UploadPreset_source_isDefault_idx" ON "UploadPreset"("source", "isDefault");

-- CreateIndex
CREATE INDEX "Meeting_status_scheduledDate_idx" ON "Meeting"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "Meeting_createdAt_idx" ON "Meeting"("createdAt");

-- CreateIndex
CREATE INDEX "Meeting_emailsSent_idx" ON "Meeting"("emailsSent");

-- CreateIndex
CREATE INDEX "MeetingAttendee_meetingId_idx" ON "MeetingAttendee"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_mentorId_idx" ON "MeetingAttendee"("mentorId");

-- CreateIndex
CREATE INDEX "MeetingAttendee_emailSent_emailReplied_idx" ON "MeetingAttendee"("emailSent", "emailReplied");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_mentorId_key" ON "MeetingAttendee"("meetingId", "mentorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricDaily" ADD CONSTRAINT "MetricDaily_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorStats" ADD CONSTRAINT "MentorStats_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;


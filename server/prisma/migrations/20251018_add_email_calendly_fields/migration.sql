-- AlterTable
ALTER TABLE "User" ADD COLUMN "calendlyUrl" TEXT;

-- AlterTable
ALTER TABLE "Mentor" ADD COLUMN "email" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "emailsSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailsSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MeetingAttendee" ADD COLUMN "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailSentAt" TIMESTAMP(3),
ADD COLUMN "emailReplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailRepliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Mentor_email_idx" ON "Mentor"("email");

-- CreateIndex
CREATE INDEX "Meeting_emailsSent_idx" ON "Meeting"("emailsSent");

-- CreateIndex
CREATE INDEX "MeetingAttendee_emailSent_emailReplied_idx" ON "MeetingAttendee"("emailSent", "emailReplied");

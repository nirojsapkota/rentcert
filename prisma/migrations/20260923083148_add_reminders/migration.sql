-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('DAYS_30', 'DAYS_7', 'DUE_DATE', 'OVERDUE_7');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reminder_emails_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "welcome_email_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "compliance_reminders" (
    "id" UUID NOT NULL,
    "compliance_record_id" UUID NOT NULL,
    "reminder_type" "ReminderType" NOT NULL,
    "scheduled_for" DATE NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_reminders_status_scheduled_for_idx" ON "compliance_reminders"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_reminders_compliance_record_id_reminder_type_key" ON "compliance_reminders"("compliance_record_id", "reminder_type");

-- AddForeignKey
ALTER TABLE "compliance_reminders" ADD CONSTRAINT "compliance_reminders_compliance_record_id_fkey" FOREIGN KEY ("compliance_record_id") REFERENCES "compliance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "compliance_reminders_compliance_record_id_reminder_type_key";

-- AlterTable
-- Existing reminders went to the property owner.
ALTER TABLE "compliance_reminders" ADD COLUMN "user_id" TEXT;
UPDATE "compliance_reminders" r SET "user_id" = p."user_id"
FROM "compliance_records" c JOIN "properties" p ON p."id" = c."property_id"
WHERE c."id" = r."compliance_record_id";
ALTER TABLE "compliance_reminders" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "account_collaborators" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_collaborators_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_collaborators_not_self" CHECK ("owner_id" <> "member_id")
);

-- CreateTable
CREATE TABLE "sharing_invites" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sharing_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_collaborators_member_id_idx" ON "account_collaborators"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_collaborators_owner_id_member_id_key" ON "account_collaborators"("owner_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "sharing_invites_token_hash_key" ON "sharing_invites"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sharing_invites_owner_id_email_key" ON "sharing_invites"("owner_id", "email");

-- CreateIndex
CREATE INDEX "compliance_reminders_user_id_idx" ON "compliance_reminders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_reminders_compliance_record_id_reminder_type_use_key" ON "compliance_reminders"("compliance_record_id", "reminder_type", "user_id");

-- AddForeignKey
ALTER TABLE "compliance_reminders" ADD CONSTRAINT "compliance_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_collaborators" ADD CONSTRAINT "account_collaborators_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_collaborators" ADD CONSTRAINT "account_collaborators_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_invites" ADD CONSTRAINT "sharing_invites_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "LodgementMethod" AS ENUM ('PORTAL', 'EMAIL', 'POST', 'OTHER');

-- AlterTable
ALTER TABLE "pools" ADD COLUMN     "council_id" UUID;

-- CreateTable
CREATE TABLE "councils" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "lodgement_method" "LodgementMethod" NOT NULL DEFAULT 'OTHER',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "portal_url" TEXT,
    "notes" TEXT,
    "source_url" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "councils_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "councils_name_key" ON "councils"("name");

-- CreateIndex
CREATE INDEX "pools_council_id_idx" ON "pools"("council_id");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_council_id_fkey" FOREIGN KEY ("council_id") REFERENCES "councils"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: metropolitan Melbourne councils, names only. No contact details are seeded until they are
-- checked against an official council page (see docs/council-sources.md), so every row starts
-- unverified with lodgement method OTHER.
INSERT INTO "councils" ("id", "name", "updated_at")
SELECT gen_random_uuid(), name, CURRENT_TIMESTAMP
FROM unnest(ARRAY[
  'City of Melbourne', 'City of Port Phillip', 'City of Yarra', 'City of Stonnington',
  'City of Boroondara', 'City of Glen Eira', 'City of Bayside', 'City of Kingston',
  'City of Monash', 'City of Whitehorse', 'City of Manningham', 'City of Maroondah',
  'City of Knox', 'City of Greater Dandenong', 'City of Casey', 'Shire of Cardinia',
  'City of Frankston', 'City of Hobsons Bay', 'City of Maribyrnong', 'City of Moonee Valley',
  'City of Merri-bek', 'City of Darebin', 'City of Banyule', 'City of Whittlesea',
  'City of Hume', 'City of Brimbank', 'City of Wyndham', 'City of Melton'
]) AS name;

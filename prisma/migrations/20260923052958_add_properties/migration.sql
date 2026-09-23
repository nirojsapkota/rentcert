-- CreateEnum
CREATE TYPE "AustralianState" AS ENUM ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT');

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "suburb" TEXT NOT NULL,
    "state" "AustralianState" NOT NULL,
    "postcode" TEXT NOT NULL,
    "nickname" TEXT,
    "notes" TEXT,
    "lease_start_date" DATE,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "properties_user_id_archived_at_created_at_idx" ON "properties"("user_id", "archived_at", "created_at");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Postcode must be a 4-digit Australian postcode.
ALTER TABLE "properties" ADD CONSTRAINT "properties_postcode_format"
  CHECK ("postcode" ~ '^[0-9]{4}$' AND "postcode" >= '0200');

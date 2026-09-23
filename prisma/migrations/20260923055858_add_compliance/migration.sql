-- CreateEnum
CREATE TYPE "ComplianceRecordKind" AS ENUM ('COMPLETED', 'UNKNOWN_LAST_CHECK');

-- CreateTable
CREATE TABLE "compliance_requirements" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recurrence_months" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source_name" TEXT,
    "source_url" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_records" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "kind" "ComplianceRecordKind" NOT NULL,
    "completed_on" DATE,
    "next_due_on" DATE NOT NULL,
    "provider_name" TEXT,
    "provider_licence_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_requirement_exclusions" (
    "property_id" UUID NOT NULL,
    "requirement_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_requirement_exclusions_pkey" PRIMARY KEY ("property_id","requirement_code")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_requirements_jurisdiction_code_key" ON "compliance_requirements"("jurisdiction", "code");

-- CreateIndex
CREATE INDEX "compliance_records_property_id_requirement_id_next_due_on_idx" ON "compliance_records"("property_id", "requirement_id", "next_due_on");

-- CreateIndex
CREATE INDEX "compliance_records_requirement_id_idx" ON "compliance_records"("requirement_id");

-- CreateIndex
CREATE INDEX "compliance_records_next_due_on_idx" ON "compliance_records"("next_due_on");

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "compliance_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_requirement_exclusions" ADD CONSTRAINT "property_requirement_exclusions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A completed check must have a completion date.
ALTER TABLE "compliance_records" ADD CONSTRAINT "compliance_records_completed_has_date"
  CHECK ("kind" <> 'COMPLETED' OR "completed_on" IS NOT NULL);

ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_recurrence_positive"
  CHECK ("recurrence_months" > 0);

-- Initial requirement configuration. Intervals come from docs/compliance-sources.md and are
-- NOT verified: last_verified_at stays NULL until a person checks the official sources.
INSERT INTO "compliance_requirements"
  ("id", "code", "jurisdiction", "name", "description", "recurrence_months", "sort_order", "source_name", "source_url", "updated_at")
VALUES
  (gen_random_uuid(), 'smoke_alarm', 'VIC', 'Smoke alarm check',
   'Smoke alarms tested and confirmed in working order.', 12, 1,
   'Consumer Affairs Victoria: Smoke alarms and fire safety',
   'https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/keeping-the-property-safe/smoke-alarms-and-fire-safety',
   CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'VIC', 'Electrical safety check',
   'Electrical installations and fittings checked by a licensed electrician.', 24, 2,
   'Consumer Affairs Victoria: Rental providers – gas and electrical safety',
   'https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/gas-electrical-and-water-safety-standards/rental-providers-gas-and-electrical-safety',
   CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'VIC', 'Gas safety check',
   'Gas installations and fittings checked by a licensed or registered gasfitter.', 24, 3,
   'Consumer Affairs Victoria: Rental providers – gas and electrical safety',
   'https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/gas-electrical-and-water-safety-standards/rental-providers-gas-and-electrical-safety',
   CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smoke_alarm', 'GENERIC', 'Smoke alarm check',
   'General reminder schedule. Not based on the rules of any particular state.', 12, 1, NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'electrical', 'GENERIC', 'Electrical safety check',
   'General reminder schedule. Not based on the rules of any particular state.', 24, 2, NULL, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'gas', 'GENERIC', 'Gas safety check',
   'General reminder schedule. Not based on the rules of any particular state.', 24, 3, NULL, NULL, CURRENT_TIMESTAMP);

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('NOT_SCANNED', 'CLEAN', 'INFECTED');

-- CreateTable
CREATE TABLE "compliance_documents" (
    "id" UUID NOT NULL,
    "compliance_record_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'NOT_SCANNED',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_documents_storage_key_key" ON "compliance_documents"("storage_key");

-- CreateIndex
CREATE INDEX "compliance_documents_compliance_record_id_uploaded_at_idx" ON "compliance_documents"("compliance_record_id", "uploaded_at");

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_compliance_record_id_fkey" FOREIGN KEY ("compliance_record_id") REFERENCES "compliance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only PDF, JPEG and PNG, from 1 byte to 10 MB.
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_byte_size_range"
  CHECK ("byte_size" BETWEEN 1 AND 10485760);
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_content_type_allowed"
  CHECK ("content_type" IN ('application/pdf', 'image/jpeg', 'image/png'));

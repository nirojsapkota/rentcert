-- CreateEnum
CREATE TYPE "InspectionKind" AS ENUM ('INITIAL', 'PERIODIC', 'REINSPECTION');

-- CreateEnum
CREATE TYPE "InspectionOutcome" AS ENUM ('PASS', 'FAIL', 'PENDING');

-- CreateTable
CREATE TABLE "inspections" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "pool_id" UUID NOT NULL,
    "kind" "InspectionKind" NOT NULL,
    "inspected_on" DATE NOT NULL,
    "outcome" "InspectionOutcome" NOT NULL,
    "certificate_number" TEXT,
    "lodged_on" DATE,
    "next_recall_on" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_photos" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "inspection_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "caption" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspections_user_id_next_recall_on_idx" ON "inspections"("user_id", "next_recall_on");

-- CreateIndex
CREATE INDEX "inspections_pool_id_inspected_on_idx" ON "inspections"("pool_id", "inspected_on");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_photos_storage_key_key" ON "inspection_photos"("storage_key");

-- CreateIndex
CREATE INDEX "inspection_photos_inspection_id_uploaded_at_idx" ON "inspection_photos"("inspection_id", "uploaded_at");

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

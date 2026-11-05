-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('LANDLORD', 'INSPECTOR');

-- CreateEnum
CREATE TYPE "PoolKind" AS ENUM ('POOL', 'SPA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_type" "AccountType" NOT NULL DEFAULT 'LANDLORD';

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "opted_out_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "kind" "PoolKind" NOT NULL DEFAULT 'POOL',
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "suburb" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "notes" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_user_id_archived_at_name_idx" ON "clients"("user_id", "archived_at", "name");

-- CreateIndex
CREATE INDEX "pools_user_id_archived_at_created_at_idx" ON "pools"("user_id", "archived_at", "created_at");

-- CreateIndex
CREATE INDEX "pools_client_id_idx" ON "pools"("client_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

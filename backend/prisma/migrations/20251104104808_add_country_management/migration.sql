/*
  Warnings:

  - You are about to drop the column `country` on the `Store` table. All the data in the column will be lost.
  - Added the required column `countryCode` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Store" DROP COLUMN "country",
ADD COLUMN     "countryCode" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."Country";

-- CreateTable
CREATE TABLE "ManagedCountry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "establishedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CountrySupervisors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountrySupervisors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CountryOperators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountryOperators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedCountry_code_key" ON "ManagedCountry"("code");

-- CreateIndex
CREATE INDEX "_CountrySupervisors_B_index" ON "_CountrySupervisors"("B");

-- CreateIndex
CREATE INDEX "_CountryOperators_B_index" ON "_CountryOperators"("B");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountrySupervisors" ADD CONSTRAINT "_CountrySupervisors_A_fkey" FOREIGN KEY ("A") REFERENCES "ManagedCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountrySupervisors" ADD CONSTRAINT "_CountrySupervisors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryOperators" ADD CONSTRAINT "_CountryOperators_A_fkey" FOREIGN KEY ("A") REFERENCES "ManagedCountry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryOperators" ADD CONSTRAINT "_CountryOperators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `ownerName` on the `OperationModule` table. All the data in the column will be lost.
  - You are about to drop the column `ownerName` on the `OperationTask` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OperationModule" DROP COLUMN "ownerName",
ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "OperationTask" DROP COLUMN "ownerName",
ADD COLUMN     "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "OperationModule" ADD CONSTRAINT "OperationModule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationTask" ADD CONSTRAINT "OperationTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

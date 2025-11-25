-- AlterTable
ALTER TABLE "ProductionBatch" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProductionOrderStatusEvent" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "ProductionOrderStatusEvent" ADD CONSTRAINT "ProductionOrderStatusEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

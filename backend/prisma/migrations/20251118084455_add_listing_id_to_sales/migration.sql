-- AlterTable
ALTER TABLE "SalesData" ADD COLUMN     "listingId" TEXT;

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "StoreProductListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

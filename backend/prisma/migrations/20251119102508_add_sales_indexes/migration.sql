-- CreateIndex
CREATE INDEX "SalesData_storeId_idx" ON "SalesData"("storeId");

-- CreateIndex
CREATE INDEX "SalesData_recordDate_idx" ON "SalesData"("recordDate");

-- CreateIndex
CREATE INDEX "SalesData_storeId_recordDate_idx" ON "SalesData"("storeId", "recordDate");

-- CreateIndex
CREATE INDEX "SalesData_storeId_listingId_idx" ON "SalesData"("storeId", "listingId");

-- CreateTable
CREATE TABLE "OperationModule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "countryCode" TEXT NOT NULL,

    CONSTRAINT "OperationModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "OperationTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationModule_countryCode_displayOrder_idx" ON "OperationModule"("countryCode", "displayOrder");

-- CreateIndex
CREATE INDEX "OperationTask_moduleId_displayOrder_idx" ON "OperationTask"("moduleId", "displayOrder");

-- AddForeignKey
ALTER TABLE "OperationModule" ADD CONSTRAINT "OperationModule_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "ManagedCountry"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationTask" ADD CONSTRAINT "OperationTask_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "OperationModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

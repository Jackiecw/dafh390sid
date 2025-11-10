-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ALIPAY', 'WECHAT_PAY', 'BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('NONE', 'REGULAR', 'SPECIAL');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "payer" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'NONE',
    "isAdvancePayment" BOOLEAN NOT NULL DEFAULT false,
    "reimbursementDate" TIMESTAMP(3),
    "notes" TEXT,
    "storeId" TEXT,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_storeId_idx" ON "Expense"("storeId");

-- CreateIndex
CREATE INDEX "Expense_enteredById_idx" ON "Expense"("enteredById");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

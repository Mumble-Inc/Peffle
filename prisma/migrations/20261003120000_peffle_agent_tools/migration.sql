-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'AGENT_TOOL_ALLOWED';
ALTER TYPE "AuditEventType" ADD VALUE 'AGENT_TOOL_BLOCKED';
ALTER TYPE "AuditEventType" ADD VALUE 'AGENT_TOOL_APPROVAL_REQUIRED';
ALTER TYPE "AuditEventType" ADD VALUE 'AGENT_TOOL_APPROVED';
ALTER TYPE "AuditEventType" ADD VALUE 'AGENT_TOOL_DENIED';

-- CreateTable
CREATE TABLE "SessionDiscount" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "peffleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "peffleEventId" TEXT,
    "razorpayRefundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionDiscount_sessionId_idx" ON "SessionDiscount"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionDiscount_sessionId_productId_key" ON "SessionDiscount"("sessionId", "productId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- AddForeignKey
ALTER TABLE "SessionDiscount" ADD CONSTRAINT "SessionDiscount_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BuyerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionDiscount" ADD CONSTRAINT "SessionDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

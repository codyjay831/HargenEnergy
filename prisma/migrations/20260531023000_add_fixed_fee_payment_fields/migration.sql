-- CreateEnum
CREATE TYPE "RequestPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'WAIVED');

-- AlterTable
ALTER TABLE "SupportRequest"
ADD COLUMN "paymentStatus" "RequestPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "stripeCheckoutSessionId" TEXT;

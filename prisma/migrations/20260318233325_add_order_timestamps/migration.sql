-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "delivering_at" TIMESTAMP(3),
ADD COLUMN     "preparing_at" TIMESTAMP(3);

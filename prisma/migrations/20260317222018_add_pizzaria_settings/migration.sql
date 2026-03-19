-- AlterTable
ALTER TABLE "Pizzaria" ADD COLUMN     "banner_url" TEXT,
ADD COLUMN     "is_open" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "primary_color" TEXT DEFAULT '#dc2626';

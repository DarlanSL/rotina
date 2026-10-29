-- AlterTable
ALTER TABLE "User" ADD COLUMN     "showWeather" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weatherCity" TEXT,
ADD COLUMN     "weatherLat" DOUBLE PRECISION,
ADD COLUMN     "weatherLon" DOUBLE PRECISION;


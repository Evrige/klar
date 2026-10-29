-- New records always provide the actual last event; epoch was only a backfill.
ALTER TABLE "Mistake" ALTER COLUMN "lastEventAt" DROP DEFAULT;

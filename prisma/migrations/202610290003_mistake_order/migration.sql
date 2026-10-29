ALTER TABLE "Mistake" ADD COLUMN "lastEventAt" timestamptz(3) NOT NULL DEFAULT '1970-01-01 00:00:00+00'::timestamptz;
UPDATE "Mistake" SET "lastEventAt" = greatest("lastWrong", CASE WHEN recovery > 0 THEN due - interval '1 day' ELSE "lastWrong" END);

ALTER TABLE "QueueEntry" ADD COLUMN "searchType" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_searchType_check" CHECK ("searchType" IN ('AUTO','ROOM'));
CREATE INDEX "QueueEntry_open_games_idx" ON "QueueEntry" ("searchType", "status", "expiresAt", "createdAt");

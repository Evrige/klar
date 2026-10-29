ALTER TABLE "UserSettings" ADD COLUMN "changeToken" text NOT NULL DEFAULT '';
ALTER TABLE "UserWordStatus" ADD COLUMN "changeToken" text NOT NULL DEFAULT '';
ALTER TABLE "UserLessonProgress" ADD COLUMN "changeToken" text NOT NULL DEFAULT '';

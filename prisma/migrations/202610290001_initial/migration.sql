-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('LOCAL_IMPORT', 'OFFLINE', 'SERVER_VERIFIED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SkillMode" AS ENUM ('recognition', 'recall', 'spelling', 'listening');

-- CreateEnum
CREATE TYPE "WordStatus" AS ENUM ('known', 'learning');

-- CreateEnum
CREATE TYPE "RaceMode" AS ENUM ('SENTENCE_RACE', 'WORD_CHOICE_RACE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('SCHEDULED', 'OPEN', 'FINISHED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'MATCHED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProfile" (
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "listed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PublicProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "dark" BOOLEAN NOT NULL DEFAULT false,
    "speechRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "wordMode" "SkillMode" NOT NULL DEFAULT 'recall',
    "vocabularyLevels" TEXT[] DEFAULT ARRAY['A1', 'A2', 'B1', 'extra']::TEXT[],
    "verbLevel" TEXT NOT NULL DEFAULT 'all',
    "practiceLength" INTEGER NOT NULL DEFAULT 24,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "journalStarted" DATE,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "voiceURI" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseLevel" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "cefr" TEXT NOT NULL,

    CONSTRAINT "CourseLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "legacyKey" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonStep" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "legacyKey" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "LessonStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleTopic" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "RuleTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "legacyKey" TEXT NOT NULL,
    "german" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordTranslation" (
    "wordId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "WordTranslation_pkey" PRIMARY KEY ("wordId","language")
);

-- CreateTable
CREATE TABLE "NounForm" (
    "id" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "singular" TEXT NOT NULL,
    "plural" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "tip" TEXT NOT NULL,

    CONSTRAINT "NounForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verb" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "Verb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerbForm" (
    "id" TEXT NOT NULL,
    "verbId" TEXT NOT NULL,
    "person" INTEGER NOT NULL,
    "german" TEXT NOT NULL,
    "translation" TEXT NOT NULL,

    CONSTRAINT "VerbForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "legacyKey" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "level" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseVersion" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "publicData" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerVariant" (
    "versionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "AnswerVariant_pkey" PRIMARY KEY ("versionId","answer")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'LOCAL_IMPORT',
    "schemaVersion" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB NOT NULL,
    "report" JSONB NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMapping" (
    "batchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "legacyKey" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,

    CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("batchId","kind","legacyKey")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTestedWord" (
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserTestedWord_pkey" PRIMARY KEY ("userId","wordId")
);

-- CreateTable
CREATE TABLE "UserWordStatus" (
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" "WordStatus" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserWordStatus_pkey" PRIMARY KEY ("userId","wordId")
);

-- CreateTable
CREATE TABLE "UserWordSkill" (
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "mode" "SkillMode" NOT NULL,
    "attempts" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "due" TIMESTAMPTZ(3) NOT NULL,
    "last" TIMESTAMPTZ(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserWordSkill_pkey" PRIMARY KEY ("userId","wordId","mode")
);

-- CreateTable
CREATE TABLE "UserMastery" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserMastery_pkey" PRIMARY KEY ("userId","exerciseId")
);

-- CreateTable
CREATE TABLE "UserLessonProgress" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "video" BOOLEAN NOT NULL DEFAULT false,
    "practice" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "UserLessonStep" (
    "userId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserLessonStep_pkey" PRIMARY KEY ("userId","stepId")
);

-- CreateTable
CREATE TABLE "UserDailyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "ruleRead" BOOLEAN NOT NULL,
    "nounsDone" BOOLEAN NOT NULL,
    "sentenceDone" BOOLEAN NOT NULL,

    CONSTRAINT "UserDailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyPlanWord" (
    "planId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,

    CONSTRAINT "UserDailyPlanWord_pkey" PRIMARY KEY ("planId","wordId")
);

-- CreateTable
CREATE TABLE "SavedPhrase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "russian" TEXT NOT NULL,
    "german" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "SavedPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Berlin',

    CONSTRAINT "StudyDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "source" "Source" NOT NULL,
    "attempts" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "words" TEXT[],
    "skills" TEXT[],
    "resolved" TEXT[],
    "lessons" TEXT[],

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("userId","day","source")
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answers" TEXT[],
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "explanation" TEXT NOT NULL,
    "wordId" TEXT,
    "mode" "SkillMode",
    "lessonId" TEXT,
    "audio" TEXT,
    "caseSensitive" BOOLEAN,
    "failures" INTEGER NOT NULL,
    "lastWrong" TIMESTAMPTZ(3) NOT NULL,
    "due" TIMESTAMPTZ(3) NOT NULL,
    "recovery" INTEGER NOT NULL,
    "resolved" BOOLEAN NOT NULL,
    "source" "Source" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MistakeRecovery" (
    "id" TEXT NOT NULL,
    "mistakeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MistakeRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementTier" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,

    CONSTRAINT "AchievementTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "earnedAt" TIMESTAMPTZ(3) NOT NULL,
    "source" "Source" NOT NULL,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","tierId")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "Source" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "mode" "RaceMode" NOT NULL,
    "level" TEXT NOT NULL,
    "ranked" BOOLEAN NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchId" TEXT,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "mode" "RaceMode" NOT NULL,
    "level" TEXT NOT NULL,
    "ranked" BOOLEAN NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'WAITING',
    "private" BOOLEAN NOT NULL DEFAULT false,
    "invitationHash" TEXT,
    "deadlineAt" TIMESTAMPTZ(3) NOT NULL,
    "finishedAt" TIMESTAMPTZ(3),
    "reason" TEXT,
    "ratingApplied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT,
    "seat" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "leftAt" TIMESTAMPTZ(3),
    "disqualification" TEXT,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "versionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "deadlineAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'SCHEDULED',
    "publicData" JSONB NOT NULL,
    "winnerId" TEXT,
    "reason" TEXT,

    CONSTRAINT "MatchRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundSubmission" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "serverReceivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientSentAt" TIMESTAMPTZ(3),

    CONSTRAINT "RoundSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "sequence" BIGSERIAL NOT NULL,
    "matchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("sequence")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "mode" "RaceMode" NOT NULL,
    "level" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1000,
    "games" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingHistory" (
    "id" TEXT NOT NULL,
    "ratingId" TEXT,
    "matchId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "before" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "window" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProfile_handle_key" ON "PublicProfile"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_clientId_key" ON "Device"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseLevel_courseId_cefr_key" ON "CourseLevel"("courseId", "cefr");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_legacyKey_key" ON "Lesson"("legacyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LessonStep_lessonId_legacyKey_key" ON "LessonStep"("lessonId", "legacyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Word_legacyKey_key" ON "Word"("legacyKey");

-- CreateIndex
CREATE INDEX "Word_level_category_idx" ON "Word"("level", "category");

-- CreateIndex
CREATE UNIQUE INDEX "VerbForm_verbId_person_key" ON "VerbForm"("verbId", "person");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_legacyKey_key" ON "Exercise"("legacyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseVersion_exerciseId_checksum_key" ON "ExerciseVersion"("exerciseId", "checksum");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_createdAt_idx" ON "ImportBatch"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_userId_checksum_key" ON "ImportBatch"("userId", "checksum");

-- CreateIndex
CREATE INDEX "SyncEvent_userId_receivedAt_idx" ON "SyncEvent"("userId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncEvent_userId_deviceId_clientEventId_key" ON "SyncEvent"("userId", "deviceId", "clientEventId");

-- CreateIndex
CREATE INDEX "UserWordSkill_userId_mode_due_idx" ON "UserWordSkill"("userId", "mode", "due");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyPlan_userId_day_key" ON "UserDailyPlan"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPhrase_userId_checksum_key" ON "SavedPhrase"("userId", "checksum");

-- CreateIndex
CREATE INDEX "Mistake_userId_resolved_due_idx" ON "Mistake"("userId", "resolved", "due");

-- CreateIndex
CREATE UNIQUE INDEX "Mistake_userId_key_key" ON "Mistake"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "MistakeRecovery_eventId_key" ON "MistakeRecovery"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "XpLedger_userId_eventKey_key" ON "XpLedger"("userId", "eventKey");

-- CreateIndex
CREATE INDEX "QueueEntry_seasonId_mode_level_ranked_status_createdAt_idx" ON "QueueEntry"("seasonId", "mode", "level", "ranked", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Match_status_deadlineAt_idx" ON "Match"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_idx" ON "MatchParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "MatchParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_seat_key" ON "MatchParticipant"("matchId", "seat");

-- CreateIndex
CREATE INDEX "MatchRound_status_deadlineAt_idx" ON "MatchRound"("status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRound_matchId_number_key" ON "MatchRound"("matchId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "RoundSubmission_roundId_participantId_key" ON "RoundSubmission"("roundId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundSubmission_participantId_requestId_key" ON "RoundSubmission"("participantId", "requestId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_sequence_idx" ON "MatchEvent"("matchId", "sequence");

-- CreateIndex
CREATE INDEX "Rating_seasonId_mode_level_value_games_userId_idx" ON "Rating"("seasonId", "mode", "level", "value", "games", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_seasonId_mode_level_key" ON "Rating"("userId", "seasonId", "mode", "level");

-- CreateIndex
CREATE UNIQUE INDEX "RatingHistory_matchId_seat_key" ON "RatingHistory"("matchId", "seat");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRateLimit_key_key" ON "AuthRateLimit"("key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProfile" ADD CONSTRAINT "PublicProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLevel" ADD CONSTRAINT "CourseLevel_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CourseLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordTranslation" ADD CONSTRAINT "WordTranslation_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerbForm" ADD CONSTRAINT "VerbForm_verbId_fkey" FOREIGN KEY ("verbId") REFERENCES "Verb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseVersion" ADD CONSTRAINT "ExerciseVersion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerVariant" ADD CONSTRAINT "AnswerVariant_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExerciseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMapping" ADD CONSTRAINT "ImportMapping_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTestedWord" ADD CONSTRAINT "UserTestedWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordStatus" ADD CONSTRAINT "UserWordStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordStatus" ADD CONSTRAINT "UserWordStatus_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordSkill" ADD CONSTRAINT "UserWordSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordSkill" ADD CONSTRAINT "UserWordSkill_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMastery" ADD CONSTRAINT "UserMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMastery" ADD CONSTRAINT "UserMastery_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonStep" ADD CONSTRAINT "UserLessonStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonStep" ADD CONSTRAINT "UserLessonStep_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "LessonStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyPlan" ADD CONSTRAINT "UserDailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyPlanWord" ADD CONSTRAINT "UserDailyPlanWord_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UserDailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyPlanWord" ADD CONSTRAINT "UserDailyPlanWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPhrase" ADD CONSTRAINT "SavedPhrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyDay" ADD CONSTRAINT "StudyDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeRecovery" ADD CONSTRAINT "MistakeRecovery_mistakeId_fkey" FOREIGN KEY ("mistakeId") REFERENCES "Mistake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementTier" ADD CONSTRAINT "AchievementTier_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AchievementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "AchievementTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRound" ADD CONSTRAINT "MatchRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchRound" ADD CONSTRAINT "MatchRound_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ExerciseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundSubmission" ADD CONSTRAINT "RoundSubmission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MatchRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundSubmission" ADD CONSTRAINT "RoundSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

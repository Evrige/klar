import { db, serial, lockUser } from './db.ts';
import { readProgress } from './progress.ts';
export async function exportAccount(userId: string) {
    return serial(async tx=>{
        await lockUser(tx,userId);
        const [user,progress,imports,events,devices,summaries,profile]=await Promise.all([
            tx.user.findUnique({where:{id:userId},select:{id:true,name:true,email:true,createdAt:true,role:true}}),readProgress(userId,undefined,tx),
            tx.importBatch.findMany({where:{userId},include:{mappings:true}}),tx.syncEvent.findMany({where:{userId}}),tx.device.findMany({where:{userId}}),tx.dailySummary.findMany({where:{userId},orderBy:{day:'asc'}}),tx.publicProfile.findUnique({where:{userId}})
        ]);
        const [wordStatuses,wordSkills,mastery,lessonProgress,lessonSteps,mistakes,achievements,xp,ratings,participation,accounts,sessions,savedPhrases]=await Promise.all([
            tx.userWordStatus.findMany({where:{userId}}),tx.userWordSkill.findMany({where:{userId}}),tx.userMastery.findMany({where:{userId}}),tx.userLessonProgress.findMany({where:{userId}}),tx.userLessonStep.findMany({where:{userId}}),tx.mistake.findMany({where:{userId},include:{recoveries:true}}),tx.userAchievement.findMany({where:{userId}}),tx.xpLedger.findMany({where:{userId}}),
            tx.rating.findMany({where:{userId},include:{history:true}}),tx.matchParticipant.findMany({where:{userId},include:{submissions:true}}),
            tx.account.findMany({where:{userId},select:{providerId:true,accountId:true,createdAt:true}}),tx.session.findMany({where:{userId},select:{createdAt:true,expiresAt:true,userAgent:true,ipAddress:true}}),tx.savedPhrase.findMany({where:{userId}})
        ]);
        return {schemaVersion:1,exportedAt:new Date(),user,...progress,imports,events,devices,summaries,profile,data:{wordStatuses,wordSkills,mastery,lessonProgress,lessonSteps,mistakes,achievements,xp,ratings,participation,accounts,sessions,savedPhrases}};
    });
}
export async function deleteAccount(userId: string) { return serial(async (tx) => { await lockUser(tx, userId); const active = await tx.matchParticipant.findMany({ where: { userId, match: { status: { in: ['WAITING', 'ACTIVE'] } } }, select: { matchId: true } }); if (active.length)
    throw Object.assign(new Error('Finish or leave active matches before deleting account'), { status: 409 }); await tx.user.delete({ where: { id: userId } }); await tx.rateLimit.deleteMany({ where: { key: { startsWith: userId + ':' } } }); return { deleted: true }; }); }

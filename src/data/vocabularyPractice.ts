import type { Word, WordStatus } from './vocabulary.ts';

export const WORD_SESSION_SIZE = 20;

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function makeWordSession(pool: readonly Word[], limit = WORD_SESSION_SIZE, random = Math.random): Word[] {
    return shuffle(pool, random).slice(0, limit);
}

type Retry = { word: Word; cardsAfter: number };

export type WordSession = {
    pending: Word[];
    retries: Retry[];
    total: number;
};

function shuffleRetries(retries: Retry[], random: () => number): Word[] {
    // With at least four words left, leave three other cards between appearances.
    const gap = retries.length > 3 ? 3 : 0;
    const earliestSlot = (retry: Retry) => Math.max(0, gap - retry.cardsAfter);
    const candidates = shuffle(retries, random);
    const round: Retry[] = [];
    while (candidates.length) {
        const index = candidates.findIndex(retry => earliestSlot(retry) <= round.length);
        round.push(...candidates.splice(index, 1));
    }

    // If the shuffle repeated the old order, change it when the spacing permits.
    if (round.every((retry, index) => retry === retries[index])) {
        const later = round.findIndex((retry, index) =>
            index > 0 && earliestSlot(retry) <= index - 1);
        if (later > 0) {
            [round[later - 1], round[later]] = [round[later], round[later - 1]];
        }
    }
    return round.map(retry => retry.word);
}

export function advanceWordSession(session: WordSession, status: WordStatus, random = Math.random): WordSession {
    const [word, ...pending] = session.pending;
    if (!word) return session;
    const retries = status === 'learning'
        ? [...session.retries, { word, cardsAfter: pending.length }]
        : session.retries;
    if (pending.length) return { ...session, pending, retries };
    return { ...session, pending: shuffleRetries(retries, random), retries: [] };
}

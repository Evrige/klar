import { courseLessons, courseLevels, type CourseLevel } from './data/course.ts';
import { ruleTopics } from './data/rules.ts';

const pages = ['home', 'course', 'rules', 'vocabulary', 'verbs', 'articles', 'sentences', 'daily',
    'progress', 'achievements', 'learning', 'profile', 'settings', 'online', 'first-steps'] as const;
export type Page = typeof pages[number];
export const learningTabs = ['plan', 'lessons', 'review', 'mistakes', 'skills', 'week'] as const;
export type LearningTab = typeof learningTabs[number];
export type AppRoute = { page: Page; tab?: LearningTab; level?: CourseLevel; topic?: string; lesson?: string; courseView?: 'extra' };

export function readRoute(pathname: string, search = ''): AppRoute {
    const slug = pathname.replace(/\/$/, '').slice(1);
    const page = pages.find(candidate => candidate === slug) ?? 'home';
    const params = new URLSearchParams(search);
    switch (page) {
        case 'learning':
            return { page, tab: learningTabs.find(tab => tab === params.get('tab')) };
        case 'course':
            return {
                page,
                level: courseLevels.find(level => level === params.get('level')),
                lesson: courseLessons.find(lesson => lesson.id === params.get('lesson'))?.id,
                courseView: params.get('view') === 'extra' ? 'extra' : undefined,
            };
        case 'rules':
            return { page, topic: ruleTopics.find(rule => rule.id === params.get('topic'))?.id };
        default:
            return { page };
    }
}

export function routeHref(route: AppRoute): string {
    const path = route.page === 'home' ? '/' : '/' + route.page;
    const params = new URLSearchParams();
    if (route.page === 'learning' && route.tab && route.tab !== 'plan') params.set('tab', route.tab);
    if (route.page === 'course') {
        if (route.level) params.set('level', route.level);
        if (route.lesson) params.set('lesson', route.lesson);
        if (route.courseView) params.set('view', route.courseView);
    }
    if (route.page === 'rules' && route.topic && route.topic !== 'verbs') params.set('topic', route.topic);
    return params.size ? path + '?' + params : path;
}

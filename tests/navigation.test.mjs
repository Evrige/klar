import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, routeHref } from '../src/navigation.ts';
import { courseLessons } from '../src/data/course.ts';
import { ruleTopics } from '../src/data/rules.ts';

test('direct section links reopen the same page', () => {
    for (const page of ['home', 'vocabulary', 'online', 'settings', 'first-steps']) {
        assert.equal(readRoute(routeHref({ page })).page, page);
    }
    assert.equal(readRoute('/nonexistent').page, 'home');
});

test('course lessons, learning tabs and grammar topics survive a URL round trip', () => {
    const lesson = courseLessons[0];
    const topic = ruleTopics.find(rule => rule.id !== 'verbs').id;
    for (const route of [
        { page: 'course', level: lesson.level, lesson: lesson.id, courseView: 'extra' },
        { page: 'learning', tab: 'mistakes' },
        { page: 'rules', topic },
    ]) {
        const url = new URL(routeHref(route), 'https://klar.example');
        assert.deepEqual(readRoute(url.pathname, url.search), route);
    }
    assert.equal(readRoute('/course', '?lesson=invalid').lesson, undefined);
    assert.equal(readRoute('/learning', '?tab=invalid').tab, undefined);
});

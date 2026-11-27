import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { reviewSchema, projectUpdateSchema, reviewTransitions, projectTransitions } from '../../src/shared/management-contracts.ts';
test('review terminal states never reopen and acceptance requires explicit review', () => {
    assert(!reviewTransitions.NEW.includes('ACCEPTED'));
    for (const status of ['ACCEPTED', 'DECLINED', 'CANCELLED'])
        assert.deepEqual(reviewTransitions[status], []);
});
test('decline needs a bounded public explanation and cannot accept actor/owner claims', () => { const base = { operationKey: randomUUID(), expectedVersion: 0, toStatus: 'DECLINED' }; assert.equal(reviewSchema.safeParse(base).success, false); assert.equal(reviewSchema.safeParse({ ...base, publicExplanation: 'دلیل روشن برای مشتری', actorId: randomUUID() }).success, false); assert.equal(reviewSchema.safeParse({ ...base, publicExplanation: 'دلیل روشن برای مشتری' }).success, true); });
test('calendar validation rejects rollover dates and inverted schedules', () => { const base = { operationKey: randomUUID(), expectedVersion: 0, title: 'عنوان پروژه', description: 'شرح واقعی و کافی دربارهٔ پروژه و هدف آن', assigneeId: null, plannedStart: null, targetCompletion: null }; assert.equal(projectUpdateSchema.safeParse({ ...base, plannedStart: '2027-02-30' }).success, false); assert.equal(projectUpdateSchema.safeParse({ ...base, plannedStart: '2027-03-01', targetCompletion: '2027-02-28' }).success, false); assert.equal(projectUpdateSchema.safeParse({ ...base, ownerId: 'forged' }).success, false); });
test('execution lifecycle is separate from review and completed/cancelled are terminal', () => { assert(!Object.hasOwn(projectTransitions, 'ACCEPTED')); assert(projectTransitions.PLANNED.includes('IN_PROGRESS')); assert.deepEqual(projectTransitions.COMPLETED, []); assert.deepEqual(projectTransitions.CANCELLED, []); });

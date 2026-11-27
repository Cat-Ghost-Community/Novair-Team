import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerProjectListSchema, customerProjectStatuses, projectStageDescriptions, activeProjectStatuses } from '../../src/shared/customer-project-contracts.ts';
test('customer project filters are bounded and reject ownership/internal query fields', () => {
    assert.deepEqual(customerProjectListSchema.parse({}), { status: 'ALL', active: 'false', page: 1 });
    for (const input of [{ ownerId: 'other' }, { page: '0' }, { page: '1001' }, { page: '1.5' }, { status: 'ACCEPTED' }, { active: 'yes' }, { include: 'adminNotes' }])
        assert.equal(customerProjectListSchema.safeParse(input).success, false);
    assert.equal(customerProjectListSchema.parse({ status: 'ON_HOLD', page: '2', active: 'true' }).page, 2);
});
test('customer execution labels/descriptions cover only real project states without progress percentages', () => {
    assert.deepEqual(Object.keys(customerProjectStatuses), ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
    assert.deepEqual(activeProjectStatuses, ['PLANNED', 'IN_PROGRESS', 'ON_HOLD']);
    for (const state of Object.keys(customerProjectStatuses)) {
        assert(projectStageDescriptions[state].length > 20);
        assert(!/[\d%٪]/.test(projectStageDescriptions[state]));
    }
});

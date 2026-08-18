import assert from 'node:assert/strict';
import { scheduleDailyClose } from '../src/daily-close-scheduler.mjs';

const due = scheduleDailyClose({ locationId: 'golden', timezone: 'America/Edmonton', instant: '2026-08-18T08:30:00Z', graceMinutes: 60 });
assert.equal(due.due, true); assert.equal(due.local_date, '2026-08-17');
assert.equal(scheduleDailyClose({ locationId: 'golden', timezone: 'America/Edmonton', instant: '2026-08-18T06:30:00Z', graceMinutes: 60 }).reason, 'within_grace_period');
assert.equal(scheduleDailyClose({ locationId: 'golden', timezone: 'America/Edmonton', instant: '2026-08-18T08:30:00Z', graceMinutes: 60, alreadyClosed: new Set([due.idempotency_key]) }).reason, 'already_closed');
console.log('daily_close_scheduler_smoke=passed');

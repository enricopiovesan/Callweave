/** Application-owned scheduler policy; it does not own an OS timer. */
export function scheduleDailyClose({ locationId, timezone, instant, graceMinutes, alreadyClosed = new Set() }) {
  if (!locationId || !timezone || !instant || !Number.isInteger(graceMinutes) || graceMinutes < 0) throw new Error('locationId, timezone, instant, and non-negative graceMinutes are required');
  const date = new Date(instant);
  if (Number.isNaN(date.valueOf())) throw new Error('instant is invalid');
  let fields;
  try { fields = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value])); } catch { throw new Error('timezone is invalid'); }
  const localDate = `${fields.year}-${fields.month}-${fields.day}`;
  const localMinutes = Number(fields.hour) * 60 + Number(fields.minute);
  const previousDate = new Date(Date.UTC(Number(fields.year), Number(fields.month) - 1, Number(fields.day) - 1)).toISOString().slice(0, 10);
  const targetDate = localMinutes >= graceMinutes ? previousDate : null;
  if (!targetDate) return { due: false, reason: 'within_grace_period', local_date: localDate };
  const idempotencyKey = `${locationId}:${targetDate}:daily-close`;
  if (alreadyClosed.has(idempotencyKey)) return { due: false, reason: 'already_closed', local_date: targetDate, idempotency_key: idempotencyKey };
  return { due: true, location_id: locationId, local_date: targetDate, timezone, idempotency_key: idempotencyKey };
}

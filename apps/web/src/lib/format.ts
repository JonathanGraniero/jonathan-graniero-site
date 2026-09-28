const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const monthFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

export const formatMonth = (iso: string) => monthFmt.format(new Date(iso));

/** "Mar 2024 — Present · 2 yrs 6 mos" */
export function formatRange(start: string, end: string | null, now = new Date()): string {
  const s = new Date(start);
  const e = end ? new Date(end) : now;
  const months = Math.max(
    1,
    (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1,
  );
  const y = Math.floor(months / 12);
  const m = months % 12;
  const duration = [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`]
    .filter(Boolean)
    .join(' ');
  return `${formatMonth(start)} — ${end ? formatMonth(end) : 'Present'} · ${duration}`;
}

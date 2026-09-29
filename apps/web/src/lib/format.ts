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

/** kubectl-style compact age: 45s, 12m, 5h, 3d, 7w, 4mo, 2y. */
export function age(iso: string, now = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d`;
  if (d < 60) return `${Math.floor(d / 7)}w`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${Math.floor(d / 365)}y`;
}

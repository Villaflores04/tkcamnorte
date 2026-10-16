// Calendar dates belong to the ministry's timezone, independent of the member's device.
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function activityStatus(post, today = todayKey()) {
  if (!post.starts_at) return '';
  if (post.starts_at > today) return 'Upcoming';
  if ((post.ends_at || post.starts_at) < today) return 'Completed';
  return 'Ongoing';
}
export function versionOf(post) { return post.updated_at || post.created_at; }
export function isCurrent(version, post) { return Boolean(version) && Date.parse(version) >= Date.parse(versionOf(post)); }
export function scheduleEntries(posts, today = todayKey()) {
  return posts.flatMap(post => {
    const entries = [];
    if (post.starts_at && (post.ends_at || post.starts_at) >= today) entries.push({ post, date: post.starts_at < today ? today : post.starts_at, kind: 'Activity' });
    if (post.deadline_date && post.deadline_date >= today) entries.push({ post, date: post.deadline_date, kind: 'Deadline' });
    return entries;
  }).sort((a,b) => a.date.localeCompare(b.date) || (a.post.call_time || '').localeCompare(b.post.call_time || ''));
}

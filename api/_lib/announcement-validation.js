export function validateAnnouncement(body) {
  if (body.title !== undefined && (!String(body.title).trim() || String(body.title).length > 180)) return 'Use a title between 1 and 180 characters.';
  if (body.content !== undefined && (!String(body.content).trim() || String(body.content).length > 20000)) return 'Use content between 1 and 20,000 characters.';
  for (const key of ['startsAt', 'endsAt', 'deadlineDate']) {
    const value = body[key];
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return 'Choose a valid date.';
  }
  if (body.endsAt && !body.startsAt) return 'Choose a start date before setting an end date.';
  if (body.startsAt && body.endsAt && body.endsAt < body.startsAt) return 'End date must be on or after the start date.';
  if (body.callTime && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(body.callTime)) return 'Choose a valid call time.';
  if (body.callTime && !body.startsAt) return 'A call time needs an activity date.';
  if (body.venue && String(body.venue).length > 250) return 'Venue must be 250 characters or fewer.';
  if (body.attachments !== undefined && (!Array.isArray(body.attachments) || body.attachments.length > 8)) return 'Attach up to 8 files.';
  if (body.voiceDuration !== undefined && body.voiceDuration !== null && (!Number.isInteger(body.voiceDuration) || body.voiceDuration < 0 || body.voiceDuration > 900)) return 'A voice message can be up to 15 minutes long.';
  const storageBase = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/announcement-attachments/' : '';
  if (body.voiceUrl && storageBase && !String(body.voiceUrl).startsWith(storageBase)) return 'Upload the voice message through this site.';
  const urls = [body.voiceUrl, body.coverImageUrl, ...(Array.isArray(body.attachments) ? body.attachments.map(a => a?.fileUrl) : [])].filter(Boolean);
  if (urls.some(value => { try { return new URL(value).protocol !== 'https:'; } catch { return true; } })) return 'File URLs must use HTTPS.';
  return null;
}

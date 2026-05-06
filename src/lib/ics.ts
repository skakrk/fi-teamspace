import type { DbMeeting } from './supabase';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toICSDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function meetingToICS(m: DbMeeting): string {
  const start = new Date(m.scheduled_at);
  const end = new Date(start.getTime() + m.duration_min * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FI Teamspace//Breakers//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${m.id}@fi-teamspace`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(start.toISOString())}`,
    `DTEND:${toICSDate(end.toISOString())}`,
    `SUMMARY:${escapeText(m.title)}`,
    m.agenda ? `DESCRIPTION:${escapeText(m.agenda)}` : '',
    m.meet_url ? `LOCATION:${escapeText(m.meet_url)}` : '',
    m.meet_url ? `URL:${m.meet_url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export function downloadICS(m: DbMeeting) {
  const blob = new Blob([meetingToICS(m)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${m.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

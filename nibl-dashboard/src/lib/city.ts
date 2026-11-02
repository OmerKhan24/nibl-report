// Maps free-text city / name hints onto the cities the business reports on.
export function normCity(txt: string): string | null {
  const t = (txt || '').toLowerCase();
  if (/karachi|\bkhi\b/.test(t)) return 'Karachi';
  if (/islamabad|rawalpindi|\bisb\b|\brwp\b/.test(t)) return 'Islamabad';
  if (/lahore|\blhe\b/.test(t)) return 'Lahore';
  return null;
}

export function resolveCity(rawCity: string, name = ''): string {
  const raw = (rawCity || '').trim();
  return normCity(raw) || normCity(name) || (raw ? raw.replace(/\b\w/g, ch => ch.toUpperCase()) : 'Other');
}

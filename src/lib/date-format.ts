const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Extract YYYY-MM-DD from API / ISO value. */
export function isoDateOnly(value: string): string {
  const match = ISO_DATE_PREFIX.exec(value.trim());
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value.slice(0, 10);
}

/** Display calendar date as DD/MM/YYYY. */
export function formatDateDdMmYyyy(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth() + 1;
    const d = value.getUTCDate();
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  const iso = isoDateOnly(value);
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/** Display date range as DD/MM/YYYY – DD/MM/YYYY. */
export function formatDateRangeDdMmYyyy(start: string, end: string): string {
  return `${formatDateDdMmYyyy(start)} – ${formatDateDdMmYyyy(end)}`;
}

/** Format YYYY-MM month key for dropdown labels (MM/YYYY). */
export function formatMonthKeyDdMmYyyy(ym: string): string {
  const [y, m] = ym.split('-');
  if (!y || !m) return ym;
  return `${m}/${y}`;
}

/** Format YYYY-MM as localized month + year heading. */
export function formatMonthYearLabel(ym: string, locale = 'sr-Latn'): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
}

/** Parse DD/MM/YYYY or D/M/YYYY to YYYY-MM-DD for API, or null if invalid. */
export function parseDdMmYyyyToIso(input: string): string | null {
  const t = input.trim().replace(/\s/g, '');
  const parts = t.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

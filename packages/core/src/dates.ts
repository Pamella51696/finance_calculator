const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const FORMATS: { re: RegExp; parse: (m: RegExpMatchArray) => string }[] = [
  {
    re: /^(\d{4})-(\d{2})-(\d{2})$/,
    parse: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  {
    re: /^(\d{2})\/(\d{2})\/(\d{4})$/,
    parse: (m) => `${m[3]}-${m[2]}-${m[1]}`,
  },
  {
    re: /^(\d{2})-(\d{2})-(\d{4})$/,
    parse: (m) => `${m[3]}-${m[2]}-${m[1]}`,
  },
  {
    re: /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/,
    parse: (m) => {
      const months: Record<string, string> = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };
      const mon = months[m[2]!.toLowerCase().slice(0, 3)];
      if (!mon) return "";
      const day = m[1]!.padStart(2, "0");
      return `${m[3]}-${mon}-${day}`;
    },
  },
];

export function parseDateToIso(raw: string, preferredFormat?: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (ISO_RE.test(trimmed)) return trimmed;

  if (preferredFormat === "DD/MM/YYYY") {
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const d = m[1]!.padStart(2, "0");
      const mo = m[2]!.padStart(2, "0");
      return `${m[3]}-${mo}-${d}`;
    }
  }
  if (preferredFormat === "MM/DD/YYYY") {
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mo = m[1]!.padStart(2, "0");
      const d = m[2]!.padStart(2, "0");
      return `${m[3]}-${mo}-${d}`;
    }
  }

  for (const fmt of FORMATS) {
    const m = trimmed.match(fmt.re);
    if (m) {
      const iso = fmt.parse(m);
      if (ISO_RE.test(iso)) return iso;
    }
  }
  return null;
}

export function monthKey(isoDate: string): { year: number; month: number } {
  const [y, m] = isoDate.split("-").map(Number);
  return { year: y!, month: m! };
}

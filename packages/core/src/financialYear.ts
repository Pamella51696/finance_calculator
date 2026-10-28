export function indiaFinancialYear(isoDate: string): { startYear: number; label: string } {
  const [y, m] = isoDate.split("-").map(Number);
  const startYear = m! >= 4 ? y! : y! - 1;
  return { startYear, label: `FY ${startYear}-${String(startYear + 1).slice(-2)}` };
}

export function isInFinancialYear(
  isoDate: string,
  fyStartYear: number,
): boolean {
  const d = new Date(isoDate + "T00:00:00Z");
  const start = new Date(Date.UTC(fyStartYear, 3, 1));
  const end = new Date(Date.UTC(fyStartYear + 1, 2, 31));
  return d >= start && d <= end;
}

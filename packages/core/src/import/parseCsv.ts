export function parseCsvText(
  text: string,
  delimiter?: string,
): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const delim = delimiter ?? detectDelimiter(nonEmpty[0]!);
  const headers = splitCsvLine(nonEmpty[0]!, delim).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = splitCsvLine(nonEmpty[i]!, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

function detectDelimiter(line: string): string {
  const counts = [
    { d: ",", c: (line.match(/,/g) ?? []).length },
    { d: ";", c: (line.match(/;/g) ?? []).length },
    { d: "\t", c: (line.match(/\t/g) ?? []).length },
  ];
  counts.sort((a, b) => b.c - a.c);
  return counts[0]!.c > 0 ? counts[0]!.d : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

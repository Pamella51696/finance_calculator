import type { DuplicateCandidate, ParsedImportRow } from "../types.js";

export interface ExistingFingerprint {
  transactionId: string;
  accountId: string;
  date: string;
  amountPaise: number;
  description: string;
  reference?: string | null;
}

export function duplicateFingerprint(
  accountId: string,
  date: string,
  amountPaise: number,
  description: string,
  reference?: string | null,
): string {
  const normDesc = description.trim().toLowerCase().replace(/\s+/g, " ");
  const ref = (reference ?? "").trim().toLowerCase();
  return [accountId, date, String(amountPaise), normDesc, ref].join("|");
}

export function findDuplicateCandidates(
  rows: ParsedImportRow[],
  accountId: string,
  existing: ExistingFingerprint[],
  importFileHash?: string,
): DuplicateCandidate[] {
  const byFp = new Map<string, string>();
  for (const e of existing) {
    byFp.set(
      duplicateFingerprint(
        e.accountId,
        e.date,
        e.amountPaise,
        e.description,
        e.reference,
      ),
      e.transactionId,
    );
  }

  const candidates: DuplicateCandidate[] = [];
  for (const row of rows) {
    if (row.errors.length > 0 || !row.date || row.amountPaise == null) continue;
    const fp = duplicateFingerprint(
      accountId,
      row.date,
      row.amountPaise,
      row.description ?? "",
      row.reference,
    );
    const existingId = byFp.get(fp);
    if (existingId) {
      candidates.push({
        rowIndex: row.rowIndex,
        existingTransactionId: existingId,
        reason: importFileHash
          ? "Matches existing transaction (possible re-import)"
          : "Matches existing transaction",
      });
    }
  }
  return candidates;
}

export function fileContentHash(content: string): string {
  let h = 2166136261;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

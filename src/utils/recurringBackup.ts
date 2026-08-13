import { RecurringTransaction, RecurringTransactionInsert } from "@/hooks/useRecurringTransactions";
import { validateRecurring } from "@/lib/validation/recurring";

const HEADERS = [
  "title",
  "amount",
  "type",
  "category",
  "frequency",
  "next_due_date",
  "reminder_days_before",
  "is_active",
  "notes",
] as const;

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function exportRecurringToCSV(items: RecurringTransaction[], filename: string) {
  const rows = items.map((i) =>
    [
      i.title,
      i.amount,
      i.type,
      i.category,
      i.frequency,
      i.next_due_date,
      i.reminder_days_before ?? 3,
      i.is_active ?? true,
      i.notes ?? "",
    ]
      .map(esc)
      .join(",")
  );
  download([HEADERS.join(","), ...rows].join("\n"), `${filename}.csv`, "text/csv");
}

export function exportRecurringToJSON(items: RecurringTransaction[], filename: string) {
  const payload = {
    app: "WalletWisely",
    kind: "recurring_schedules",
    version: 1,
    exported_at: new Date().toISOString(),
    schedules: items.map((i) => ({
      title: i.title,
      amount: Number(i.amount),
      type: i.type,
      category: i.category,
      frequency: i.frequency,
      next_due_date: i.next_due_date,
      reminder_days_before: i.reminder_days_before ?? 3,
      is_active: i.is_active ?? true,
      notes: i.notes ?? null,
    })),
  };
  download(JSON.stringify(payload, null, 2), `${filename}.json`, "application/json");
}

/** Minimal RFC4180-ish CSV line splitter (handles quoted fields with commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export type ParsedImport = {
  valid: RecurringTransactionInsert[];
  errors: string[];
};

function normalize(raw: Record<string, unknown>, rowLabel: string, errors: string[]) {
  const candidate = {
    title: String(raw.title ?? "").trim(),
    amount: Number(raw.amount),
    type: String(raw.type ?? "").trim().toLowerCase(),
    category: String(raw.category ?? "").trim().toLowerCase(),
    frequency: String(raw.frequency ?? "").trim().toLowerCase(),
    next_due_date: String(raw.next_due_date ?? "").trim(),
    reminder_days_before: Number(
      raw.reminder_days_before === "" || raw.reminder_days_before == null
        ? 3
        : raw.reminder_days_before
    ),
    is_active:
      typeof raw.is_active === "boolean"
        ? raw.is_active
        : String(raw.is_active ?? "true").toLowerCase() !== "false",
    notes: raw.notes ? String(raw.notes) : null,
  };

  const result = validateRecurring(candidate);
  if (result.ok === false) {
    const msg = Object.entries(result.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    errors.push(`${rowLabel} — ${msg}`);
    return null;
  }
  return result.data as RecurringTransactionInsert;
}

export function parseRecurringFile(filename: string, content: string): ParsedImport {
  const errors: string[] = [];
  const valid: RecurringTransactionInsert[] = [];

  const isJson = filename.toLowerCase().endsWith(".json") || content.trim().startsWith("{") || content.trim().startsWith("[");

  if (isJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { valid: [], errors: ["File is not valid JSON"] };
    }
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { schedules?: unknown[] })?.schedules;
    if (!Array.isArray(list)) {
      return { valid: [], errors: ["No schedules found in this file"] };
    }
    list.forEach((row, idx) => {
      if (typeof row !== "object" || row === null) {
        errors.push(`Item ${idx + 1} — not a valid schedule`);
        return;
      }
      const item = normalize(row as Record<string, unknown>, `Item ${idx + 1}`, errors);
      if (item) valid.push(item);
    });
    return { valid, errors };
  }

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { valid: [], errors: ["CSV has no data rows"] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const missing = HEADERS.filter((h) => !header.includes(h) && h !== "notes" && h !== "is_active" && h !== "reminder_days_before");
  if (missing.length) {
    return { valid: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  }

  lines.slice(1).forEach((line, idx) => {
    const cells = splitCsvLine(line);
    const raw: Record<string, unknown> = {};
    header.forEach((h, i) => {
      raw[h] = cells[i]?.trim();
    });
    const item = normalize(raw, `Row ${idx + 2}`, errors);
    if (item) valid.push(item);
  });

  return { valid, errors };
}

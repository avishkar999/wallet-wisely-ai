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

/* ---------------- Column mapping support ---------------- */

export const IMPORT_FIELDS = [
  { key: "title", label: "Title", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "type", label: "Type (income/expense)", required: true },
  { key: "category", label: "Category", required: true },
  { key: "frequency", label: "Frequency", required: true },
  { key: "next_due_date", label: "Next due date", required: true },
  { key: "reminder_days_before", label: "Reminder days before", required: false },
  { key: "is_active", label: "Active", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<ImportField, string>>;

export type CsvTable = { headers: string[]; rows: string[][] };

export function parseCsvTable(content: string): CsvTable | null {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((l) => splitCsvLine(l).map((c) => c.trim()));
  return { headers, rows };
}

const ALIASES: Record<ImportField, string[]> = {
  title: ["title", "name", "description", "label", "item", "payee", "merchant"],
  amount: ["amount", "value", "cost", "price", "sum", "total"],
  type: ["type", "kind", "direction", "in/out", "flow"],
  category: ["category", "cat", "group", "tag"],
  frequency: ["frequency", "freq", "repeat", "interval", "recurrence", "cycle"],
  next_due_date: ["next_due_date", "next due date", "due date", "duedate", "date", "next date", "start date"],
  reminder_days_before: ["reminder_days_before", "reminder days before", "reminder", "remind before", "reminder days"],
  is_active: ["is_active", "active", "enabled", "status"],
  notes: ["notes", "note", "comment", "comments", "memo", "remarks"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const field of IMPORT_FIELDS) {
    const aliases = ALIASES[field.key].map(norm);
    const exact = headers.find((h) => !used.has(h) && aliases.includes(norm(h)));
    const partial =
      exact ??
      headers.find((h) => !used.has(h) && aliases.some((a) => norm(h).includes(a) || a.includes(norm(h))));
    if (partial) {
      mapping[field.key] = partial;
      used.add(partial);
    }
  }
  return mapping;
}

export function mappingIsComplete(mapping: ColumnMapping): boolean {
  return IMPORT_FIELDS.filter((f) => f.required).every((f) => !!mapping[f.key]);
}

export function parseMappedCsv(table: CsvTable, mapping: ColumnMapping): ParsedImport {
  const errors: string[] = [];
  const valid: RecurringTransactionInsert[] = [];
  const indexOf = (field: ImportField) => {
    const header = mapping[field];
    return header ? table.headers.indexOf(header) : -1;
  };

  table.rows.forEach((cells, idx) => {
    const raw: Record<string, unknown> = {};
    for (const field of IMPORT_FIELDS) {
      const i = indexOf(field.key);
      if (i >= 0) raw[field.key] = cells[i];
    }
    const item = normalize(raw, `Row ${idx + 2}`, errors);
    if (item) valid.push(item);
  });

  return { valid, errors };
}

/* ---------------- Remembered mappings ---------------- */

const MAPPING_STORE_KEY = "walletwisely.recurring.columnMappings";

export function mappingSignature(headers: string[]): string {
  return headers.map((h) => norm(h)).join("|");
}

function readStore(): Record<string, ColumnMapping> {
  try {
    const raw = localStorage.getItem(MAPPING_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, ColumnMapping>) : {};
  } catch {
    return {};
  }
}

export function loadSavedMapping(headers: string[]): ColumnMapping | null {
  const saved = readStore()[mappingSignature(headers)];
  if (!saved) return null;
  // Drop any columns that no longer exist in this file
  const cleaned: ColumnMapping = {};
  for (const field of IMPORT_FIELDS) {
    const header = saved[field.key];
    if (header && headers.includes(header)) cleaned[field.key] = header;
  }
  return mappingIsComplete(cleaned) ? cleaned : null;
}

export function saveMapping(headers: string[], mapping: ColumnMapping) {
  try {
    const store = readStore();
    store[mappingSignature(headers)] = mapping;
    localStorage.setItem(MAPPING_STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function forgetMapping(headers: string[]) {
  try {
    const store = readStore();
    delete store[mappingSignature(headers)];
    localStorage.setItem(MAPPING_STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

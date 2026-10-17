import Papa from "papaparse";
import * as XLSX from "xlsx";
import { format, parse, isValid } from "date-fns";
import { autoCategorizeTransaction, cleanBankNarration, TransactionCategory, PaymentMethod } from "./autoCategorizer";
import { Tables } from "@/integrations/supabase/types";

export type BankProfileId = "generic" | "sbi" | "hdfc" | "icici" | "axis" | "custom";

export interface BankProfile {
  id: BankProfileId;
  name: string;
  bankName: string;
  description: string;
  fileHint: string;
  defaultDateColumn?: string;
  defaultDescColumn?: string;
  defaultDebitColumn?: string;
  defaultCreditColumn?: string;
  defaultAmountColumn?: string;
  defaultRefColumn?: string;
}

export const BANK_PROFILES: BankProfile[] = [
  {
    id: "generic",
    name: "Generic / Auto-Detect",
    bankName: "All Banks & Apps",
    description: "Automatically analyzes columns for Date, Narration, Debit/Credit, and Reference numbers.",
    fileHint: "Works with almost any standard CSV or Excel statement from banks, Paytm, Google Pay, CRED.",
  },
  {
    id: "hdfc",
    name: "HDFC Bank",
    bankName: "HDFC Bank",
    description: "Optimized for HDFC NetBanking statements with 'Narration', 'Withdrawal Amt.', 'Deposit Amt.'",
    fileHint: "HDFC CSV / Excel statements (.csv, .xlsx, .xls)",
    defaultDateColumn: "Date",
    defaultDescColumn: "Narration",
    defaultDebitColumn: "Withdrawal Amt.",
    defaultCreditColumn: "Deposit Amt.",
    defaultRefColumn: "Chq./Ref.No.",
  },
  {
    id: "sbi",
    name: "State Bank of India (SBI)",
    bankName: "SBI",
    description: "Standard SBI Onlinesbi statement layout with 'Txn Date', 'Description', 'Debit', 'Credit'",
    fileHint: "SBI NetBanking account statement (.csv, .xls, .xlsx)",
    defaultDateColumn: "Txn Date",
    defaultDescColumn: "Description",
    defaultDebitColumn: "Debit",
    defaultCreditColumn: "Credit",
    defaultRefColumn: "Ref No./Cheque No.",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    bankName: "ICICI Bank",
    description: "ICICI Bank NetBanking statement format with 'Transaction Date', 'Transaction Remarks'",
    fileHint: "ICICI statement (.csv, .xlsx, .xls)",
    defaultDateColumn: "Transaction Date",
    defaultDescColumn: "Transaction Remarks",
    defaultDebitColumn: "Debit Amount",
    defaultCreditColumn: "Credit Amount",
    defaultRefColumn: "Cheque Number",
  },
  {
    id: "axis",
    name: "Axis Bank",
    bankName: "Axis Bank",
    description: "Axis Bank Internet Banking format with 'Tran Date', 'Particulars', 'Debit', 'Credit'",
    fileHint: "Axis Bank account statement (.csv, .xlsx, .xls)",
    defaultDateColumn: "Tran Date",
    defaultDescColumn: "Particulars",
    defaultDebitColumn: "Debit",
    defaultCreditColumn: "Credit",
    defaultRefColumn: "CHQNO",
  },
  {
    id: "custom",
    name: "Custom Column Mapping",
    bankName: "Custom / Manual",
    description: "Choose and map exactly which columns correspond to Date, Description, Amount, and Reference.",
    fileHint: "Select this if your bank exports in a unique format.",
  },
];

export interface ColumnMappingConfig {
  dateColumn: string;
  descColumn: string;
  amountMode: "single" | "split";
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  refColumn?: string;
  merchantColumn?: string;
  dateFormat?: string; // "auto" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY"
}

export interface NormalizedImportTransaction {
  id: string; // generated preview id
  rawDate: string;
  normalizedDate: string; // YYYY-MM-DD
  rawDescription: string;
  name: string; // display title
  merchant: string;
  amount: number;
  type: "expense" | "income";
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  referenceNo: string;
  tags: string[];
  isTransfer: boolean;
  isRefund: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  validationError?: string;
  included: boolean; // toggle whether user wants to import this row
  autoDetectedRule?: string;
}

export interface ParseResult {
  fileName: string;
  fileSize: number;
  totalRows: number;
  headers: string[];
  rawRows: Record<string, any>[];
  detectedProfile: BankProfileId;
  mapping: ColumnMappingConfig;
  transactions: NormalizedImportTransaction[];
  stats: {
    totalParsed: number;
    totalIncluded: number;
    totalExpense: number;
    totalIncome: number;
    duplicateCount: number;
    refundCount: number;
    transferCount: number;
    errorCount: number;
  };
}

// Helper to sanitize numeric currency string
export function parseFinancialAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Math.abs(val);

  const cleanStr = String(val)
    .replace(/[₹$,\s]/g, "")
    .replace(/^(?:INR|USD|EUR)\s*/i, "")
    .replace(/\((.*?)\)/, "-$1") // accounting negative notation
    .trim();

  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Universal date standardizer
export function parseStatementDate(dateVal: any, preferredFormat: string = "auto"): { standardDate: string; raw: string; isValid: boolean } {
  if (!dateVal) return { standardDate: new Date().toISOString().slice(0, 10), raw: "", isValid: false };
  const raw = String(dateVal).trim();

  // Excel serial number handling (e.g. 45582)
  if (typeof dateVal === "number" || (/^\d{5}$/.test(raw) && !isNaN(Number(raw)))) {
    const excelEpoch = new Date(1899, 11, 30);
    const days = typeof dateVal === "number" ? dateVal : Number(raw);
    const jsDate = new Date(excelEpoch.getTime() + days * 86400000);
    if (isValid(jsDate)) {
      return { standardDate: jsDate.toISOString().slice(0, 10), raw, isValid: true };
    }
  }

  // Common date formats found in Indian & global bank statements
  const formatsToTry = [
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "yyyy-MM-dd",
    "dd/MM/yy",
    "dd-MM-yy",
    "dd-MMM-yyyy",
    "dd MMM yyyy",
    "dd.MM.yyyy",
    "MM/dd/yyyy",
    "MM-dd-yyyy",
    "yyyy/MM/dd",
  ];

  if (preferredFormat !== "auto") {
    try {
      const parsed = parse(raw, preferredFormat, new Date());
      if (isValid(parsed)) {
        return { standardDate: format(parsed, "yyyy-MM-dd"), raw, isValid: true };
      }
    } catch {
      // fallback to auto
    }
  }

  for (const fmt of formatsToTry) {
    try {
      const parsed = parse(raw, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return { standardDate: format(parsed, "yyyy-MM-dd"), raw, isValid: true };
      }
    } catch {
      // try next
    }
  }

  // Native Date parsing fallback
  const fallback = new Date(raw);
  if (isValid(fallback) && fallback.getFullYear() > 1990) {
    return { standardDate: fallback.toISOString().slice(0, 10), raw, isValid: true };
  }

  return { standardDate: new Date().toISOString().slice(0, 10), raw, isValid: false };
}

// Payment method detector
export function detectPaymentMethod(desc: string): PaymentMethod {
  const lower = desc.toLowerCase();
  if (lower.includes("upi") || lower.includes("vpa") || lower.includes("@ok") || lower.includes("@paytm")) {
    return "upi";
  }
  if (lower.includes("pos") || lower.includes("ecom") || lower.includes("debit card") || lower.includes("atm wdl")) {
    return "debit_card";
  }
  if (lower.includes("credit card") || lower.includes("cc payment") || lower.includes("visa") || lower.includes("mastercard")) {
    return "credit_card";
  }
  if (lower.includes("neft") || lower.includes("rtgs") || lower.includes("imps")) {
    return "neft";
  }
  if (lower.includes("nach") || lower.includes("ach") || lower.includes("autopay") || lower.includes("auto pay") || lower.includes("si-")) {
    return "auto_pay";
  }
  if (lower.includes("cash") || lower.includes("atm")) {
    return "cash";
  }
  return "other";
}

// Detect header row inside sheets with metadata headers
function findHeaderRowIndex(rows: any[][]): { headerIndex: number; headers: string[] } {
  let bestScore = -1;
  let bestIndex = 0;
  let bestHeaders: string[] = [];

  const KEY_HEADER_PATTERNS = [
    /date|txn\s*date|tran\s*date|value\s*dt/i,
    /narration|description|particulars|remarks|details/i,
    /debit|withdrawal|dr/i,
    /credit|deposit|cr/i,
    /amount|balance/i,
    /ref|chq|cheque|utr|rrn/i,
  ];

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    let score = 0;
    const stringHeaders = row.map(cell => (cell ? String(cell).trim() : ""));

    for (const pattern of KEY_HEADER_PATTERNS) {
      if (stringHeaders.some(h => pattern.test(h))) {
        score++;
      }
    }

    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestIndex = i;
      bestHeaders = stringHeaders;
    }
  }

  // If no clear header found, use row 0
  if (bestScore < 2 && rows.length > 0) {
    bestHeaders = rows[0].map((cell, idx) => (cell ? String(cell).trim() : `Column_${idx + 1}`));
    bestIndex = 0;
  }

  return { headerIndex: bestIndex, headers: bestHeaders };
}

// Intelligent auto-detection of column mapping
export function detectColumnMapping(headers: string[], profileId: BankProfileId = "generic"): ColumnMappingConfig {
  const profile = BANK_PROFILES.find(p => p.id === profileId);

  // If specific bank profile has known default columns, check if they exist in headers
  if (profile && profile.defaultDateColumn && headers.includes(profile.defaultDateColumn)) {
    return {
      dateColumn: profile.defaultDateColumn,
      descColumn: profile.defaultDescColumn || headers[1] || "",
      amountMode: "split",
      debitColumn: profile.defaultDebitColumn,
      creditColumn: profile.defaultCreditColumn,
      refColumn: profile.defaultRefColumn,
      dateFormat: "auto",
    };
  }

  const findHeader = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = headers.find(h => pattern.test(h.trim()));
      if (match) return match;
    }
    return "";
  };

  const dateCol = findHeader([
    /^date$/i,
    /txn\s*date/i,
    /tran\s*date/i,
    /transaction\s*date/i,
    /value\s*date/i,
    /post\s*date/i,
    /date/i,
  ]) || headers[0] || "";

  const descCol = findHeader([
    /^narration$/i,
    /^description$/i,
    /^particulars$/i,
    /transaction\s*remarks/i,
    /details/i,
    /remarks/i,
    /summary/i,
  ]) || headers[1] || "";

  const debitCol = findHeader([
    /^debit$/i,
    /debit\s*amount/i,
    /withdrawal\s*amt/i,
    /withdrawal/i,
    /^dr$/i,
    /dr\s*amount/i,
  ]);

  const creditCol = findHeader([
    /^credit$/i,
    /credit\s*amount/i,
    /deposit\s*amt/i,
    /deposit/i,
    /^cr$/i,
    /cr\s*amount/i,
  ]);

  const amountCol = findHeader([
    /^amount$/i,
    /transaction\s*amount/i,
    /txn\s*amt/i,
    /net\s*amount/i,
  ]);

  const refCol = findHeader([
    /ref/i,
    /utr/i,
    /chq/i,
    /cheque/i,
    /rrn/i,
    /reference/i,
    /txn\s*id/i,
  ]);

  const merchantCol = findHeader([
    /merchant/i,
    /payee/i,
    /beneficiary/i,
    /party/i,
  ]);

  const hasSplit = Boolean(debitCol && creditCol);

  return {
    dateColumn: dateCol,
    descColumn: descCol,
    amountMode: hasSplit ? "split" : "single",
    amountColumn: amountCol || (headers[2] || ""),
    debitColumn: debitCol || "",
    creditColumn: creditCol || "",
    refColumn: refCol || "",
    merchantColumn: merchantCol || "",
    dateFormat: "auto",
  };
}

// Auto-detect profile from headers
export function detectProfileFromHeaders(headers: string[]): BankProfileId {
  const headerStr = headers.join(" ").toLowerCase();

  if (headerStr.includes("narration") && (headerStr.includes("withdrawal") || headerStr.includes("deposit"))) {
    return "hdfc";
  }
  if (headerStr.includes("txn date") && headerStr.includes("ref no./cheque no.")) {
    return "sbi";
  }
  if (headerStr.includes("transaction remarks") || (headerStr.includes("transaction date") && headerStr.includes("cheque number"))) {
    return "icici";
  }
  if (headerStr.includes("tran date") && headerStr.includes("particulars") && headerStr.includes("chqno")) {
    return "axis";
  }

  return "generic";
}

// Parse Raw Rows into Normalized Transactions
export function normalizeRowsToTransactions(
  rows: Record<string, any>[],
  mapping: ColumnMappingConfig,
  existingTransactions: Tables<"transactions">[] = []
): NormalizedImportTransaction[] {
  const seenInBatch = new Map<string, number>();

  return rows
    .map((row, index) => {
      // 1. Extract Date
      const rawDateVal = row[mapping.dateColumn];
      const { standardDate, raw: rawDate, isValid: dateIsValid } = parseStatementDate(rawDateVal, mapping.dateFormat);

      // 2. Extract Description & Clean Name
      const rawDescription = String(row[mapping.descColumn] || "").trim();
      const merchantFromCol = mapping.merchantColumn ? String(row[mapping.merchantColumn] || "").trim() : "";
      const { cleanedName, merchant: extractedMerchant, referenceNo: extractedRef } = cleanBankNarration(rawDescription);

      const displayMerchant = merchantFromCol || extractedMerchant;
      const refFromCol = mapping.refColumn ? String(row[mapping.refColumn] || "").trim() : "";
      const referenceNo = refFromCol || extractedRef;

      // 3. Extract Amount & Determine Expense vs Income
      let amount = 0;
      let isCredit = false;

      if (mapping.amountMode === "split") {
        const debitVal = row[mapping.debitColumn || ""];
        const creditVal = row[mapping.creditColumn || ""];
        const debitAmt = parseFinancialAmount(debitVal);
        const creditAmt = parseFinancialAmount(creditVal);

        if (creditAmt > 0 && debitAmt === 0) {
          amount = creditAmt;
          isCredit = true;
        } else {
          amount = debitAmt;
          isCredit = false;
        }
      } else {
        const rawAmt = row[mapping.amountColumn || ""];
        const rawAmtStr = String(rawAmt || "");
        amount = parseFinancialAmount(rawAmt);

        // Check if string contains CR / DR or negative indicator
        if (/cr|credit/i.test(rawAmtStr)) {
          isCredit = true;
        } else if (/dr|debit/i.test(rawAmtStr) || rawAmtStr.includes("-")) {
          isCredit = false;
        } else {
          // If sign is not in amount column, check description for credit indicator
          isCredit = /neft-cr|rtgs-cr|imps-cr|salary|credited|refund|cashback/i.test(rawDescription);
        }
      }

      // Skip empty or zero rows
      if (amount <= 0 && !rawDescription) {
        return null;
      }

      // 4. Run Smart Auto-Categorization
      const categorization = autoCategorizeTransaction(rawDescription, amount, isCredit);
      const paymentMethod = detectPaymentMethod(rawDescription);

      // 5. Duplicate Detection
      // Check both existing transactions in database and within current batch
      let isDuplicate = false;
      let duplicateReason: string | undefined = undefined;

      // Check existing transactions
      const existingMatch = existingTransactions.find(t => {
        // Condition A: Reference number match
        if (referenceNo && t.description && t.description.includes(referenceNo)) {
          return true;
        }
        // Condition B: Date + Exact Amount + Similar Category or Name
        if (
          t.transaction_date === standardDate &&
          Math.abs(Number(t.amount) - amount) < 0.01 &&
          (t.type === (categorization.type || (isCredit ? "income" : "expense")))
        ) {
          const tName = t.name.toLowerCase();
          const curName = (displayMerchant || cleanedName).toLowerCase();
          if (tName.includes(curName) || curName.includes(tName) || t.category === categorization.category) {
            return true;
          }
        }
        return false;
      });

      if (existingMatch) {
        isDuplicate = true;
        duplicateReason = `Matches existing entry on ${existingMatch.transaction_date} for ₹${existingMatch.amount} (${existingMatch.name})`;
      } else {
        // Intra-batch duplicate check
        const batchKey = `${standardDate}_${amount}_${(displayMerchant || cleanedName).toLowerCase().slice(0, 15)}`;
        if (seenInBatch.has(batchKey)) {
          isDuplicate = true;
          duplicateReason = `Repeated entry inside this statement (Row ${index + 1})`;
        } else {
          seenInBatch.set(batchKey, index);
        }
      }

      // Validation warnings
      let validationError: string | undefined = undefined;
      if (!dateIsValid) {
        validationError = "Date format could not be verified";
      } else if (amount <= 0) {
        validationError = "Amount is zero or missing";
      }

      const item: NormalizedImportTransaction = {
        id: `import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        rawDate,
        normalizedDate: standardDate,
        rawDescription,
        name: displayMerchant || cleanedName,
        merchant: displayMerchant || extractedMerchant,
        amount,
        type: categorization.type,
        category: categorization.category,
        paymentMethod,
        referenceNo,
        tags: categorization.suggestedTags,
        isTransfer: categorization.isTransfer,
        isRefund: categorization.isRefund,
        isDuplicate,
        duplicateReason,
        validationError,
        // Auto-skip exact duplicates by default as requested by user
        included: !isDuplicate && !validationError && amount > 0,
        autoDetectedRule: categorization.matchedRule,
      };

      return item;
    })
    .filter((t): t is NormalizedImportTransaction => t !== null);
}

// Primary File Parser Entrypoint
export async function parseBankStatementFile(
  file: File,
  chosenProfileId: BankProfileId = "generic",
  existingTransactions: Tables<"transactions">[] = []
): Promise<ParseResult> {
  const isExcel =
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";

  let headers: string[] = [];
  let rawRows: Record<string, any>[] = [];

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Read as 2D matrix first to locate header row
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    const { headerIndex, headers: foundHeaders } = findHeaderRowIndex(rawMatrix);
    headers = foundHeaders.filter(Boolean);

    // Convert rows following the header row into objects
    for (let i = headerIndex + 1; i < rawMatrix.length; i++) {
      const row = rawMatrix[i];
      if (!Array.isArray(row) || row.every(cell => !cell || String(cell).trim() === "")) continue;

      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = row[colIdx] !== undefined ? row[colIdx] : "";
      });
      rawRows.push(rowObj);
    }
  } else {
    // CSV Parsing
    const text = await file.text();
    const parsedCsv = Papa.parse(text, {
      header: false,
      skipEmptyLines: "greedy",
    });

    const rawMatrix = parsedCsv.data as any[][];
    const { headerIndex, headers: foundHeaders } = findHeaderRowIndex(rawMatrix);
    headers = foundHeaders.filter(Boolean);

    for (let i = headerIndex + 1; i < rawMatrix.length; i++) {
      const row = rawMatrix[i];
      if (!Array.isArray(row) || row.every(cell => !cell || String(cell).trim() === "")) continue;

      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = row[colIdx] !== undefined ? row[colIdx] : "";
      });
      rawRows.push(rowObj);
    }
  }

  // Detect bank profile if generic was selected
  const detectedProfile = chosenProfileId === "generic" ? detectProfileFromHeaders(headers) : chosenProfileId;
  const mapping = detectColumnMapping(headers, detectedProfile);
  const transactions = normalizeRowsToTransactions(rawRows, mapping, existingTransactions);

  // Calculate statistics
  const stats = {
    totalParsed: transactions.length,
    totalIncluded: transactions.filter(t => t.included).length,
    totalExpense: transactions
      .filter(t => t.included && t.type === "expense" && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0),
    totalIncome: transactions
      .filter(t => t.included && t.type === "income" && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0),
    duplicateCount: transactions.filter(t => t.isDuplicate).length,
    refundCount: transactions.filter(t => t.isRefund).length,
    transferCount: transactions.filter(t => t.isTransfer).length,
    errorCount: transactions.filter(t => Boolean(t.validationError)).length,
  };

  return {
    fileName: file.name,
    fileSize: file.size,
    totalRows: rawRows.length,
    headers,
    rawRows,
    detectedProfile,
    mapping,
    transactions,
    stats,
  };
}

// Sample Statement Generators for Instant User Testing
export function generateSampleStatementCSV(): void {
  const sampleData = [
    ["Txn Date", "Description", "Ref No./Cheque No.", "Debit", "Credit", "Balance"],
    ["14/10/2026", "UPI/CR/429810481920/SWIGGY/BAN/Food Delivery", "429810481920", "540.00", "", "48460.00"],
    ["12/10/2026", "POS 401211111111 ZOMATO GURGAON IN", "POS981245", "720.00", "", "49000.00"],
    ["10/10/2026", "UPI/DR/428901293812/UBER RIDES/BANGALORE", "428901293812", "380.00", "", "49720.00"],
    ["08/10/2026", "ECOM AMAZON SELLER RETAIL SERVICES PVT LTD", "AMZ891230", "2499.00", "", "50100.00"],
    ["05/10/2026", "ACH DR BESCOM ELECTRICITY BILL 2026", "ACH89120", "1850.00", "", "52599.00"],
    ["03/10/2026", "UPI/CR/428109283910/APOLLO PHARMACY BANGALORE", "428109283910", "640.00", "", "54449.00"],
    ["02/10/2026", "REFUND: ZOMATO RESTAURANT CANCELLATION", "REF89210", "", "720.00", "55089.00"],
    ["01/10/2026", "NEFT-CR-TECHCORP SOLUTIONS-SALARY-OCT2026", "NEFT8921098", "", "65000.00", "54369.00"],
    ["28/09/2026", "SELF TRANSFER TO SAVINGS ACC", "TRF89210", "15000.00", "", "-10631.00"],
    ["25/09/2026", "UPI/CR/427819201928/BLINKIT GROCERIES", "427819201928", "890.00", "", "-25631.00"],
  ];

  const csvContent = sampleData.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "CoinKeeper_Sample_Bank_Statement.csv";
  link.click();
}

export function generateSampleStatementExcel(): void {
  const sampleData = [
    {
      "Date": "14/10/2026",
      "Narration": "UPI/CR/429810481920/SWIGGY/BAN/Food Delivery",
      "Chq./Ref.No.": "429810481920",
      "Withdrawal Amt.": 540,
      "Deposit Amt.": "",
      "Closing Balance": 48460,
    },
    {
      "Date": "12/10/2026",
      "Narration": "POS 401211111111 ZOMATO GURGAON IN",
      "Chq./Ref.No.": "POS981245",
      "Withdrawal Amt.": 720,
      "Deposit Amt.": "",
      "Closing Balance": 49000,
    },
    {
      "Date": "10/10/2026",
      "Narration": "UPI/DR/428901293812/UBER RIDES/BANGALORE",
      "Chq./Ref.No.": "428901293812",
      "Withdrawal Amt.": 380,
      "Deposit Amt.": "",
      "Closing Balance": 49720,
    },
    {
      "Date": "08/10/2026",
      "Narration": "ECOM AMAZON SELLER RETAIL SERVICES PVT LTD",
      "Chq./Ref.No.": "AMZ891230",
      "Withdrawal Amt.": 2499,
      "Deposit Amt.": "",
      "Closing Balance": 50100,
    },
    {
      "Date": "05/10/2026",
      "Narration": "ACH DR BESCOM ELECTRICITY BILL 2026",
      "Chq./Ref.No.": "ACH89120",
      "Withdrawal Amt.": 1850,
      "Deposit Amt.": "",
      "Closing Balance": 52599,
    },
    {
      "Date": "03/10/2026",
      "Narration": "UPI/CR/428109283910/APOLLO PHARMACY BANGALORE",
      "Chq./Ref.No.": "428109283910",
      "Withdrawal Amt.": 640,
      "Deposit Amt.": "",
      "Closing Balance": 54449,
    },
    {
      "Date": "02/10/2026",
      "Narration": "REFUND: ZOMATO RESTAURANT CANCELLATION",
      "Chq./Ref.No.": "REF89210",
      "Withdrawal Amt.": "",
      "Deposit Amt.": 720,
      "Closing Balance": 55089,
    },
    {
      "Date": "01/10/2026",
      "Narration": "NEFT-CR-TECHCORP SOLUTIONS-SALARY-OCT2026",
      "Chq./Ref.No.": "NEFT8921098",
      "Withdrawal Amt.": "",
      "Deposit Amt.": 65000,
      "Closing Balance": 54369,
    },
    {
      "Date": "28/09/2026",
      "Narration": "SELF TRANSFER TO SAVINGS ACC",
      "Chq./Ref.No.": "TRF89210",
      "Withdrawal Amt.": 15000,
      "Deposit Amt.": "",
      "Closing Balance": -10631,
    },
    {
      "Date": "25/09/2026",
      "Narration": "UPI/CR/427819201928/BLINKIT GROCERIES",
      "Chq./Ref.No.": "427819201928",
      "Withdrawal Amt.": 890,
      "Deposit Amt.": "",
      "Closing Balance": -25631,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Statement");
  XLSX.writeFile(workbook, "CoinKeeper_Sample_HDFC_Statement.xlsx");
}

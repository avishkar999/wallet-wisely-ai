import { format } from "date-fns";

export interface TransactionExportItem {
  id?: string;
  name?: string;
  description?: string;
  amount: number | string;
  type: "income" | "expense" | "transfer" | string;
  category: string;
  payment_method?: string;
  paymentMethod?: string;
  transaction_date?: string;
  date?: string;
  tags?: string[];
  reference_no?: string;
  referenceNo?: string;
  account?: string;
  [key: string]: any;
}

export interface BudgetExportCategory {
  category: string;
  label?: string;
  budgeted: number;
  spent: number;
  remaining?: number;
  percentUsed?: number;
  status?: string;
  transactionCount?: number;
  benchmarkGuideline?: string;
}

export interface BudgetReportExportData {
  month: number;
  year: number;
  monthName: string;
  currency: string;
  monthlyIncome: number;
  totalBudgeted: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  overallPacing?: string;
  budgetHealth?: string;
  categories: BudgetExportCategory[];
}

export interface MonthlyTrendItem {
  monthKey: string;
  monthLabel: string;
  year: number;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  topCategory?: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  food: "Food & Dining",
  housing: "Housing & Rent",
  transport: "Transportation",
  bills: "Utilities & Bills",
  shopping: "Shopping & Retail",
  entertainment: "Entertainment & Leisure",
  health: "Health & Fitness",
  recharges: "Subscriptions & Tech",
  education: "Learning & Education",
  travel: "Travel & Vacations",
  income: "Income & Inflows",
  other: "Personal & Other",
};

const METHOD_NAMES: Record<string, string> = {
  upi: "UPI",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  cash: "Cash",
  neft: "NEFT / Net Banking",
  auto_pay: "Auto Pay / Standing Order",
  other: "Other",
};

/**
 * Escapes a cell according to RFC 4180 CSV standard
 */
function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Trigger browser file download with UTF-8 BOM
 */
function downloadCSV(csvContent: string, filename: string) {
  // \uFEFF is UTF-8 Byte Order Mark for Excel compatibility
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Filter transactions based on date range, type, and category
 */
export function filterTransactionsForExport(
  transactions: TransactionExportItem[],
  options: {
    dateRange?: "all" | "this_month" | "last_month" | "last_90_days" | "this_year" | "custom";
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    type?: "all" | "expense" | "income";
    category?: string;  // "all" or specific
  }
): TransactionExportItem[] {
  const { dateRange = "all", startDate, endDate, type = "all", category = "all" } = options;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const thisMonthPrefix = `${currentYear}-${currentMonth}`;

  // Calculate last month prefix
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // 90 days ago
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysIso = ninetyDaysAgo.toISOString().split("T")[0];

  return transactions.filter((t) => {
    const rawDate = t.transaction_date || t.date || "";
    const txDate = rawDate.split("T")[0];

    // Type filter
    if (type !== "all" && t.type?.toLowerCase() !== type.toLowerCase()) {
      return false;
    }

    // Category filter
    if (category !== "all" && (t.category || "").toLowerCase() !== category.toLowerCase()) {
      return false;
    }

    // Date Range filter
    if (dateRange === "this_month") {
      if (!txDate.startsWith(thisMonthPrefix)) return false;
    } else if (dateRange === "last_month") {
      if (!txDate.startsWith(lastMonthPrefix)) return false;
    } else if (dateRange === "last_90_days") {
      if (txDate < ninetyDaysIso) return false;
    } else if (dateRange === "this_year") {
      if (!txDate.startsWith(String(currentYear))) return false;
    } else if (dateRange === "custom") {
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
    }

    return true;
  });
}

/**
 * 1. Export Transactions History to CSV
 */
export function exportTransactionsToCSV(
  transactions: TransactionExportItem[],
  options?: {
    filename?: string;
    includeSummary?: boolean;
    currency?: string;
    filterLabel?: string;
  }
) {
  const currency = options?.currency || "INR";
  const includeSummary = options?.includeSummary !== false;
  const filename = options?.filename || `CoinKeeper_Transactions_${format(new Date(), "yyyy-MM-dd")}`;

  const headers = [
    "Date",
    "Payee / Merchant",
    "Type",
    "Category",
    `Amount (${currency})`,
    "Payment Method",
    "Tags",
    "Reference / UTR",
    "Notes & Description",
  ];

  let totalIncome = 0;
  let totalExpenses = 0;

  const rows = transactions.map((t) => {
    const amt = Number(t.amount) || 0;
    const isIncome = (t.type || "").toLowerCase() === "income";
    if (isIncome) {
      totalIncome += amt;
    } else {
      totalExpenses += amt;
    }

    const txDate = (t.transaction_date || t.date || "").split("T")[0] || "";
    const name = t.name || t.description || "Transaction";
    const typeLabel = isIncome ? "Income" : "Expense";
    const catLabel = CATEGORY_NAMES[t.category?.toLowerCase()] || t.category || "General";
    const method = METHOD_NAMES[t.payment_method || t.paymentMethod || ""] || t.payment_method || t.paymentMethod || "UPI";
    const tags = Array.isArray(t.tags) ? t.tags.join("; ") : "";
    const ref = t.reference_no || t.referenceNo || "";
    const notes = t.description || t.notes || "";

    return [
      escapeCSVCell(txDate),
      escapeCSVCell(name),
      escapeCSVCell(typeLabel),
      escapeCSVCell(catLabel),
      escapeCSVCell(amt.toFixed(2)),
      escapeCSVCell(method),
      escapeCSVCell(tags),
      escapeCSVCell(ref),
      escapeCSVCell(notes),
    ].join(",");
  });

  const lines: string[] = [];

  // Header metadata
  lines.push(`"CoinKeeper OS — Transaction History Export"`);
  lines.push(`"Generated On: ${format(new Date(), "PPpp")}"`);
  if (options?.filterLabel) {
    lines.push(`"Filter Scope: ${options.filterLabel}"`);
  }
  lines.push(`"Total Transactions: ${transactions.length}"`);
  lines.push("");

  // Column header
  lines.push(headers.map(escapeCSVCell).join(","));

  // Rows
  lines.push(...rows);

  // Summary footer if requested
  if (includeSummary && transactions.length > 0) {
    lines.push("");
    lines.push(`"--- FINANCIAL SUMMARY ---"`);
    lines.push(`"Total Inflow / Income",${escapeCSVCell(totalIncome.toFixed(2))}`);
    lines.push(`"Total Outflow / Expenses",${escapeCSVCell(totalExpenses.toFixed(2))}`);
    lines.push(`"Net Cashflow Cushion",${escapeCSVCell((totalIncome - totalExpenses).toFixed(2))}`);
    lines.push(`"Transaction Count",${transactions.length}`);
    lines.push(`"Average Spend per Expense",${totalExpenses > 0 ? (totalExpenses / Math.max(1, transactions.filter(t => t.type === "expense").length)).toFixed(2) : "0.00"}`);
  }

  downloadCSV(lines.join("\n"), filename);
}

/**
 * 2. Export Budget Report to CSV
 */
export function exportBudgetReportToCSV(
  budgetData: BudgetReportExportData,
  options?: { filename?: string }
) {
  const {
    monthName,
    year,
    currency = "INR",
    monthlyIncome,
    totalBudgeted,
    totalExpenses,
    netSavings,
    savingsRate,
    overallPacing,
    budgetHealth,
    categories = [],
  } = budgetData;

  const filename = options?.filename || `CoinKeeper_Budget_Report_${monthName}_${year}`;

  const lines: string[] = [];

  // 1. Report Title & Meta
  lines.push(`"CoinKeeper OS — Monthly Budget & Pacing Report"`);
  lines.push(`"Period: ${monthName} ${year}"`);
  lines.push(`"Report Date: ${format(new Date(), "PPpp")}"`);
  lines.push(`"Currency: ${currency}"`);
  lines.push("");

  // 2. Executive Snapshot
  lines.push(`"--- EXECUTIVE SUMMARY ---"`);
  lines.push(`"Monthly Inflow / Income",${escapeCSVCell(monthlyIncome.toFixed(2))}`);
  lines.push(`"Total Planned Budget",${escapeCSVCell(totalBudgeted.toFixed(2))}`);
  lines.push(`"Total Actual Outflow",${escapeCSVCell(totalExpenses.toFixed(2))}`);
  lines.push(`"Net Savings Cushion",${escapeCSVCell(netSavings.toFixed(2))}`);
  lines.push(`"Savings Rate",${escapeCSVCell(`${savingsRate}%`)}`);
  lines.push(`"Budget Pacing",${escapeCSVCell(overallPacing || "Active")}`);
  lines.push(`"Budget Health Score",${escapeCSVCell(budgetHealth || "Balanced")}`);
  lines.push("");

  // 3. Category Breakdown Table
  lines.push(`"--- CATEGORY BUDGET ALLOCATION & ACTUAL SPENDING ---"`);
  const headers = [
    "Category Key",
    "Category Name",
    `Allocated Budget (${currency})`,
    `Actual Outflow (${currency})`,
    `Variance / Remaining (${currency})`,
    "% Budget Used",
    "Status",
    "Transaction Count",
    "Benchmark Guideline",
  ];
  lines.push(headers.map(escapeCSVCell).join(","));

  let sumBudgeted = 0;
  let sumSpent = 0;
  let sumRemaining = 0;

  categories.forEach((cat) => {
    const budgeted = Number(cat.budgeted) || 0;
    const spent = Number(cat.spent) || 0;
    const remaining = budgeted - spent;
    const pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
    
    let statusText = "On Track";
    if (budgeted === 0 && spent > 0) statusText = "Unbudgeted";
    else if (pct > 100) statusText = "Over Budget";
    else if (pct >= 90) statusText = "Warning (>=90%)";
    else if (pct >= 75) statusText = "Moderate (>=75%)";

    sumBudgeted += budgeted;
    sumSpent += spent;
    sumRemaining += remaining;

    const row = [
      escapeCSVCell(cat.category),
      escapeCSVCell(cat.label || CATEGORY_NAMES[cat.category.toLowerCase()] || cat.category),
      escapeCSVCell(budgeted.toFixed(2)),
      escapeCSVCell(spent.toFixed(2)),
      escapeCSVCell(remaining.toFixed(2)),
      escapeCSVCell(`${pct}%`),
      escapeCSVCell(statusText),
      escapeCSVCell(cat.transactionCount || 0),
      escapeCSVCell(cat.benchmarkGuideline || "Standard Household Guidelines"),
    ];
    lines.push(row.join(","));
  });

  // Category Total Row
  lines.push([
    escapeCSVCell("TOTAL"),
    escapeCSVCell("All Categories Combined"),
    escapeCSVCell(sumBudgeted.toFixed(2)),
    escapeCSVCell(sumSpent.toFixed(2)),
    escapeCSVCell(sumRemaining.toFixed(2)),
    escapeCSVCell(sumBudgeted > 0 ? `${Math.round((sumSpent / sumBudgeted) * 100)}%` : "0%"),
    escapeCSVCell(sumRemaining >= 0 ? "Under Cap" : "Deficit"),
    escapeCSVCell(categories.reduce((acc, c) => acc + (c.transactionCount || 0), 0)),
    escapeCSVCell("Target: Total Expense <= 80% Income"),
  ].join(","));

  downloadCSV(lines.join("\n"), filename);
}

/**
 * 3. Export Comprehensive 6-Month Trend & Financial Retrospective to CSV
 */
export function exportMultiMonthTrendsToCSV(
  trendItems: MonthlyTrendItem[],
  options?: { filename?: string; currency?: string }
) {
  const currency = options?.currency || "INR";
  const filename = options?.filename || `CoinKeeper_Financial_Trends_${format(new Date(), "yyyy-MM")}`;

  const lines: string[] = [];

  lines.push(`"CoinKeeper OS — 6-Month Financial Trend Retrospective"`);
  lines.push(`"Report Generated: ${format(new Date(), "PPpp")}"`);
  lines.push(`"Currency: ${currency}"`);
  lines.push("");

  const headers = [
    "Month",
    "Year",
    `Monthly Inflow (${currency})`,
    `Monthly Outflow (${currency})`,
    `Net Savings Cushion (${currency})`,
    "Savings Rate (%)",
    "Top Spending Category",
    "Cashflow Trend",
  ];
  lines.push(headers.map(escapeCSVCell).join(","));

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;

  trendItems.forEach((item) => {
    totalIncome += item.income;
    totalExpense += item.expense;
    totalSavings += item.savings;

    const row = [
      escapeCSVCell(item.monthLabel),
      escapeCSVCell(item.year),
      escapeCSVCell(item.income.toFixed(2)),
      escapeCSVCell(item.expense.toFixed(2)),
      escapeCSVCell(item.savings.toFixed(2)),
      escapeCSVCell(`${item.savingsRate}%`),
      escapeCSVCell(item.topCategory || "N/A"),
      escapeCSVCell(item.savings >= 0 ? "Surplus (+)" : "Deficit (-)"),
    ];
    lines.push(row.join(","));
  });

  const count = Math.max(1, trendItems.length);
  const avgIncome = totalIncome / count;
  const avgExpense = totalExpense / count;
  const avgSavings = totalSavings / count;
  const avgRate = avgIncome > 0 ? Math.round((avgSavings / avgIncome) * 100) : 0;

  lines.push("");
  lines.push(`"--- 6-MONTH AGGREGATE PERFORMANCE ---"`);
  lines.push(`"Cumulative Income",${escapeCSVCell(totalIncome.toFixed(2))}`);
  lines.push(`"Cumulative Expenses",${escapeCSVCell(totalExpense.toFixed(2))}`);
  lines.push(`"Cumulative Net Savings",${escapeCSVCell(totalSavings.toFixed(2))}`);
  lines.push(`"Average Monthly Income",${escapeCSVCell(avgIncome.toFixed(2))}`);
  lines.push(`"Average Monthly Outflow",${escapeCSVCell(avgExpense.toFixed(2))}`);
  lines.push(`"Average Monthly Net Savings",${escapeCSVCell(avgSavings.toFixed(2))}`);
  lines.push(`"Average Savings Rate",${escapeCSVCell(`${avgRate}%`)}`);

  downloadCSV(lines.join("\n"), filename);
}

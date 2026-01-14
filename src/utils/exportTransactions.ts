import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

const categoryLabels: Record<string, string> = {
  food: "Food & Dining",
  shopping: "Shopping",
  transport: "Transport",
  entertainment: "Entertainment",
  bills: "Bills & Utilities",
  health: "Health",
  recharges: "Recharges",
  education: "Education",
  travel: "Travel",
  income: "Income",
  other: "Other",
};

const methodLabels: Record<string, string> = {
  upi: "UPI",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  cash: "Cash",
  neft: "NEFT",
  auto_pay: "Auto Pay",
  other: "Other",
};

export function exportToCSV(transactions: Transaction[], filename: string) {
  const headers = ["Date", "Name", "Type", "Category", "Amount (₹)", "Payment Method", "Description"];
  
  const rows = transactions.map(txn => [
    txn.transaction_date,
    txn.name,
    txn.type === "income" ? "Income" : "Expense",
    categoryLabels[txn.category] || txn.category,
    txn.amount.toString(),
    methodLabels[txn.payment_method] || txn.payment_method,
    txn.description || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(transactions: Transaction[], filename: string) {
  // For Excel, we'll create a more formatted CSV that Excel can open nicely
  const headers = ["Date", "Name", "Type", "Category", "Amount (₹)", "Payment Method", "Description"];
  
  const rows = transactions.map(txn => [
    txn.transaction_date,
    txn.name,
    txn.type === "income" ? "Income" : "Expense",
    categoryLabels[txn.category] || txn.category,
    txn.amount,
    methodLabels[txn.payment_method] || txn.payment_method,
    txn.description || "",
  ]);

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const csvContent = [
    headers.join("\t"),
    ...rows.map(row => row.map(cell => `${cell}`).join("\t")),
    "",
    `Total Income\t\t\t\t${totalIncome}`,
    `Total Expenses\t\t\t\t${totalExpense}`,
    `Net Balance\t\t\t\t${totalIncome - totalExpense}`,
  ].join("\n");

  const blob = new Blob([csvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

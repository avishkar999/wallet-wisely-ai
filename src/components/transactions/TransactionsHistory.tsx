import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, Search, Download, FileSpreadsheet, Filter, 
  ArrowDownLeft, ShoppingBag, Fuel, Smartphone, Zap, 
  Utensils, Film, Heart, Pencil, Calendar, TrendingUp, TrendingDown
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { EditTransactionDialog } from "@/components/forms/EditTransactionDialog";
import { AddTransactionDialog } from "@/components/forms/AddTransactionDialog";
import { exportToCSV, exportToExcel } from "@/utils/exportTransactions";
import { Tables, Constants } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Transaction = Tables<"transactions">;

const categoryIcons: Record<string, React.ElementType> = {
  food: Utensils,
  shopping: ShoppingBag,
  transport: Fuel,
  entertainment: Film,
  bills: Zap,
  health: Heart,
  recharges: Smartphone,
  income: ArrowDownLeft,
  other: Receipt,
};

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

const categories = Constants.public.Enums.transaction_category;

export function TransactionsHistory() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const month = t.transaction_date.slice(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      const matchesSearch = txn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (txn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = categoryFilter === "all" || txn.category === categoryFilter;
      const matchesType = typeFilter === "all" || txn.type === typeFilter;
      const matchesMonth = monthFilter === "all" || txn.transaction_date.startsWith(monthFilter);
      
      return matchesSearch && matchesCategory && matchesType && matchesMonth;
    });
  }, [transactions, searchQuery, categoryFilter, typeFilter, monthFilter]);

  // Calculate summary for filtered transactions
  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", { 
      day: "numeric", 
      month: "short",
      year: "numeric"
    });
  };

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export.",
        variant: "destructive",
      });
      return;
    }
    const filename = `transactions_${monthFilter === "all" ? "all" : monthFilter}`;
    exportToCSV(filteredTransactions, filename);
    toast({
      title: "Export Complete",
      description: `Exported ${filteredTransactions.length} transactions to CSV.`,
    });
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export.",
        variant: "destructive",
      });
      return;
    }
    const filename = `transactions_${monthFilter === "all" ? "all" : monthFilter}`;
    exportToExcel(filteredTransactions, filename);
    toast({
      title: "Export Complete",
      description: `Exported ${filteredTransactions.length} transactions to Excel.`,
    });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(summary.income)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.expenses)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card variant="elevated">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filters & Export
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <AddTransactionDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Transactions ({filteredTransactions.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((txn, index) => {
                const Icon = categoryIcons[txn.category] || Receipt;
                const isCredit = txn.type === "income";
                
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleEditTransaction(txn)}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-all cursor-pointer group border border-transparent hover:border-border"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      isCredit ? 'bg-success/20' : 'bg-muted'
                    }`}>
                      <Icon className={`w-6 h-6 ${isCredit ? 'text-success' : 'text-muted-foreground'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{txn.name}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {categoryLabels[txn.category] || txn.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {methodLabels[txn.payment_method] || txn.payment_method}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{formatDate(txn.transaction_date)}</p>
                        {txn.description && (
                          <p className="text-sm text-muted-foreground truncate">• {txn.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <p className={`text-lg font-semibold ${isCredit ? 'text-success' : 'text-foreground'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Number(txn.amount))}
                      </p>
                      <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}

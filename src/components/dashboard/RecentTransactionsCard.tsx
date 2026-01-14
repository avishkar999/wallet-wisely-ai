import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ArrowDownLeft, ShoppingBag, Fuel, Smartphone, Zap, Utensils, Film, Heart, HelpCircle, Pencil } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { EditTransactionDialog } from "@/components/forms/EditTransactionDialog";
import { Tables } from "@/integrations/supabase/types";

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

const methodLabels: Record<string, string> = {
  upi: "UPI",
  debit_card: "Card",
  credit_card: "Credit",
  cash: "Cash",
  neft: "NEFT",
  auto_pay: "Auto",
  other: "Other",
};

export function RecentTransactionsCard() {
  const { data: transactions = [], isLoading } = useTransactions();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="w-5 h-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const recentTransactions = transactions.slice(0, 6);

  return (
    <>
      <Card variant="elevated">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="w-5 h-5 text-primary" />
            Recent Transactions
          </CardTitle>
          {transactions.length > 6 && (
            <button className="text-xs text-primary font-medium hover:underline">View All</button>
          )}
        </CardHeader>
        
        <CardContent className="space-y-2">
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HelpCircle className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground">Add your first transaction to get started</p>
            </div>
          ) : (
            recentTransactions.map((txn, index) => {
              const Icon = categoryIcons[txn.category] || Receipt;
              const isCredit = txn.type === "income";
              
              return (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleEditTransaction(txn)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    isCredit ? 'bg-success/20' : 'bg-muted'
                  }`}>
                    <Icon className={`w-5 h-5 ${isCredit ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{txn.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {methodLabels[txn.payment_method] || txn.payment_method}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(txn.transaction_date)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isCredit ? 'text-success' : 'text-foreground'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Number(txn.amount))}
                      </p>
                    </div>
                    <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>

      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

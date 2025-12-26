import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ArrowUpRight, ArrowDownLeft, Coffee, ShoppingBag, Fuel, Smartphone, Zap } from "lucide-react";

interface Transaction {
  id: string;
  name: string;
  category: string;
  amount: number;
  type: "debit" | "credit";
  date: string;
  icon: React.ElementType;
  method: string;
}

const transactions: Transaction[] = [
  { id: "1", name: "Starbucks Coffee", category: "Food", amount: 450, type: "debit", date: "Today, 10:30 AM", icon: Coffee, method: "UPI" },
  { id: "2", name: "Salary Credit", category: "Income", amount: 85000, type: "credit", date: "Today, 9:00 AM", icon: ArrowDownLeft, method: "NEFT" },
  { id: "3", name: "Amazon Shopping", category: "Shopping", amount: 2499, type: "debit", date: "Yesterday", icon: ShoppingBag, method: "Card" },
  { id: "4", name: "Petrol - HP", category: "Transport", amount: 1500, type: "debit", date: "Yesterday", icon: Fuel, method: "UPI" },
  { id: "5", name: "Mobile Recharge", category: "Bills", amount: 699, type: "debit", date: "Dec 24", icon: Smartphone, method: "UPI" },
  { id: "6", name: "Electricity Bill", category: "Bills", amount: 1850, type: "debit", date: "Dec 23", icon: Zap, method: "Auto-Pay" },
];

export function RecentTransactionsCard() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="w-5 h-5 text-primary" />
          Recent Transactions
        </CardTitle>
        <button className="text-xs text-primary font-medium hover:underline">View All</button>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {transactions.map((txn, index) => {
          const Icon = txn.icon;
          const isCredit = txn.type === "credit";
          
          return (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
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
                    {txn.method}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{txn.date}</p>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-semibold ${isCredit ? 'text-success' : 'text-foreground'}`}>
                  {isCredit ? '+' : '-'}{formatCurrency(txn.amount)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

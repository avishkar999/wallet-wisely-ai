import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";

interface CashFlowCardProps {
  income: number;
  expenses: number;
}

export function CashFlowCard({ income, expenses }: CashFlowCardProps) {
  const balance = income - expenses;
  const savingsRate = Math.round((balance / income) * 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5 text-primary" />
          Cash Flow
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-success/10 border border-success/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(income)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Expenses</span>
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrency(expenses)}</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(balance)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Savings Rate</p>
              <p className="text-2xl font-bold text-primary">{savingsRate}%</p>
            </div>
          </div>
        </motion.div>

        {/* Simple bar visualization */}
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(expenses / income) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full bg-gradient-to-r from-destructive to-warning rounded-full"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${savingsRate}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-primary to-success rounded-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Spent: {Math.round((expenses / income) * 100)}%</span>
            <span>Saved: {savingsRate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

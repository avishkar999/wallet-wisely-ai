import { motion } from "framer-motion";
import { Plus, ArrowUpRight, CreditCard, PiggyBank, Target, Wallet } from "lucide-react";
import { useState } from "react";
import { AddTransactionDialog } from "@/components/forms/AddTransactionDialog";
import { AddInvestmentDialog } from "@/components/forms/AddInvestmentDialog";
import { AddDebtDialog } from "@/components/forms/AddDebtDialog";

const actions = [
  { 
    label: "Expense", 
    icon: Plus, 
    color: "hsl(var(--primary))", 
    bgClass: "bg-primary/10 hover:bg-primary/20",
    dialog: "expense" 
  },
  { 
    label: "Income", 
    icon: ArrowUpRight, 
    color: "hsl(var(--success))", 
    bgClass: "bg-success/10 hover:bg-success/20",
    dialog: "income" 
  },
  { 
    label: "Invest", 
    icon: PiggyBank, 
    color: "hsl(var(--accent))", 
    bgClass: "bg-accent/10 hover:bg-accent/20",
    dialog: "investment" 
  },
  { 
    label: "Debt", 
    icon: CreditCard, 
    color: "hsl(var(--warning))", 
    bgClass: "bg-warning/10 hover:bg-warning/20",
    dialog: "debt" 
  },
];

export function QuickActionsCompact() {
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showInvestmentDialog, setShowInvestmentDialog] = useState(false);
  const [showDebtDialog, setShowDebtDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");

  const handleActionClick = (dialog: string) => {
    switch (dialog) {
      case "expense":
        setTransactionType("expense");
        setShowTransactionDialog(true);
        break;
      case "income":
        setTransactionType("income");
        setShowTransactionDialog(true);
        break;
      case "investment":
        setShowInvestmentDialog(true);
        break;
      case "debt":
        setShowDebtDialog(true);
        break;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-premium rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
            <p className="text-xs text-muted-foreground">Add new entries</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleActionClick(action.dialog)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl ${action.bgClass} border border-transparent hover:border-border/50 transition-all cursor-pointer group`}
              >
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${action.color}15` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: action.color }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <AddTransactionDialog 
        open={showTransactionDialog} 
        onOpenChange={setShowTransactionDialog}
        defaultType={transactionType}
      />
      <AddInvestmentDialog 
        open={showInvestmentDialog} 
        onOpenChange={setShowInvestmentDialog} 
      />
      <AddDebtDialog 
        open={showDebtDialog} 
        onOpenChange={setShowDebtDialog} 
      />
    </>
  );
}

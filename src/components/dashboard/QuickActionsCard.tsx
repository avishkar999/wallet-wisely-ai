import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Scan, Send, CreditCard, PiggyBank, Target } from "lucide-react";

const actions = [
  { label: "Add Expense", icon: Plus, color: "hsl(var(--primary))" },
  { label: "Scan Bill", icon: Scan, color: "hsl(var(--accent))" },
  { label: "Send Money", icon: Send, color: "hsl(var(--success))" },
  { label: "Pay Card", icon: CreditCard, color: "hsl(var(--warning))" },
  { label: "Add to SIP", icon: PiggyBank, color: "hsl(var(--primary))" },
  { label: "Set Goal", icon: Target, color: "hsl(var(--accent))" },
];

export function QuickActionsCard() {
  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:shadow-lg"
                  style={{ 
                    backgroundColor: `${action.color}20`,
                  }}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: action.color }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, ShoppingBag, Utensils, Car, Smartphone, Film, Home, Heart, Plane, GraduationCap, HelpCircle } from "lucide-react";
import { useFinancialSummary } from "@/hooks/useTransactions";

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  food: { icon: Utensils, color: "hsl(var(--warning))", label: "Food & Dining" },
  shopping: { icon: ShoppingBag, color: "hsl(var(--accent))", label: "Shopping" },
  transport: { icon: Car, color: "hsl(var(--primary))", label: "Transport" },
  entertainment: { icon: Film, color: "hsl(var(--success))", label: "Entertainment" },
  bills: { icon: Home, color: "hsl(var(--destructive))", label: "Bills & Utilities" },
  health: { icon: Heart, color: "hsl(142 76% 46%)", label: "Health" },
  recharges: { icon: Smartphone, color: "hsl(200 72% 50%)", label: "Recharges" },
  education: { icon: GraduationCap, color: "hsl(280 70% 50%)", label: "Education" },
  travel: { icon: Plane, color: "hsl(210 70% 50%)", label: "Travel" },
  other: { icon: PieChart, color: "hsl(var(--muted-foreground))", label: "Other" },
};

export function SpendingCategoriesCard() {
  const { categoryTotals, expenses, isLoading } = useFinancialSummary();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const categories = Object.entries(categoryTotals)
    .map(([key, amount]) => ({
      key,
      ...categoryConfig[key] || categoryConfig.other,
      amount,
      percentage: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="w-5 h-5 text-primary" />
            Spending by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="w-5 h-5 text-primary" />
          Spending by Category
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HelpCircle className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No expenses yet</p>
            <p className="text-xs text-muted-foreground">Add expenses to see categories</p>
          </div>
        ) : (
          categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: category.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{category.label}</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(category.amount)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${category.percentage}%` }}
                          transition={{ duration: 0.6, delay: index * 0.05 + 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">{category.percentage}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

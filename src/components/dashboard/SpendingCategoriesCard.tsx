import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, ShoppingBag, Utensils, Car, Smartphone, Film, Home, Heart } from "lucide-react";

interface Category {
  name: string;
  amount: number;
  percentage: number;
  icon: React.ElementType;
  color: string;
}

const categories: Category[] = [
  { name: "Food & Dining", amount: 12500, percentage: 28, icon: Utensils, color: "hsl(var(--warning))" },
  { name: "Shopping", amount: 8900, percentage: 20, icon: ShoppingBag, color: "hsl(var(--accent))" },
  { name: "Transport", amount: 6200, percentage: 14, icon: Car, color: "hsl(var(--primary))" },
  { name: "Entertainment", amount: 4500, percentage: 10, icon: Film, color: "hsl(var(--success))" },
  { name: "Bills & Utilities", amount: 7800, percentage: 17, icon: Home, color: "hsl(var(--destructive))" },
  { name: "Health", amount: 3200, percentage: 7, icon: Heart, color: "hsl(142 76% 46%)" },
  { name: "Recharges", amount: 1800, percentage: 4, icon: Smartphone, color: "hsl(200 72% 50%)" },
];

export function SpendingCategoriesCard() {
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
          <PieChart className="w-5 h-5 text-primary" />
          Spending by Category
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.name}
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
                    <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
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
        })}
      </CardContent>
    </Card>
  );
}

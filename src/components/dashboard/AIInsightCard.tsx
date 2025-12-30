import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, TrendingDown, AlertTriangle, Lightbulb, PiggyBank } from "lucide-react";
import { useFinancialSummary } from "@/hooks/useTransactions";
import { useDebtSummary } from "@/hooks/useDebts";
import { useInvestmentSummary } from "@/hooks/useInvestments";

interface Insight {
  type: "warning" | "suggestion" | "alert" | "success";
  title: string;
  description: string;
  action: string;
}

export function AIInsightCard() {
  const { expenses: totalExpenses, savingsRate, categoryTotals } = useFinancialSummary();
  const { totalDebt, avgInterestRate: avgInterest } = useDebtSummary();
  const { overallChangePercent: returnPercentage } = useInvestmentSummary();
  
  // Convert categoryTotals to array format
  const byCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
  }));

  // Generate insights based on real data
  const insights: Insight[] = [];

  // Check if any category exceeds 30% of total expenses
  const highSpendingCategory = byCategory.find(c => c.percentage > 30 && c.category !== 'income');
  if (highSpendingCategory) {
    insights.push({
      type: "warning",
      title: `High spending on ${highSpendingCategory.category}`,
      description: `${highSpendingCategory.percentage}% of your expenses go to ${highSpendingCategory.category}`,
      action: "View breakdown"
    });
  }

  // Check savings rate
  if (savingsRate < 10 && totalExpenses > 0) {
    insights.push({
      type: "suggestion",
      title: "Low savings rate",
      description: `Your savings rate is ${savingsRate}%. Consider saving at least 20% of income`,
      action: "Set budget"
    });
  } else if (savingsRate >= 20) {
    insights.push({
      type: "success",
      title: "Great savings rate!",
      description: `You're saving ${savingsRate}% of your income. Keep it up!`,
      action: "View details"
    });
  }

  // Check high interest debt
  if (avgInterest > 15 && totalDebt > 0) {
    insights.push({
      type: "alert",
      title: "High interest debt",
      description: `Average interest rate of ${avgInterest.toFixed(1)}%. Consider debt consolidation`,
      action: "View debts"
    });
  }

  // Investment performance
  if (returnPercentage < 0) {
    insights.push({
      type: "warning",
      title: "Portfolio underperforming",
      description: `Your investments are down ${Math.abs(returnPercentage).toFixed(1)}%`,
      action: "Review portfolio"
    });
  }

  // If no insights, show a default welcome message
  if (insights.length === 0) {
    insights.push({
      type: "suggestion",
      title: "Start tracking",
      description: "Add transactions to get personalized insights",
      action: "Add transaction"
    });
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return TrendingDown;
      case "alert": return AlertTriangle;
      case "success": return PiggyBank;
      default: return Lightbulb;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "warning": return "hsl(var(--warning))";
      case "alert": return "hsl(var(--destructive))";
      case "success": return "hsl(var(--success))";
      default: return "hsl(var(--primary))";
    }
  };

  return (
    <Card variant="glow" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
      
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Personalized recommendations</p>
          </div>
        </div>

        <div className="space-y-3">
          {insights.slice(0, 3).map((insight, index) => {
            const Icon = getIcon(insight.type);
            const color = getColor(insight.type);
            
            return (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            );
          })}
        </div>

        <Button variant="default" className="w-full mt-4">
          <Sparkles className="w-4 h-4 mr-2" />
          Chat with AI Advisor
        </Button>
      </CardContent>
    </Card>
  );
}

import { motion } from "framer-motion";
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, PiggyBank, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialSummary } from "@/hooks/useTransactions";
import { useDebtSummary } from "@/hooks/useDebts";
import { useInvestmentSummary } from "@/hooks/useInvestments";

interface Insight {
  type: "warning" | "suggestion" | "alert" | "success";
  title: string;
  description: string;
  action?: string;
}

export function SmartInsights() {
  const { expenses: totalExpenses, savingsRate, categoryTotals } = useFinancialSummary();
  const { totalDebt, avgInterestRate: avgInterest } = useDebtSummary();
  const { overallChangePercent: returnPercentage } = useInvestmentSummary();
  
  const byCategory = Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
  }));

  const insights: Insight[] = [];

  const highSpendingCategory = byCategory.find(c => c.percentage > 30 && c.category !== 'income');
  if (highSpendingCategory) {
    insights.push({
      type: "warning",
      title: `${highSpendingCategory.category} spending is high`,
      description: `${highSpendingCategory.percentage}% of your budget goes here. Consider setting a limit.`,
      action: "Set budget"
    });
  }

  if (savingsRate < 10 && totalExpenses > 0) {
    insights.push({
      type: "suggestion",
      title: "Boost your savings",
      description: `Saving ${savingsRate}% currently. Try the 50/30/20 rule for better balance.`,
      action: "Learn more"
    });
  } else if (savingsRate >= 20 && totalIncome > 0) {
    insights.push({
      type: "success",
      title: "Amazing savings habit! 🎉",
      description: `You're saving ${savingsRate}% of your income. You're building wealth!`,
    });
  }

  if (avgInterest > 15 && totalDebt > 0) {
    insights.push({
      type: "alert",
      title: "High-interest debt alert",
      description: `${avgInterest.toFixed(1)}% average rate is eating your savings. Prioritize paying this down.`,
      action: "View debts"
    });
  }

  if (returnPercentage < 0) {
    insights.push({
      type: "warning",
      title: "Portfolio needs attention",
      description: `Down ${Math.abs(returnPercentage).toFixed(1)}% - but remember, markets fluctuate!`,
      action: "Review"
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "suggestion",
      title: "Start your journey",
      description: "Add your first transaction to get personalized AI insights.",
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

  const getStyles = (type: string) => {
    switch (type) {
      case "warning": return { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning" };
      case "alert": return { bg: "bg-destructive/10", border: "border-destructive/20", text: "text-destructive" };
      case "success": return { bg: "bg-success/10", border: "border-success/20", text: "text-success" };
      default: return { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="insight-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Smart recommendations</p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-accent animate-pulse" />
      </div>

      <div className="space-y-3">
        {insights.slice(0, 3).map((insight, index) => {
          const Icon = getIcon(insight.type);
          const styles = getStyles(insight.type);
          
          return (
            <motion.div
              key={insight.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`p-3 rounded-xl ${styles.bg} border ${styles.border} group cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${styles.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${styles.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
                </div>
                {insight.action && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <Button variant="outline" className="w-full mt-4 border-accent/30 hover:bg-accent/10 hover:border-accent/50">
        <Sparkles className="w-4 h-4 mr-2 text-accent" />
        Chat with AI Advisor
      </Button>
    </motion.div>
  );
}

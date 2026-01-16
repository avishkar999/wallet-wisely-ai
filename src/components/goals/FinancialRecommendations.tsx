import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Target,
  PiggyBank,
  CreditCard,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useTransactions, useFinancialSummary } from "@/hooks/useTransactions";
import { useDebtSummary } from "@/hooks/useDebts";
import { useEmergencyFundSummary } from "@/hooks/useEmergencyFund";
import { useInvestmentSummary } from "@/hooks/useInvestments";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: "savings" | "debt" | "emergency" | "investment" | "spending";
  action?: string;
  icon: React.ElementType;
}

export function FinancialRecommendations() {
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { income, expenses, savingsRate, categoryTotals } = useFinancialSummary();
  const { totalDebt, avgInterestRate, isLoading: debtLoading } = useDebtSummary();
  const { fund, progress: emergencyProgress, isLoading: emergencyLoading } = useEmergencyFundSummary();
  const { totalInvested, isLoading: investmentLoading } = useInvestmentSummary();

  const isLoading = transactionsLoading || debtLoading || emergencyLoading || investmentLoading;

  // Analyze spending patterns over last 3 months
  const spendingPatterns = (() => {
    const now = new Date();
    const monthlyData: { month: string; total: number; categories: Record<string, number> }[] = [];
    
    for (let i = 0; i < 3; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthLabel = format(monthStart, "MMM yyyy");
      
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.transaction_date);
        return date >= monthStart && date <= monthEnd && t.type === "expense";
      });
      
      const total = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const categories = monthTransactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);
      
      monthlyData.push({ month: monthLabel, total, categories });
    }
    
    // Calculate trends
    const avgSpending = monthlyData.reduce((sum, m) => sum + m.total, 0) / 3;
    const trend = monthlyData.length >= 2 
      ? ((monthlyData[0].total - monthlyData[1].total) / (monthlyData[1].total || 1)) * 100 
      : 0;
    
    // Find highest spending category
    const allCategories: Record<string, number> = {};
    monthlyData.forEach(m => {
      Object.entries(m.categories).forEach(([cat, amount]) => {
        allCategories[cat] = (allCategories[cat] || 0) + amount;
      });
    });
    const topCategory = Object.entries(allCategories).sort((a, b) => b[1] - a[1])[0];
    
    return { monthlyData, avgSpending, trend, topCategory };
  })();

  // Generate personalized recommendations
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Emergency fund recommendation
    if (!fund || emergencyProgress < 100) {
      const monthsOfExpenses = fund && expenses > 0 ? fund.current_amount / expenses : 0;
      if (monthsOfExpenses < 3) {
        recommendations.push({
          id: "emergency-build",
          title: "Build Your Emergency Fund",
          description: `You have ${monthsOfExpenses.toFixed(1)} months of expenses saved. Aim for at least 3-6 months to protect against unexpected events.`,
          impact: "high",
          category: "emergency",
          action: `Save ₹${Math.round((expenses * 3 - (fund?.current_amount || 0)) / 12).toLocaleString()} monthly to reach 3 months`,
          icon: ShieldCheck
        });
      }
    }

    // Savings rate recommendation
    if (savingsRate < 20) {
      recommendations.push({
        id: "improve-savings",
        title: "Boost Your Savings Rate",
        description: `Your current savings rate is ${savingsRate}%. Financial experts recommend saving at least 20% of income.`,
        impact: savingsRate < 10 ? "high" : "medium",
        category: "savings",
        action: `Increase monthly savings by ₹${Math.round((income * 0.2 - (income - expenses))).toLocaleString()}`,
        icon: PiggyBank
      });
    }

    // High-interest debt recommendation
    if (totalDebt > 0 && avgInterestRate > 12) {
      recommendations.push({
        id: "tackle-high-debt",
        title: "Prioritize High-Interest Debt",
        description: `Your average debt interest rate is ${avgInterestRate.toFixed(1)}%. Paying this off faster will save significant money.`,
        impact: "high",
        category: "debt",
        action: "Focus on debt avalanche method - pay highest interest first",
        icon: CreditCard
      });
    }

    // Spending trend recommendation
    if (spendingPatterns.trend > 10) {
      recommendations.push({
        id: "spending-increase",
        title: "Monitor Rising Expenses",
        description: `Your spending increased by ${spendingPatterns.trend.toFixed(0)}% compared to last month. Review if this is planned.`,
        impact: "medium",
        category: "spending",
        action: `Review ${spendingPatterns.topCategory?.[0] || "top"} spending which is your largest category`,
        icon: TrendingUp
      });
    }

    // Top category optimization
    if (spendingPatterns.topCategory && spendingPatterns.topCategory[1] > spendingPatterns.avgSpending * 0.3) {
      const categoryName = spendingPatterns.topCategory[0].charAt(0).toUpperCase() + spendingPatterns.topCategory[0].slice(1);
      recommendations.push({
        id: "category-optimize",
        title: `Optimize ${categoryName} Spending`,
        description: `${categoryName} accounts for over 30% of your monthly expenses. Consider if there are areas to reduce.`,
        impact: "medium",
        category: "spending",
        action: `Set a budget of ₹${Math.round(spendingPatterns.topCategory[1] * 0.8 / 3).toLocaleString()} for ${categoryName}`,
        icon: Target
      });
    }

    // Investment recommendation
    if (totalInvested < income * 6 && savingsRate >= 15) {
      recommendations.push({
        id: "start-investing",
        title: "Grow Your Investments",
        description: "With a healthy savings rate, consider investing more to build long-term wealth through compounding.",
        impact: "medium",
        category: "investment",
        action: "Start a SIP of ₹5,000 in diversified index funds",
        icon: TrendingUp
      });
    }

    // Good habits recognition
    if (savingsRate >= 30) {
      recommendations.push({
        id: "great-saver",
        title: "Excellent Savings Habit!",
        description: `You're saving ${savingsRate}% of your income - that's exceptional! Keep up the great work.`,
        impact: "low",
        category: "savings",
        icon: CheckCircle2
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "savings": return PiggyBank;
      case "debt": return CreditCard;
      case "emergency": return ShieldCheck;
      case "investment": return TrendingUp;
      case "spending": return Target;
      default: return Lightbulb;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Smart Recommendations</h3>
          <p className="text-sm text-muted-foreground">Personalized tips based on your spending patterns</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly Avg Spending</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(spendingPatterns.avgSpending)}</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Spending Trend</p>
            <p className={`text-lg font-semibold flex items-center gap-1 ${spendingPatterns.trend > 0 ? "text-destructive" : "text-success"}`}>
              {spendingPatterns.trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(spendingPatterns.trend).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Savings Rate</p>
            <p className={`text-lg font-semibold ${savingsRate >= 20 ? "text-success" : "text-warning"}`}>{savingsRate}%</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Top Category</p>
            <p className="text-lg font-semibold text-foreground capitalize">{spendingPatterns.topCategory?.[0] || "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => {
            const Icon = rec.icon;
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        rec.impact === "high" ? "bg-destructive/20" : 
                        rec.impact === "medium" ? "bg-warning/20" : "bg-success/20"
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          rec.impact === "high" ? "text-destructive" : 
                          rec.impact === "medium" ? "text-warning" : "text-success"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">{rec.title}</h4>
                          <Badge variant="outline" className={getImpactColor(rec.impact)}>
                            {rec.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        {rec.action && (
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <ArrowRight className="w-4 h-4" />
                            <span className="font-medium">{rec.action}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <h4 className="font-medium text-foreground mb-1">You're on Track!</h4>
              <p className="text-sm text-muted-foreground">
                Keep up the great work. Your finances are looking healthy.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

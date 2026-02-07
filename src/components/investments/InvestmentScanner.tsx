import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3, 
  Plus,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Edit
} from "lucide-react";
import { useInvestmentSummary, useInvestments } from "@/hooks/useInvestments";
import { EmptyState } from "@/components/ui/empty-state";
import { AddInvestmentDialog } from "@/components/forms/AddInvestmentDialog";
import { EditInvestmentDialog } from "@/components/forms/EditInvestmentDialog";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { PortfolioRebalancing } from "./PortfolioRebalancing";
import { BenchmarkComparison } from "./BenchmarkComparison";

type Investment = Tables<"investments">;

export function InvestmentScanner() {
  const { data: investments, isLoading } = useInvestments();
  const { totalCurrentValue: totalValue, totalInvested, totalGain: totalReturn, overallChangePercent: returnPercentage, byType: byTypeRecord } = useInvestmentSummary();
  
  // Convert byType record to array format
  const byType = Object.entries(byTypeRecord).map(([type, data]) => ({
    type,
    value: data.current,
    invested: data.invested,
    count: data.count
  }));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPerformanceCategory = (returnPct: number) => {
    if (returnPct >= 10) return "good";
    if (returnPct >= 0) return "average";
    return "poor";
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "good":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">
            <CheckCircle className="w-3 h-3" />
            Good
          </span>
        );
      case "poor":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            Review
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">
            Average
          </span>
        );
    }
  };

  const typeColors: Record<string, string> = {
    mutual_fund: "hsl(var(--primary))",
    stock: "hsl(var(--success))",
    fixed_deposit: "hsl(var(--warning))",
    recurring_deposit: "hsl(var(--accent))",
    crypto: "hsl(280 70% 50%)",
    gold: "hsl(38 92% 50%)",
    bonds: "hsl(200 70% 50%)",
    other: "hsl(var(--muted-foreground))",
  };

  const typeLabels: Record<string, string> = {
    mutual_fund: "Mutual Funds",
    stock: "Stocks",
    fixed_deposit: "Fixed Deposits",
    recurring_deposit: "Recurring Deposits",
    crypto: "Crypto",
    gold: "Gold",
    bonds: "Bonds",
    other: "Other",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!investments || investments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Investments</h1>
            <p className="text-sm text-muted-foreground">Track and analyze your portfolio</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Investment
          </Button>
        </div>
        
        <EmptyState
          icon={TrendingUp}
          title="No investments yet"
          description="Start tracking your portfolio by adding your first investment."
          action={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Investment
            </Button>
          }
        />
        
        <AddInvestmentDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      </div>
    );
  }

  const mutualFunds = investments.filter(i => i.type === "mutual_fund");
  const stocks = investments.filter(i => i.type === "stock");

  return (
    <div className="space-y-6">
      {/* Net Worth Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="glow" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-success/10" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
                  <div className={`flex items-center gap-1 ${returnPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {returnPercentage >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="text-sm font-semibold">{returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalReturn >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(totalReturn))} {totalReturn >= 0 ? 'profit' : 'loss'}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Asset Allocation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {byType.map((asset, index) => (
          <motion.div
            key={asset.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="elevated" className="hover:shadow-glow transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div 
                  className="w-3 h-3 rounded-full mb-2"
                  style={{ backgroundColor: typeColors[asset.type] || typeColors.other }}
                />
                <p className="text-xs text-muted-foreground">{typeLabels[asset.type] || asset.type}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(asset.value)}</p>
                <p className="text-xs text-muted-foreground">
                  {totalValue > 0 ? Math.round((asset.value / totalValue) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Mutual Funds */}
      {mutualFunds.length > 0 && (
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Mutual Funds
            </CardTitle>
            <span className="text-sm text-muted-foreground">{mutualFunds.length} funds</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {mutualFunds.map((fund, index) => {
              const returnPct = fund.invested_amount > 0 
                ? ((fund.current_value - fund.invested_amount) / fund.invested_amount) * 100 
                : 0;
              
              return (
                <motion.div
                  key={fund.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                  onClick={() => setSelectedInvestment(fund)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{fund.name}</p>
                      {getCategoryBadge(getPerformanceCategory(returnPct))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fund.units ? `${fund.units} units` : ''} {fund.nav ? `@ NAV ₹${fund.nav.toFixed(2)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{formatCurrency(fund.current_value)}</p>
                      <p className={`text-xs font-medium flex items-center justify-end gap-1 ${
                        returnPct >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {returnPct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvestment(fund);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Stocks */}
      {stocks.length > 0 && (
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Stocks
            </CardTitle>
            <span className="text-sm text-muted-foreground">{stocks.length} stocks</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stocks.map((stock, index) => {
                const returnPct = stock.invested_amount > 0 
                  ? ((stock.current_value - stock.invested_amount) / stock.invested_amount) * 100 
                  : 0;
                
                return (
                  <motion.div
                    key={stock.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                    onClick={() => setSelectedInvestment(stock)}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground">{stock.name}</p>
                        {getCategoryBadge(getPerformanceCategory(returnPct))}
                      </div>
                      <p className="text-xs text-muted-foreground">{stock.units ? `${stock.units} shares` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-base font-bold text-foreground">{formatCurrency(stock.current_value)}</p>
                        <p className={`text-xs font-medium ${returnPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvestment(stock);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations - only show if there are investments */}
      {investments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >

       {/* Portfolio Rebalancing */}
       <PortfolioRebalancing />

       {/* Benchmark Comparison */}
       <BenchmarkComparison />

          <Card variant="glow" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold text-foreground">AI Investment Insights</h3>
              </div>
              
              <div className="space-y-3">
                {returnPercentage >= 0 ? (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-success/10">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Your portfolio is performing well</p>
                      <p className="text-xs text-muted-foreground">Overall return of {returnPercentage.toFixed(1)}% on your investments</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Portfolio needs attention</p>
                      <p className="text-xs text-muted-foreground">Consider reviewing underperforming investments</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <AddInvestmentDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditInvestmentDialog
        open={!!selectedInvestment}
        onOpenChange={(open) => !open && setSelectedInvestment(null)}
        investment={selectedInvestment}
      />
    </div>
  );
}

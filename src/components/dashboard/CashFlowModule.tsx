import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, ArrowDownRight, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useInvestments } from "@/hooks/useInvestments";
import { useDebts } from "@/hooks/useDebts";

export function CashFlowModule() {
  const { currentSelectedMonth, formatMoney } = useCoinKeeper();
  const { data: transactions = [] } = useTransactions();
  const { data: investments = [] } = useInvestments();
  const { data: debts = [] } = useDebts();

  const cashFlow = useMemo(() => {
    const monthTx = transactions.filter((t) =>
      t.transaction_date?.startsWith(currentSelectedMonth)
    );

    const totalIncome = monthTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpenses = monthTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Approximate monthly investment contributions & debt EMIs
    const monthlyInvestments = investments.reduce(
      (sum, i) => sum + Math.round(Number(i.invested_amount || 0) * 0.05),
      0
    );
    const monthlyDebtPayments = debts.reduce(
      (sum, d) => sum + Number(d.minimum_payment || 0),
      0
    );

    const netCashFlow = totalIncome - totalExpenses - monthlyInvestments - monthlyDebtPayments;

    return {
      totalIncome,
      totalExpenses,
      monthlyInvestments,
      monthlyDebtPayments,
      netCashFlow,
      isPositive: netCashFlow >= 0,
    };
  }, [transactions, currentSelectedMonth, investments, debts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-premium rounded-2xl p-5 sm:p-6 border border-border/40 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Net Cash Flow
          </h3>
        </div>
        <span
          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
            cashFlow.isPositive
              ? "bg-success/15 text-success border border-success/30"
              : "bg-destructive/15 text-destructive border border-destructive/30"
          }`}
        >
          {cashFlow.isPositive ? "+" : ""}
          {formatMoney(cashFlow.netCashFlow)}
        </span>
      </div>

      {/* Cash Flow Equation Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-card/40 border border-border/30 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
            Total Inflow
          </span>
          <span className="text-base font-bold font-mono text-accent mt-0.5 block">
            {formatMoney(cashFlow.totalIncome)}
          </span>
          <span className="text-[10px] text-muted-foreground">Salary & earnings</span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
            − Living Outflows
          </span>
          <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
            {formatMoney(cashFlow.totalExpenses)}
          </span>
          <span className="text-[10px] text-muted-foreground">Direct expenses</span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
            − Investments
          </span>
          <span className="text-base font-bold font-mono text-primary mt-0.5 block">
            {formatMoney(cashFlow.monthlyInvestments)}
          </span>
          <span className="text-[10px] text-muted-foreground">SIP & wealth allocations</span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
            − Debt Service
          </span>
          <span className="text-base font-bold font-mono text-destructive mt-0.5 block">
            {formatMoney(cashFlow.monthlyDebtPayments)}
          </span>
          <span className="text-[10px] text-muted-foreground">EMIs & repayments</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30 text-xs text-muted-foreground">
        <span>
          Calculated for {currentSelectedMonth} based on real transaction activity
        </span>
        <span className="font-semibold text-foreground">
          {cashFlow.isPositive
            ? "Surplus available for compounding"
            : "Deficit pace requires attention"}
        </span>
      </div>
    </motion.div>
  );
}

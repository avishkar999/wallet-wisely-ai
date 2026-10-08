import { useMemo } from "react";
import { motion } from "framer-motion";
import { Landmark, TrendingUp, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useInvestments } from "@/hooks/useInvestments";
import { useDebts } from "@/hooks/useDebts";

export function NetWorthModule() {
  const { formatMoney } = useCoinKeeper();
  const { data: accounts = [] } = useAccounts();
  const { data: investments = [] } = useInvestments();
  const { data: debts = [] } = useDebts();

  const { totalAssets, totalLiabilities, netWorth, liquidCash, investmentAssets } = useMemo(() => {
    const liquidCash = accounts
      .filter((a) => a.is_active && Number(a.balance) > 0)
      .reduce((sum, a) => sum + Number(a.balance), 0);

    const creditDue = accounts
      .filter((a) => a.is_active && Number(a.balance) < 0)
      .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);

    const investmentAssets = investments.reduce(
      (sum, i) => sum + Number(i.current_value || i.invested_amount || 0),
      0
    );

    const totalDebts = debts.reduce(
      (sum, d) => sum + Number(d.outstanding_amount || 0),
      0
    );

    const totalAssets = liquidCash + investmentAssets;
    const totalLiabilities = creditDue + totalDebts;
    const netWorth = totalAssets - totalLiabilities;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidCash,
      investmentAssets,
    };
  }, [accounts, investments, debts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-premium rounded-2xl p-5 sm:p-6 border border-border/40 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-success" />
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Total Net Worth
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total Assets minus all Liabilities and outstanding obligations
          </p>
        </div>

        <div className="text-right">
          <span className="text-xl sm:text-2xl font-extrabold font-mono text-success block">
            {formatMoney(netWorth)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium">
            Personal Equity
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-card/40 border border-border/30 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
            Total Assets
          </span>
          <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
            {formatMoney(totalAssets)}
          </span>
          <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
            <div>Liquid Accounts: <strong className="font-mono text-foreground">{formatMoney(liquidCash)}</strong></div>
            <div>Investments: <strong className="font-mono text-foreground">{formatMoney(investmentAssets)}</strong></div>
          </div>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
            Total Liabilities
          </span>
          <span className="text-base font-bold font-mono text-destructive mt-0.5 block">
            {formatMoney(totalLiabilities)}
          </span>
          <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
            <div>Debts & Loans: <strong className="font-mono text-destructive">{formatMoney(totalLiabilities)}</strong></div>
            <div>Debt-to-Asset: <strong className="font-mono text-foreground">{totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0}%</strong></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

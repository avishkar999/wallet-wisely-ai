import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Archive,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Percent,
  Receipt,
  Tag,
  Loader2,
} from "lucide-react";
import { useMonthlySummaries, MonthlySummary } from "@/hooks/useMonthlySummaries";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const label = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—";

function Stat({
  icon: Icon,
  title,
  value,
  tone = "text-foreground",
}: {
  icon: typeof Wallet;
  title: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/40 border border-border/50 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MonthCard({ summary, index }: { summary: MonthlySummary; index: number }) {
  const [open, setOpen] = useState(false);
  const breakdown = (summary.category_breakdown ?? {}) as Record<string, number>;
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="insight-card rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Archive className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {format(parseISO(summary.month), "MMMM yyyy")}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {summary.transaction_count} transactions · {Number(summary.savings_rate).toFixed(1)}% saved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-success">+{fmt(summary.total_income)}</p>
            <p className="text-xs text-destructive">-{fmt(summary.total_expenses)}</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat icon={TrendingUp} title="Income" value={fmt(summary.total_income)} tone="text-success" />
                <Stat icon={TrendingDown} title="Expenses" value={fmt(summary.total_expenses)} tone="text-destructive" />
                <Stat icon={PiggyBank} title="Savings" value={fmt(summary.total_savings)} />
                <Stat
                  icon={Wallet}
                  title="Remaining"
                  value={fmt(summary.remaining_balance)}
                  tone={Number(summary.remaining_balance) < 0 ? "text-destructive" : "text-foreground"}
                />
                <Stat icon={Percent} title="Savings rate" value={`${Number(summary.savings_rate).toFixed(1)}%`} />
                <Stat icon={Tag} title="Top category" value={label(summary.highest_category)} />
                <Stat icon={Wallet} title="Top spend" value={fmt(summary.highest_category_amount)} />
                <Stat icon={Receipt} title="Transactions" value={String(summary.transaction_count)} />
              </div>

              {sorted.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Category breakdown</p>
                  {sorted.map(([cat, amount]) => {
                    const pct =
                      Number(summary.total_expenses) > 0
                        ? (amount / Number(summary.total_expenses)) * 100
                        : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{label(cat)}</span>
                          <span className="text-muted-foreground">
                            {fmt(amount)} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MonthlyHistory() {
  const { data: summaries, isLoading } = useMonthlySummaries();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
          <Archive className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Monthly History</h2>
          <p className="text-xs text-muted-foreground">
            Completed months are archived automatically — nothing is ever deleted.
          </p>
        </div>
      </div>

      {!summaries || summaries.length === 0 ? (
        <div className="insight-card rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Archive className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No archived months yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            When this month ends, its totals will be archived here so you can review them anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s, i) => (
            <MonthCard key={s.id} summary={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Dot,
} from "recharts";
import {
  Flame,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Receipt,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { format, subDays, startOfDay, parseISO, isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DailySpendingPatternsChartProps {
  className?: string;
  showCardHeader?: boolean;
}

interface DayDataPoint {
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // "1 Nov"
  fullDate: string; // "Sunday, 1 Nov 2026"
  weekday: string; // "Sun"
  spending: number;
  transactionCount: number;
  transactions: {
    id: string;
    name: string;
    amount: number;
    category: string;
    type: string;
  }[];
  isSpike: boolean;
  spikeRatio: number;
}

export function DailySpendingPatternsChart({
  className = "",
  showCardHeader = true,
}: DailySpendingPatternsChartProps) {
  const { data: allTransactions = [], isLoading } = useTransactions();
  const [highlightSpikesOnly, setHighlightSpikesOnly] = useState(false);
  const [showThresholdLine, setShowThresholdLine] = useState(true);

  // Filter to expense transactions only
  const expenseTransactions = useMemo(() => {
    return allTransactions.filter(
      (t) => t.type === "expense" && t.transaction_date
    );
  }, [allTransactions]);

  // Compute 30-day continuous timeline & spike metrics
  const { chartData, metrics } = useMemo(() => {
    const today = startOfDay(new Date());
    const days: DayDataPoint[] = [];

    // Build exactly 30 days from 29 days ago to today
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const dateKey = format(d, "yyyy-MM-dd");

      const dayTx = expenseTransactions.filter((t) => {
        return t.transaction_date?.startsWith(dateKey);
      });

      const spending = dayTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      days.push({
        dateKey,
        dayLabel: format(d, "d MMM"),
        fullDate: format(d, "EEE, d MMM yyyy"),
        weekday: format(d, "EEE"),
        spending: Math.round(spending),
        transactionCount: dayTx.length,
        transactions: dayTx.map((t) => ({
          id: t.id,
          name: t.name,
          amount: Number(t.amount),
          category: t.category,
          type: t.type,
        })),
        isSpike: false,
        spikeRatio: 1,
      });
    }

    // Calculate baseline statistical metrics for spike detection
    const totalSpending = days.reduce((acc, d) => acc + d.spending, 0);
    const activeDays = days.filter((d) => d.spending > 0);
    const dailyAverage = Math.round(totalSpending / 30);
    const activeAverage =
      activeDays.length > 0 ? Math.round(totalSpending / activeDays.length) : 0;

    // Standard deviation for meaningful spike threshold
    const variance =
      days.reduce((acc, d) => acc + Math.pow(d.spending - dailyAverage, 2), 0) /
      30;
    const stdDev = Math.sqrt(variance);

    // Spike threshold: at least 1.6x daily average or 1 stdDev above average
    const spikeThreshold = Math.max(
      dailyAverage * 1.6,
      dailyAverage + Math.max(stdDev, 300)
    );

    // Identify spike days
    let maxSpikeDay: DayDataPoint | null = null;
    let spikeCount = 0;

    days.forEach((day) => {
      if (day.spending >= spikeThreshold && day.spending > 0) {
        day.isSpike = true;
        day.spikeRatio = dailyAverage > 0 ? Number((day.spending / dailyAverage).toFixed(1)) : 2;
        spikeCount++;
        if (!maxSpikeDay || day.spending > maxSpikeDay.spending) {
          maxSpikeDay = day;
        }
      }
    });

    return {
      chartData: days,
      metrics: {
        totalSpending,
        dailyAverage,
        activeAverage,
        spikeThreshold: Math.round(spikeThreshold),
        spikeCount,
        maxSpikeDay,
        activeDaysCount: activeDays.length,
      },
    };
  }, [expenseTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatCompact = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  // Custom Interactive Tooltip highlighting spikes and transactions
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayDataPoint = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-2xl border border-border/70 rounded-2xl p-4 shadow-2xl min-w-[240px] max-w-[280px] text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div>
              <span className="font-bold text-foreground text-sm block">
                {data.fullDate}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {data.transactionCount} transaction{data.transactionCount !== 1 ? "s" : ""}
              </span>
            </div>
            {data.isSpike && (
              <Badge
                variant="destructive"
                className="text-[10px] px-2 py-0.5 font-bold uppercase gap-1 bg-destructive text-destructive-foreground animate-pulse"
              >
                <Flame className="w-3 h-3" /> Spike ({data.spikeRatio}x)
              </Badge>
            )}
          </div>

          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Daily Outflow:</span>
              <span className="font-bold text-base text-foreground font-mono">
                {formatCurrency(data.spending)}
              </span>
            </div>
            {data.spending > 0 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Vs 30-Day Avg:</span>
                <span
                  className={
                    data.spending > metrics.dailyAverage
                      ? "text-destructive font-medium"
                      : "text-success font-medium"
                  }
                >
                  {data.spending > metrics.dailyAverage
                    ? `+${Math.round(((data.spending - metrics.dailyAverage) / (metrics.dailyAverage || 1)) * 100)}%`
                    : `-${Math.round(((metrics.dailyAverage - data.spending) / (metrics.dailyAverage || 1)) * 100)}%`}
                </span>
              </div>
            )}
          </div>

          {/* Transactions on this day */}
          {data.transactions.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Activity Breakdown
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {data.transactions.slice(0, 4).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-[11px] bg-secondary/40 p-1.5 rounded-lg"
                  >
                    <span className="truncate max-w-[130px] font-medium text-foreground">
                      {tx.name}
                    </span>
                    <span className="font-mono text-foreground font-semibold">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
                {data.transactions.length > 4 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-0.5">
                    +{data.transactions.length - 4} more transactions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Dot renderer that highlights spike days with red animated markers
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;

    if (payload.isSpike) {
      return (
        <g key={`spike-dot-${payload.dateKey}`}>
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill="hsl(var(--destructive))"
            opacity={0.3}
            className="animate-ping"
          />
          <circle
            cx={cx}
            cy={cy}
            r={5.5}
            fill="hsl(var(--destructive))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
        </g>
      );
    }

    if (payload.spending > 0 && !highlightSpikesOnly) {
      return (
        <circle
          key={`dot-${payload.dateKey}`}
          cx={cx}
          cy={cy}
          r={2.5}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--card))"
          strokeWidth={1}
        />
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-6 min-h-[380px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Calculating daily spending patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`glass-premium rounded-2xl p-5 sm:p-6 border border-border/40 shadow-card ${className}`}
    >
      {/* Header & Controls */}
      {showCardHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Flame className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>Daily Spending Patterns (Last 30 Days)</span>
                  {metrics.spikeCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-2 font-semibold">
                      {metrics.spikeCount} Spike{metrics.spikeCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualizing day-by-day consumer outflows with automated activity spike detection
                </p>
              </div>
            </div>
          </div>

          {/* Interactive view toggles */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-secondary/70 p-1 rounded-xl border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setHighlightSpikesOnly(false)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                !highlightSpikesOnly
                  ? "bg-card text-foreground shadow-sm border border-border/40 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Days
            </button>
            <button
              type="button"
              onClick={() => setHighlightSpikesOnly(true)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                highlightSpikesOnly
                  ? "bg-card text-destructive shadow-sm border border-border/40 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-destructive" />
              Spikes Only
            </button>
            <button
              type="button"
              onClick={() => setShowThresholdLine(!showThresholdLine)}
              title="Toggle spike threshold reference line"
              className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-all ${
                showThresholdLine
                  ? "text-warning bg-warning/10 border border-warning/20 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Threshold
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 p-3.5 sm:p-4 rounded-xl bg-card/40 border border-border/30">
        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            30-Day Outflow
          </span>
          <span className="text-base sm:text-xl font-bold text-foreground font-mono mt-0.5 block">
            {formatCurrency(metrics.totalSpending)}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            Over {metrics.activeDaysCount} active days
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Daily Average
          </span>
          <span className="text-base sm:text-xl font-bold text-primary font-mono mt-0.5 block">
            {formatCurrency(metrics.dailyAverage)}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            Active days: {formatCurrency(metrics.activeAverage)}/d
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Spike Threshold
          </span>
          <span className="text-base sm:text-xl font-bold text-warning font-mono mt-0.5 block">
            {formatCurrency(metrics.spikeThreshold)}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            Baseline flag trigger
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-medium">
            Highest Spike Day
          </span>
          <span className="text-base sm:text-xl font-bold text-destructive font-mono mt-0.5 block truncate">
            {metrics.maxSpikeDay
              ? formatCurrency(metrics.maxSpikeDay.spending)
              : "No Spikes"}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
            {metrics.maxSpikeDay
              ? `${metrics.maxSpikeDay.dayLabel} (${metrics.maxSpikeDay.spikeRatio}x avg)`
              : "Calm spending pattern"}
          </span>
        </div>
      </div>

      {/* Recharts Daily Line Chart */}
      <div className="w-full h-[270px] sm:h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 16, left: -14, bottom: 6 }}
          >
            <defs>
              <linearGradient id="dailySpendingStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(168, 60%, 55%)" />
                <stop offset="70%" stopColor="hsl(185, 55%, 50%)" />
                <stop offset="100%" stopColor="hsl(200, 65%, 55%)" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(228, 20%, 14%)"
              vertical={false}
              opacity={0.65}
            />

            <XAxis
              dataKey="dayLabel"
              stroke="hsl(220, 15%, 55%)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "hsl(228, 20%, 14%)" }}
              dy={8}
              interval={4} // show label every 4-5 days for clean spacing
            />

            <YAxis
              stroke="hsl(220, 15%, 55%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompact(v)}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Daily Average Reference Line */}
            {metrics.dailyAverage > 0 && (
              <ReferenceLine
                y={metrics.dailyAverage}
                stroke="hsl(168, 60%, 55%)"
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.6}
                label={{
                  value: `Avg: ${formatCompact(metrics.dailyAverage)}`,
                  fill: "hsl(168, 60%, 55%)",
                  fontSize: 10,
                  position: "insideTopLeft",
                  dy: -6,
                }}
              />
            )}

            {/* Spike Threshold Reference Line */}
            {showThresholdLine && metrics.spikeThreshold > 0 && (
              <ReferenceLine
                y={metrics.spikeThreshold}
                stroke="hsl(0, 65%, 55%)"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                opacity={0.8}
                label={{
                  value: `Spike Threshold: ${formatCompact(metrics.spikeThreshold)}`,
                  fill: "hsl(0, 65%, 55%)",
                  fontSize: 10,
                  position: "insideTopRight",
                  dy: -8,
                }}
              />
            )}

            {/* Daily Spending Line */}
            <Line
              type="monotone"
              dataKey="spending"
              name="Daily Spending"
              stroke="url(#dailySpendingStroke)"
              strokeWidth={2.75}
              dot={renderCustomDot}
              activeDot={{
                r: 6.5,
                fill: "hsl(168, 60%, 55%)",
                stroke: "hsl(228, 33%, 4%)",
                strokeWidth: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Chart Legend & Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 mt-2 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 rounded-full bg-primary inline-block" />
            <span className="text-foreground font-medium">Daily Outflow</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block ring-2 ring-destructive/30" />
            <span className="text-destructive font-medium">Spike Day (&gt;Threshold)</span>
          </div>

          {showThresholdLine && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-destructive inline-block" />
              <span className="text-destructive/80 font-mono text-[11px]">
                Spike Alert ({formatCompact(metrics.spikeThreshold)})
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
          {metrics.spikeCount > 0 ? (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {metrics.spikeCount} day{metrics.spikeCount > 1 ? "s" : ""} exceeded ordinary spending bounds
            </span>
          ) : (
            <span className="text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Consistent daily spending with zero unusual spikes
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

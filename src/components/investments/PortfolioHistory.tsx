import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { usePortfolioSnapshots } from "@/hooks/usePortfolioSnapshots";
import { format, subDays, subMonths, parseISO, isAfter } from "date-fns";

type TimeRange = "1W" | "1M" | "3M" | "6M" | "ALL";

export function PortfolioHistory() {
  const { data: snapshots = [], isLoading } = usePortfolioSnapshots();
  const [range, setRange] = useState<TimeRange>("1M");

  const filterByRange = () => {
    const now = new Date();
    let cutoff: Date;
    switch (range) {
      case "1W": cutoff = subDays(now, 7); break;
      case "1M": cutoff = subMonths(now, 1); break;
      case "3M": cutoff = subMonths(now, 3); break;
      case "6M": cutoff = subMonths(now, 6); break;
      default: return snapshots;
    }
    return snapshots.filter((s) => isAfter(parseISO(s.snapshot_date), cutoff));
  };

  const filtered = filterByRange();

  const chartData = filtered.map((s) => ({
    date: format(parseISO(s.snapshot_date), "dd MMM"),
    fullDate: s.snapshot_date,
    invested: Number(s.total_invested),
    value: Number(s.total_current_value),
    gain: Number(s.total_gain),
  }));

  const latestGain = chartData.length > 0 ? chartData[chartData.length - 1].gain : 0;
  const firstValue = chartData.length > 1 ? chartData[0].value : 0;
  const lastValue = chartData.length > 1 ? chartData[chartData.length - 1].value : 0;
  const periodChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading portfolio history...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Portfolio Performance</CardTitle>
            </div>
            <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
              <TabsList className="h-8">
                {(["1W", "1M", "3M", "6M", "ALL"] as TimeRange[]).map((r) => (
                  <TabsTrigger key={r} value={r} className="text-xs px-2.5 h-6">
                    {r}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {chartData.length > 1 && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                {periodChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-semibold ${periodChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {periodChange >= 0 ? "+" : ""}{periodChange.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">in this period</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{chartData.length} data points</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {chartData.length < 2 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-2">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Portfolio history will appear here as daily snapshots are recorded.
              </p>
              <p className="text-muted-foreground/60 text-xs">
                {chartData.length === 1
                  ? "First snapshot recorded today! Come back tomorrow for trends."
                  : "Add investments to start tracking."}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="invested"
                  name="Invested"
                  stroke="hsl(var(--muted-foreground))"
                  fill="url(#colorInvested)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Current Value"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorValue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

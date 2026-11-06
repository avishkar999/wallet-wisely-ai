import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import { format, subMonths, parseISO, startOfMonth } from "date-fns";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { getIncomeCategoryConfig } from "@/types/income";
import { ArrowDownLeft, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";

type Transaction = Tables<"transactions">;

interface IncomeOverviewChartsProps {
  transactions: Transaction[];
}

export function IncomeOverviewCharts({ transactions }: IncomeOverviewChartsProps) {
  const { formatMoney, profile } = useCoinKeeper();
  const [activeChartTab, setActiveChartTab] = useState<"comparison" | "trends" | "sources">("comparison");

  // Generate 6-month historical timeline data
  const monthlyTimelineData = useMemo(() => {
    const monthsMap: Record<
      string,
      {
        monthKey: string;
        monthLabel: string;
        income: number;
        expenses: number;
        netSavings: number;
        savingsRate: number;
      }
    > = {};

    // Generate past 6 months including current
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM yyyy");
      monthsMap[key] = {
        monthKey: key,
        monthLabel: label,
        income: 0,
        expenses: 0,
        netSavings: 0,
        savingsRate: 0,
      };
    }

    transactions.forEach((tx) => {
      const txDate = tx.transaction_date || (tx as any).created_at || "";
      const monthKey = txDate.slice(0, 7);
      if (monthsMap[monthKey]) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === "income") {
          monthsMap[monthKey].income += amt;
        } else if (tx.type === "expense") {
          monthsMap[monthKey].expenses += amt;
        }
      }
    });

    // Compute net savings and cumulative growth
    let runningSavings = 0;
    return Object.values(monthsMap).map((m) => {
      const net = m.income - m.expenses;
      runningSavings += net;
      const rate = m.income > 0 ? Math.round((net / m.income) * 100) : 0;
      return {
        ...m,
        netSavings: net,
        cumulativeSavings: runningSavings,
        savingsRate: Math.max(0, rate),
      };
    });
  }, [transactions]);

  // Income category distribution (all-time or recent)
  const categoryDistribution = useMemo(() => {
    const catMap: Record<string, { name: string; amount: number; color: string }> = {};

    const incomeTxs = transactions.filter((t) => t.type === "income");

    incomeTxs.forEach((tx) => {
      const cfg = getIncomeCategoryConfig(tx.category);
      const amt = Number(tx.amount) || 0;
      if (!catMap[cfg.name]) {
        catMap[cfg.name] = {
          name: cfg.name,
          amount: 0,
          color: cfg.color,
        };
      }
      catMap[cfg.name].amount += amt;
    });

    const totalIncome = Object.values(catMap).reduce((s, c) => s + c.amount, 0);

    return Object.values(catMap)
      .map((c) => ({
        ...c,
        percentage: totalIncome > 0 ? Math.round((c.amount / totalIncome) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const hasAnyIncome = useMemo(() => {
    return transactions.some((t) => t.type === "income");
  }, [transactions]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-md p-3 rounded-xl border border-border shadow-elevated text-xs space-y-1.5">
          <p className="font-bold text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-foreground">
                {entry.name.includes("Rate") ? `${entry.value}%` : formatMoney(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Visual Financial Overview & Inflow Analytics
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Dynamic multi-period comparison of income, expenses, and savings growth.
            </CardDescription>
          </div>

          <Tabs
            value={activeChartTab}
            onValueChange={(v) => setActiveChartTab(v as any)}
            className="w-auto"
          >
            <TabsList className="bg-secondary/60 h-8 p-1">
              <TabsTrigger value="comparison" className="text-[11px] h-6 px-2.5 gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>In vs Out</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="text-[11px] h-6 px-2.5 gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Savings Growth</span>
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-[11px] h-6 px-2.5 gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>Income Mix</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        {!hasAnyIncome ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-border/60 rounded-xl">
            <ArrowDownLeft className="w-8 h-8 mx-auto text-emerald-500/40" />
            <p className="font-semibold text-foreground">No Income Records Available</p>
            <p className="max-w-xs mx-auto">
              Add your first salary, freelance invoice, or investment return to unlock comparative charts and savings rate tracking.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            {activeChartTab === "comparison" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Bar
                    name="Total Income"
                    dataKey="income"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    name="Total Expenses"
                    dataKey="expenses"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    name="Net Savings"
                    dataKey="netSavings"
                    fill="#0ea5e9"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChartTab === "trends" && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Area
                    type="monotone"
                    name="Monthly Income"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    name="Net Savings Growth"
                    dataKey="cumulativeSavings"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#savingsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeChartTab === "sources" && (
              <div className="grid grid-cols-1 md:grid-cols-2 h-full items-center gap-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={categoryDistribution}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-2 text-xs">
                  {categoryDistribution.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-foreground truncate">{cat.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-foreground block">
                          {formatMoney(cat.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

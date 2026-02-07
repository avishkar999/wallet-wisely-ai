import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { useInvestmentSummary } from "@/hooks/useInvestments";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Benchmark {
  id: string;
  name: string;
  shortName: string;
  annualReturn: number;
  description: string;
  color: string;
}

const BENCHMARKS: Benchmark[] = [
  {
    id: "nifty50",
    name: "NIFTY 50",
    shortName: "NIFTY",
    annualReturn: 12.5,
    description: "Top 50 Indian companies by market cap",
    color: "hsl(var(--primary))",
  },
  {
    id: "sensex",
    name: "BSE SENSEX",
    shortName: "SENSEX",
    annualReturn: 11.8,
    description: "30 largest BSE listed companies",
    color: "hsl(var(--warning))",
  },
  {
    id: "nifty_next50",
    name: "NIFTY Next 50",
    shortName: "NN50",
    annualReturn: 14.2,
    description: "Companies 51-100 by market cap",
    color: "hsl(var(--accent))",
  },
  {
    id: "nifty_midcap",
    name: "NIFTY Midcap 150",
    shortName: "MID150",
    annualReturn: 15.5,
    description: "Top 150 midcap companies",
    color: "hsl(var(--success))",
  },
  {
    id: "gold",
    name: "Gold (MCX)",
    shortName: "GOLD",
    annualReturn: 8.5,
    description: "Gold commodity returns",
    color: "hsl(38 92% 50%)",
  },
  {
    id: "fd",
    name: "Bank FD",
    shortName: "FD",
    annualReturn: 7.0,
    description: "Average bank fixed deposit rate",
    color: "hsl(var(--muted-foreground))",
  },
];

export function BenchmarkComparison() {
  const { totalCurrentValue, totalInvested, overallChangePercent } = useInvestmentSummary();
  const [selectedBenchmark, setSelectedBenchmark] = useState("nifty50");
  const [timeframe, setTimeframe] = useState("1y");

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

  const benchmark = BENCHMARKS.find((b) => b.id === selectedBenchmark) || BENCHMARKS[0];

  // Adjust benchmark return based on timeframe
  const timeframeMultiplier = useMemo(() => {
    switch (timeframe) {
      case "3m": return 0.25;
      case "6m": return 0.5;
      case "1y": return 1;
      case "3y": return 3;
      case "5y": return 5;
      default: return 1;
    }
  }, [timeframe]);

  const benchmarkReturn = benchmark.annualReturn * timeframeMultiplier;
  const portfolioReturn = overallChangePercent * timeframeMultiplier;
  const outperformance = portfolioReturn - benchmarkReturn;

  // Calculate what portfolio would be worth if invested in benchmark
  const benchmarkValue = totalInvested * (1 + benchmarkReturn / 100);
  const opportunityCost = totalCurrentValue - benchmarkValue;

  // Chart data comparing portfolio vs all benchmarks
  const chartData = useMemo(() => {
    const data: Array<{ name: string; return: number; isPortfolio: boolean; color: string }> = [
      {
        name: "Your Portfolio",
        return: portfolioReturn,
        isPortfolio: true,
        color: "hsl(var(--primary))",
      },
      ...BENCHMARKS.map((b) => ({
        name: b.shortName,
        return: b.annualReturn * timeframeMultiplier,
        isPortfolio: false,
        color: b.color,
      })),
    ];
    return data.sort((a, b) => b.return - a.return);
  }, [portfolioReturn, timeframeMultiplier]);

  const portfolioRank = chartData.findIndex((d) => d.isPortfolio) + 1;

  const chartConfig = {
    return: {
      label: "Return %",
    },
  };

  if (totalInvested === 0) {
    return null;
  }

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Benchmark Comparison
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Compare your portfolio performance against major market indices and investment options.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="outline" className={outperformance >= 0 ? "text-success" : "text-destructive"}>
            {outperformance >= 0 ? "Outperforming" : "Underperforming"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select benchmark" />
            </SelectTrigger>
            <SelectContent>
              {BENCHMARKS.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {["3m", "6m", "1y", "3y", "5y"].map((t) => (
              <Button
                key={t}
                variant={timeframe === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(t)}
              >
                {t.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Your Portfolio */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Your Portfolio</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalCurrentValue)}
                </p>
                <div className={`flex items-center gap-1 ${portfolioReturn >= 0 ? "text-success" : "text-destructive"}`}>
                  {portfolioReturn >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span className="text-sm font-semibold">
                    {portfolioReturn >= 0 ? "+" : ""}{portfolioReturn.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Invested: {formatCurrency(totalInvested)}
              </p>
            </div>
          </motion.div>

          {/* Selected Benchmark */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-xl bg-secondary/50 border border-border"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{benchmark.name}</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(benchmarkValue)}
                </p>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    +{benchmarkReturn.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {benchmark.description}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Performance Difference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl ${outperformance >= 0 ? "bg-success/10" : "bg-warning/10"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {outperformance >= 0 ? (
                <Trophy className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-warning" />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {outperformance >= 0 ? "Beating" : "Trailing"} {benchmark.shortName} by{" "}
                  {Math.abs(outperformance).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {opportunityCost >= 0 ? "Extra gains" : "Opportunity cost"}:{" "}
                  {formatCurrency(Math.abs(opportunityCost))}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Rank #{portfolioRank} of {chartData.length}
            </Badge>
          </div>
        </motion.div>

        {/* All Benchmarks Chart */}
        <div className="pt-4">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Performance Comparison ({timeframe.toUpperCase()})
          </p>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  width={80}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <p className="text-sm font-medium">{data.name}</p>
                        <p className={`text-sm ${data.return >= 0 ? "text-success" : "text-destructive"}`}>
                          {data.return >= 0 ? "+" : ""}{data.return.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={0} stroke="hsl(var(--border))" />
                <Bar dataKey="return" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPortfolio ? "hsl(var(--primary))" : (entry.color || "hsl(var(--muted-foreground))")}
                      opacity={entry.isPortfolio ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Tips */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> If your portfolio consistently underperforms index funds, consider
            investing in low-cost index mutual funds or ETFs for passive market returns.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart as PieIcon,
  BarChart2,
  TrendingDown,
  Sparkles,
  Utensils,
  ShoppingBag,
  Car,
  Gamepad2,
  Zap,
  Heart,
  Phone,
  BookOpen,
  Plane,
  MoreHorizontal,
  Home,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { format, subDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Category visual configuration
const CATEGORY_MAP: Record<
  string,
  { label: string; icon: React.ElementType; color: string; border: string; bg: string }
> = {
  food: {
    label: "Food & Groceries",
    icon: Utensils,
    color: "#f59e0b",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  housing: {
    label: "Housing & Rent",
    icon: Home,
    color: "#a855f7",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
  },
  shopping: {
    label: "Shopping & Retail",
    icon: ShoppingBag,
    color: "#ec4899",
    border: "border-pink-500/30",
    bg: "bg-pink-500/10",
  },
  transport: {
    label: "Transportation",
    icon: Car,
    color: "#06b6d4",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
  },
  bills: {
    label: "Utilities & Bills",
    icon: Zap,
    color: "#38bdf8",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
  },
  entertainment: {
    label: "Entertainment & Fun",
    icon: Gamepad2,
    color: "#8b5cf6",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
  },
  health: {
    label: "Health & Wellness",
    icon: Heart,
    color: "#f43f5e",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
  },
  recharges: {
    label: "Telecom & Subs",
    icon: Phone,
    color: "#10b981",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  education: {
    label: "Education & Skills",
    icon: BookOpen,
    color: "#6366f1",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
  },
  travel: {
    label: "Travel & Leisure",
    icon: Plane,
    color: "#14b8a6",
    border: "border-teal-500/30",
    bg: "bg-teal-500/10",
  },
  other: {
    label: "Personal & Other",
    icon: MoreHorizontal,
    color: "#94a3b8",
    border: "border-slate-500/30",
    bg: "bg-slate-500/10",
  },
};

interface CategoryStat {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  count: number;
  avgTicket: number;
  color: string;
  icon: React.ElementType;
}

export function MonthlyInsightsWidget({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const { data: allTransactions = [], isLoading } = useTransactions();
  const { formatMoney } = useCoinKeeper();
  const [viewMode, setViewMode] = useState<"donut" | "bars">("donut");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time window: Last 30 full days to today
  const { startDate, dateRangeLabel } = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, 30);
    return {
      startDate: start,
      endDate: end,
      dateRangeLabel: `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`,
    };
  }, []);

  // Filter eligible expense transactions within the 30-day window
  const last30DaysTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (tx.type !== "expense") return false;
      const tags = (tx as any).tags || [];
      if (tags.includes("Transfer") || tags.includes("Internal Transfer")) return false;

      if (!tx.transaction_date) return false;
      const txDate = new Date(tx.transaction_date);
      if (isNaN(txDate.getTime())) return false;

      return txDate >= startDate && txDate <= new Date();
    });
  }, [allTransactions, startDate]);

  // Aggregate by category
  const { categoryStats, total30DaySpend, topCategory, dailyAverage, transactionCount } = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {};
    let totalSpend = 0;

    last30DaysTransactions.forEach((tx) => {
      const cat = (tx.category || "other").toLowerCase();
      const amt = Number(tx.amount) || 0;
      if (amt <= 0) return;

      totalSpend += amt;
      if (!totals[cat]) {
        totals[cat] = { amount: 0, count: 0 };
      }
      totals[cat].amount += amt;
      totals[cat].count += 1;
    });

    const stats: CategoryStat[] = Object.entries(totals)
      .map(([cat, info]) => {
        const config = CATEGORY_MAP[cat] || CATEGORY_MAP.other;
        const percentage = totalSpend > 0 ? (info.amount / totalSpend) * 100 : 0;
        return {
          category: cat,
          label: config.label,
          amount: Math.round(info.amount),
          percentage: Math.round(percentage * 10) / 10,
          count: info.count,
          avgTicket: Math.round(info.amount / info.count),
          color: config.color,
          icon: config.icon,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      categoryStats: stats,
      total30DaySpend: totalSpend,
      topCategory: stats[0] || null,
      dailyAverage: Math.round(totalSpend / 30),
      transactionCount: last30DaysTransactions.length,
    };
  }, [last30DaysTransactions]);

  // Active highlighted category for central metrics
  const activeStat = useMemo(() => {
    if (hoveredCategory) {
      return categoryStats.find((c) => c.category === hoveredCategory) || null;
    }
    return null;
  }, [hoveredCategory, categoryStats]);

  // ---------------------------------------------------------------------------
  // D3 RENDERING ENGINE: Donut & Radial Hierarchy
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!svgRef.current || categoryStats.length === 0 || viewMode !== "donut") return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 320;
    const height = 320;
    const margin = 16;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.64;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Donut chart generator
    const pie = d3
      .pie<CategoryStat>()
      .value((d) => d.amount)
      .sort(null)
      .padAngle(0.025);

    const arc = d3
      .arc<d3.PieArcDatum<CategoryStat>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(5);

    const arcHover = d3
      .arc<d3.PieArcDatum<CategoryStat>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 7)
      .cornerRadius(6);

    // Subtle outer halo ring
    g.append("circle")
      .attr("r", radius + 11)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--border) / 0.35)")
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-width", 1);

    // Inner subtle guide ring
    g.append("circle")
      .attr("r", innerRadius - 8)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--border) / 0.25)")
      .attr("stroke-width", 1);

    // Render Pie Arcs with D3
    const arcs = g
      .selectAll(".arc")
      .data(pie(categoryStats))
      .enter()
      .append("g")
      .attr("class", "arc")
      .style("cursor", "pointer");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "hsl(var(--card))")
      .attr("stroke-width", 2)
      .style("transition", "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)")
      .style("opacity", (d) => {
        if (!hoveredCategory) return 0.92;
        return d.data.category === hoveredCategory ? 1 : 0.3;
      })
      .style("filter", (d) => {
        return d.data.category === hoveredCategory
          ? `drop-shadow(0 0 10px ${d.data.color}88)`
          : "none";
      })
      .on("mouseenter", function (_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arcHover as any)
          .style("opacity", "1")
          .style("filter", `drop-shadow(0 0 12px ${d.data.color}99)`);
        setHoveredCategory(d.data.category);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arc as any);
        setHoveredCategory(null);
      });
  }, [categoryStats, hoveredCategory, viewMode]);

  // Derived financial health insight text
  const financialInsight = useMemo(() => {
    if (!topCategory || total30DaySpend === 0) return null;
    const topPct = topCategory.percentage;

    if (topPct >= 45) {
      return {
        level: "warning" as const,
        title: `Heavy Outflow Concentration in ${topCategory.label}`,
        description: `${topCategory.percentage}% of all your 30-day expenditures are absorbed by ${topCategory.label}. Consider implementing a category cap in Budget & Flow to preserve discretionary surplus.`,
      };
    }
    if (topPct >= 30) {
      return {
        level: "moderate" as const,
        title: `Balanced Pacing Led by ${topCategory.label}`,
        description: `${topCategory.label} is your leading 30-day expense driver (${topCategory.percentage}%, ${formatMoney(topCategory.amount)}). Overall consumption is healthily distributed across ${categoryStats.length} categories.`,
      };
    }
    return {
      level: "healthy" as const,
      title: "Highly Diversified Consumer Spending",
      description: `Your 30-day spending shows prime balance with no single category consuming more than 30%. Your daily burn rate is averaging ${formatMoney(dailyAverage)}/day.`,
    };
  }, [topCategory, total30DaySpend, categoryStats.length, dailyAverage, formatMoney]);

  return (
    <Card className="card-elevated border-border/70 shadow-card bg-card/95 backdrop-blur-xl overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-border/40 bg-card/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-glow shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span>Monthly Insights</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider font-mono">
                  D3 Engine
                </span>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Rolling 30-day consumption: {dateRangeLabel}</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("donut")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "donut"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="D3 Radial Donut Hierarchy"
              >
                <PieIcon className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Radial</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("bars")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                  viewMode === "bars"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="D3 Ranked Proportion Bars"
              >
                <BarChart2 className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Ranked</span>
              </button>
            </div>

            {onNavigateTab && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab("analytics")}
                className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              >
                Deep Analytics
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 30-Day Quick Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
              30-Day Spend
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-foreground block mt-0.5">
              {isLoading ? "…" : formatMoney(total30DaySpend)}
            </span>
            <span className="text-[10px] text-muted-foreground">Consumer outflow</span>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
              Daily Average
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-primary block mt-0.5">
              {isLoading ? "…" : `${formatMoney(dailyAverage)}/d`}
            </span>
            <span className="text-[10px] text-muted-foreground">30-day velocity</span>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
              Top Driver
            </span>
            <span className="text-base sm:text-lg font-bold truncate block mt-0.5 text-foreground">
              {topCategory ? topCategory.label.split(" ")[0] : "None"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {topCategory ? `${topCategory.percentage}% of outflow` : "No data"}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
              Transactions
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-accent block mt-0.5">
              {transactionCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {categoryStats.length} active categories
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Synthesizing 30-day category records with D3…</p>
          </div>
        ) : categoryStats.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border/60 bg-secondary/20 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <PieIcon className="w-6 h-6 opacity-75" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">No 30-Day Expense Data Recorded</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Authorised transactions from your connected banks or manual expenses added over the last 30 days will render your automated category intelligence here.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.("tracker")}
                className="text-xs h-8"
              >
                Log an Expense
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Visual Chart Area (D3 Donut or Ranked Bars) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center min-h-[320px]">
              {viewMode === "donut" ? (
                <div ref={containerRef} className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
                  <svg ref={svgRef} className="w-full h-full overflow-visible drop-shadow-sm select-none" />

                  {/* Centered Dynamic Insight Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                    <AnimatePresence mode="wait">
                      {activeStat ? (
                        <motion.div
                          key={activeStat.category}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-0.5"
                        >
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider block truncate max-w-[140px] mx-auto"
                            style={{ color: activeStat.color }}
                          >
                            {activeStat.label}
                          </span>
                          <span className="text-xl sm:text-2xl font-extrabold font-mono text-foreground block">
                            {formatMoney(activeStat.amount)}
                          </span>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
                            <span>{activeStat.percentage}%</span>
                            <span>•</span>
                            <span>{activeStat.count} txns</span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="default-center"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-0.5"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            30-Day Outflow
                          </span>
                          <span className="text-xl sm:text-2xl font-extrabold font-mono text-foreground block">
                            {formatMoney(total30DaySpend)}
                          </span>
                          <span className="text-[10px] text-primary font-medium block">
                            Hover slices to inspect
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                /* D3 Ranked Proportional Bars Mode */
                <div className="w-full space-y-3.5 py-2">
                  {categoryStats.map((stat, idx) => {
                    const Icon = stat.icon;
                    const isHovered = hoveredCategory === stat.category;

                    return (
                      <div
                        key={stat.category}
                        onMouseEnter={() => setHoveredCategory(stat.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={cn(
                          "space-y-1.5 p-2 rounded-xl transition-all cursor-pointer",
                          isHovered ? "bg-secondary/60 scale-[1.01]" : "hover:bg-secondary/30"
                        )}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-[10px] font-mono text-muted-foreground font-bold">
                              #{idx + 1}
                            </span>
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="font-semibold text-foreground">{stat.label}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-foreground">{formatMoney(stat.amount)}</span>
                            <span className="text-[10px] text-muted-foreground">({stat.percentage}%)</span>
                          </div>
                        </div>

                        {/* Bar Track */}
                        <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.percentage}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: stat.color,
                              filter: isHovered ? `drop-shadow(0 0 6px ${stat.color})` : "none",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Breakdown List & Intelligence Legend */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Top Spending Categories ({categoryStats.length})
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">Share & Total</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 sidebar-scrollbar">
                {categoryStats.map((stat, idx) => {
                  const Icon = stat.icon;
                  const isHovered = hoveredCategory === stat.category;

                  return (
                    <div
                      key={stat.category}
                      onMouseEnter={() => setHoveredCategory(stat.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                        isHovered
                          ? "bg-secondary/70 border-primary/40 shadow-sm"
                          : "bg-secondary/30 border-border/40 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${stat.color}25`, color: stat.color }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate block">
                              {stat.label}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase">
                                Leader
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {stat.count} {stat.count === 1 ? "entry" : "entries"} · Avg ticket:{" "}
                            {formatMoney(stat.avgTicket)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono ml-2">
                        <span className="text-xs font-bold text-foreground block">
                          {formatMoney(stat.amount)}
                        </span>
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: stat.color }}
                        >
                          {stat.percentage}% of 30d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actionable Heuristic Verdict Banner */}
              {financialInsight && (
                <div
                  className={cn(
                    "p-3 rounded-xl border text-xs space-y-1 transition-all mt-3",
                    financialInsight.level === "warning"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : financialInsight.level === "moderate"
                      ? "bg-primary/10 border-primary/30 text-emerald-200"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <span>{financialInsight.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {financialInsight.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

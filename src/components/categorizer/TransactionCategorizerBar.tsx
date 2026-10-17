import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Filter,
  UploadCloud,
  Layers,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Receipt,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { useTransactions } from "@/hooks/useTransactions";
import { getKnownCustomTags } from "@/utils/autoCategorizer";
import { TagManagerDialog } from "./TagManagerDialog";

interface CategorizerBarProps {
  onOpenImport?: () => void;
  showInlineDrilldown?: boolean;
}

const DEFAULT_CATEGORIES: { id: string; label: string; iconEmoji: string }[] = [
  { id: "food", label: "Food & Dining", iconEmoji: "🍔" },
  { id: "travel", label: "Travel & Commute", iconEmoji: "✈️" },
  { id: "shopping", label: "Shopping", iconEmoji: "🛍️" },
  { id: "bills", label: "Bills & Utilities", iconEmoji: "⚡" },
  { id: "health", label: "Healthcare", iconEmoji: "💊" },
  { id: "education", label: "Education", iconEmoji: "🎓" },
  { id: "entertainment", label: "Entertainment", iconEmoji: "🎬" },
  { id: "recharges", label: "Recharges", iconEmoji: "📱" },
  { id: "income", label: "Income & Inflows", iconEmoji: "💰" },
  { id: "other", label: "Other", iconEmoji: "📦" },
];

export function TransactionCategorizerBar({ onOpenImport, showInlineDrilldown = true }: CategorizerBarProps) {
  const {
    categories: customCategories,
    dashboardCategoryFilter,
    setDashboardCategoryFilter,
    openBankImport,
    formatMoney,
  } = useCoinKeeper();

  const { data: transactions = [] } = useTransactions();

  const [showTagManager, setShowTagManager] = useState(false);
  const [filterMode, setFilterMode] = useState<"category" | "tag">("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrilldownExpanded, setIsDrilldownExpanded] = useState(false);

  const knownTags = useMemo(() => getKnownCustomTags(), []);

  // Combine standard and user's custom categories
  const allCategories = useMemo(() => {
    const combined = [...DEFAULT_CATEGORIES];
    customCategories.forEach(c => {
      if (!combined.some(item => item.id === c.id || item.id === c.name.toLowerCase())) {
        combined.push({
          id: c.id,
          label: c.name,
          iconEmoji: c.icon || "🏷️",
        });
      }
    });
    return combined;
  }, [customCategories]);

  // Compute stats for current active filter
  const activeFilterStats = useMemo(() => {
    if (!dashboardCategoryFilter) return null;

    const isTag = dashboardCategoryFilter.startsWith("#");
    const filterKey = isTag ? dashboardCategoryFilter.slice(1).toLowerCase() : dashboardCategoryFilter.toLowerCase();

    const matched = transactions.filter(t => {
      if (isTag) {
        return (t as any).tags?.some((tg: string) => tg.toLowerCase() === filterKey);
      }
      return (
        t.category.toLowerCase() === filterKey ||
        t.name.toLowerCase().includes(filterKey)
      );
    });

    const totalExpense = matched
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalIncome = matched
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      filterName: dashboardCategoryFilter,
      isTag,
      matchedCount: matched.length,
      totalExpense,
      totalIncome,
      transactions: matched,
    };
  }, [dashboardCategoryFilter, transactions]);

  const handleSelectFilter = (filter: string | null) => {
    if (dashboardCategoryFilter === filter) {
      setDashboardCategoryFilter(null);
      setIsDrilldownExpanded(false);
    } else {
      setDashboardCategoryFilter(filter);
      if (filter) {
        setIsDrilldownExpanded(true);
      }
    }
  };

  const handleImportClick = () => {
    if (onOpenImport) {
      onOpenImport();
    } else {
      openBankImport();
    }
  };

  return (
    <div className="space-y-3">
      {/* Main Categorizer Card */}
      <div className="p-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-card transition-all">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Transaction Categorizer & Smart Filter</span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  Tag Expenses
                </Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Filter your dashboard and categorize spending by custom tags or bank categories
              </p>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTagManager(true)}
              className="text-xs h-8 gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              Manage Tags
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleImportClick}
              className="text-xs h-8 bg-primary text-primary-foreground font-semibold gap-1.5 shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Import Bank Statement
            </Button>
          </div>
        </div>

        {/* Mode Selector & Filter Chips */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode("category")}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterMode === "category"
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Standard & Custom Categories
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("tag")}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterMode === "tag"
                    ? "bg-secondary text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom Labels & Tags (#{knownTags.length})
              </button>
            </div>

            {dashboardCategoryFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSelectFilter(null)}
                className="text-[11px] h-6 px-2 text-muted-foreground hover:text-destructive gap-1"
              >
                <X className="w-3 h-3" /> Clear Filter
              </Button>
            )}
          </div>

          {/* Filter Pills Cloud */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {/* "All" button */}
            <button
              type="button"
              onClick={() => handleSelectFilter(null)}
              className={`text-xs px-3 py-1.5 rounded-xl border flex-shrink-0 transition-all font-medium ${
                dashboardCategoryFilter === null
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                  : "bg-secondary/30 text-muted-foreground border-border/50 hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              All Categories
            </button>

            {filterMode === "category" ? (
              allCategories.map(cat => {
                const isSelected = dashboardCategoryFilter?.toLowerCase() === cat.id.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectFilter(cat.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl border flex-shrink-0 transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-secondary/20 text-foreground border-border/50 hover:bg-secondary/50"
                    }`}
                  >
                    <span>{cat.iconEmoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })
            ) : (
              knownTags.map(tag => {
                const tagWithHash = `#${tag}`;
                const isSelected = dashboardCategoryFilter === tagWithHash;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectFilter(tagWithHash)}
                    className={`text-xs px-3 py-1.5 rounded-xl border flex-shrink-0 transition-all flex items-center gap-1 font-mono ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-secondary/20 text-foreground border-border/50 hover:bg-secondary/50"
                    }`}
                  >
                    <span>{tagWithHash}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Filter Metrics Pill */}
        {activeFilterStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-secondary/15 -mx-4 -mb-4 p-4 rounded-b-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div>
                <span className="text-xs font-medium text-foreground">
                  Filtered by: <strong className="capitalize text-primary">{activeFilterStats.filterName}</strong>
                </span>
                <span className="text-[11px] text-muted-foreground ml-2">
                  ({activeFilterStats.matchedCount} matching record{activeFilterStats.matchedCount === 1 ? "" : "s"})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {activeFilterStats.totalExpense > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive font-semibold">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Outflow: {formatMoney(activeFilterStats.totalExpense)}</span>
                </div>
              )}

              {activeFilterStats.totalIncome > 0 && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Inflow: {formatMoney(activeFilterStats.totalIncome)}</span>
                </div>
              )}

              {showInlineDrilldown && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrilldownExpanded(prev => !prev)}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground gap-1"
                >
                  <span>{isDrilldownExpanded ? "Hide" : "View"} Entries</span>
                  {isDrilldownExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Expandable Drilldown Table */}
      <AnimatePresence>
        {isDrilldownExpanded && activeFilterStats && showInlineDrilldown && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Showing transactions for "{activeFilterStats.filterName}"
              </span>
              <span className="text-[11px] text-muted-foreground">
                Total Spend: {formatMoney(activeFilterStats.totalExpense)}
              </span>
            </div>

            <div className="border border-border/50 rounded-xl overflow-hidden divide-y divide-border/40 max-h-[260px] overflow-y-auto">
              {activeFilterStats.transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No transactions recorded in this category yet.
                </div>
              ) : (
                activeFilterStats.transactions.map((txn: any) => {
                  const isCredit = txn.type === "income";
                  return (
                    <div
                      key={txn.id}
                      className="p-2.5 text-xs flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{txn.name}</p>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {txn.transaction_date}
                          </span>
                        </div>
                        {txn.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{txn.description}</p>
                        )}
                        {txn.tags && txn.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {txn.tags.map((t: string) => (
                              <span
                                key={t}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isCredit ? "text-emerald-400" : "text-foreground"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatMoney(Number(txn.amount))}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Manager Dialog */}
      <TagManagerDialog
        open={showTagManager}
        onOpenChange={setShowTagManager}
      />
    </div>
  );
}

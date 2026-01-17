import { useMemo } from "react";
import { useTransactions } from "./useTransactions";
import { differenceInDays, parseISO, format, subMonths } from "date-fns";

export interface DetectedSubscription {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: "weekly" | "monthly" | "yearly" | "quarterly";
  lastPaymentDate: string;
  nextExpectedDate: string;
  occurrences: number;
  totalSpent: number;
  averageAmount: number;
  isActive: boolean;
  variance: number; // How consistent the amount is (lower = more consistent)
  confidenceScore: number; // 0-100, how confident we are this is a subscription
  relatedTransactions: Array<{ id: string; date: string; amount: number }>;
}

interface TransactionGroup {
  name: string;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    category: string;
  }>;
}

export function useSubscriptionDetection() {
  const { data: transactions = [], isLoading } = useTransactions();

  const detectedSubscriptions = useMemo(() => {
    if (transactions.length === 0) return [];

    // Group transactions by normalized name (lowercase, trimmed)
    const groupedByName: Record<string, TransactionGroup> = {};

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const normalizedName = t.name.toLowerCase().trim();
        if (!groupedByName[normalizedName]) {
          groupedByName[normalizedName] = {
            name: t.name,
            transactions: [],
          };
        }
        groupedByName[normalizedName].transactions.push({
          id: t.id,
          date: t.transaction_date,
          amount: Number(t.amount),
          category: t.category,
        });
      });

    const subscriptions: DetectedSubscription[] = [];

    Object.values(groupedByName).forEach((group) => {
      // Need at least 2 occurrences to detect a pattern
      if (group.transactions.length < 2) return;

      // Sort by date ascending
      const sortedTxns = [...group.transactions].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );

      // Calculate intervals between transactions
      const intervals: number[] = [];
      for (let i = 1; i < sortedTxns.length; i++) {
        const days = differenceInDays(
          parseISO(sortedTxns[i].date),
          parseISO(sortedTxns[i - 1].date)
        );
        intervals.push(days);
      }

      if (intervals.length === 0) return;

      // Determine average interval and detect frequency
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let frequency: DetectedSubscription["frequency"] | null = null;

      if (avgInterval >= 6 && avgInterval <= 8) frequency = "weekly";
      else if (avgInterval >= 25 && avgInterval <= 35) frequency = "monthly";
      else if (avgInterval >= 85 && avgInterval <= 100) frequency = "quarterly";
      else if (avgInterval >= 350 && avgInterval <= 380) frequency = "yearly";

      // If no clear frequency pattern, skip
      if (!frequency) return;

      // Calculate variance in intervals
      const intervalVariance =
        intervals.reduce((sum, interval) => {
          const diff = interval - avgInterval;
          return sum + diff * diff;
        }, 0) / intervals.length;

      // Calculate amount statistics
      const amounts = sortedTxns.map((t) => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const amountVariance =
        amounts.reduce((sum, amount) => {
          const diff = amount - avgAmount;
          return sum + diff * diff;
        }, 0) / amounts.length;

      // Calculate confidence score (higher is better)
      // Based on: consistent intervals, consistent amounts, number of occurrences
      const intervalConsistency = Math.max(0, 100 - intervalVariance);
      const amountConsistency = Math.max(0, 100 - (amountVariance / avgAmount) * 100);
      const occurrenceBonus = Math.min(30, sortedTxns.length * 10);
      const confidenceScore = Math.min(
        100,
        (intervalConsistency * 0.4 + amountConsistency * 0.4 + occurrenceBonus) * 0.7
      );

      // Only include if confidence is reasonably high
      if (confidenceScore < 40) return;

      // Calculate next expected date
      const lastDate = parseISO(sortedTxns[sortedTxns.length - 1].date);
      let nextExpectedDate: Date;

      switch (frequency) {
        case "weekly":
          nextExpectedDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          nextExpectedDate = new Date(lastDate);
          nextExpectedDate.setMonth(nextExpectedDate.getMonth() + 1);
          break;
        case "quarterly":
          nextExpectedDate = new Date(lastDate);
          nextExpectedDate.setMonth(nextExpectedDate.getMonth() + 3);
          break;
        case "yearly":
          nextExpectedDate = new Date(lastDate);
          nextExpectedDate.setFullYear(nextExpectedDate.getFullYear() + 1);
          break;
      }

      // Check if active (had payment in last period + buffer)
      const daysSinceLastPayment = differenceInDays(new Date(), lastDate);
      const expectedDays =
        frequency === "weekly"
          ? 7
          : frequency === "monthly"
          ? 30
          : frequency === "quarterly"
          ? 90
          : 365;
      const isActive = daysSinceLastPayment <= expectedDays * 1.5;

      subscriptions.push({
        id: `sub-${group.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: group.name,
        amount: avgAmount,
        category: sortedTxns[0].category,
        frequency,
        lastPaymentDate: sortedTxns[sortedTxns.length - 1].date,
        nextExpectedDate: format(nextExpectedDate, "yyyy-MM-dd"),
        occurrences: sortedTxns.length,
        totalSpent: amounts.reduce((a, b) => a + b, 0),
        averageAmount: avgAmount,
        isActive,
        variance: Math.sqrt(amountVariance),
        confidenceScore: Math.round(confidenceScore),
        relatedTransactions: sortedTxns.map((t) => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
        })),
      });
    });

    // Sort by total spent descending
    return subscriptions.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [transactions]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const activeSubscriptions = detectedSubscriptions.filter((s) => s.isActive);
    const monthlyTotal = activeSubscriptions.reduce((sum, sub) => {
      switch (sub.frequency) {
        case "weekly":
          return sum + sub.averageAmount * 4.33;
        case "monthly":
          return sum + sub.averageAmount;
        case "quarterly":
          return sum + sub.averageAmount / 3;
        case "yearly":
          return sum + sub.averageAmount / 12;
        default:
          return sum;
      }
    }, 0);

    const yearlyTotal = monthlyTotal * 12;

    // Find potential savings (inactive or low-usage subscriptions)
    const reviewCandidates = activeSubscriptions.filter(
      (s) => s.confidenceScore >= 60 && (s.occurrences <= 3 || s.variance > s.averageAmount * 0.2)
    );

    const potentialSavings = reviewCandidates.reduce((sum, sub) => {
      switch (sub.frequency) {
        case "weekly":
          return sum + sub.averageAmount * 4.33;
        case "monthly":
          return sum + sub.averageAmount;
        case "quarterly":
          return sum + sub.averageAmount / 3;
        case "yearly":
          return sum + sub.averageAmount / 12;
        default:
          return sum;
      }
    }, 0);

    return {
      totalSubscriptions: detectedSubscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      inactiveSubscriptions: detectedSubscriptions.length - activeSubscriptions.length,
      monthlyTotal,
      yearlyTotal,
      reviewCandidates: reviewCandidates.length,
      potentialMonthlySavings: potentialSavings,
    };
  }, [detectedSubscriptions]);

  return {
    subscriptions: detectedSubscriptions,
    summary,
    isLoading,
  };
}

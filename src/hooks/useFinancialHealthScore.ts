import { useFinancialSummary } from "./useTransactions";
import { useInvestmentSummary } from "./useInvestments";
import { useDebtSummary } from "./useDebts";

export function useFinancialHealthScore() {
  const { income, expenses, savingsRate, isLoading: transactionsLoading } = useFinancialSummary();
  const { totalCurrentValue, isLoading: investmentsLoading } = useInvestmentSummary();
  const { totalDebt, totalMonthlyPayment, isLoading: debtsLoading } = useDebtSummary();

  const isLoading = transactionsLoading || investmentsLoading || debtsLoading;

  // Check if user has any data at all
  const hasAnyData = income > 0 || expenses > 0 || totalCurrentValue > 0 || totalDebt > 0;

  // If no data exists, score is 0
  if (!hasAnyData) {
    return {
      score: 0,
      label: "No Data",
      savingsRate: 0,
      debtRatio: 0,
      emergencyMonths: 0,
      isLoading,
      hasData: false,
    };
  }

  // Calculate score components (0-100 each)
  let score = 0;

  // 1. Savings Rate Score (0-25 points)
  // 20%+ savings rate = 25 points
  if (income > 0) {
    const savingsScore = Math.min(25, (savingsRate / 20) * 25);
    score += savingsScore;
  }

  // 2. Debt-to-Income Ratio (0-25 points)
  // Lower is better. 0% = 25 points, 50%+ = 0 points
  if (income > 0) {
    const dtiRatio = (totalMonthlyPayment / income) * 100;
    const dtiScore = Math.max(0, 25 - (dtiRatio / 2));
    score += dtiScore;
  } else if (totalDebt === 0) {
    score += 25; // No income but also no debt
  }

  // 3. Emergency Fund (0-25 points)
  // 6 months expenses = 25 points
  if (expenses > 0) {
    const monthsCovered = totalCurrentValue / expenses;
    const emergencyScore = Math.min(25, (monthsCovered / 6) * 25);
    score += emergencyScore;
  } else if (totalCurrentValue > 0) {
    score += 25; // Has investments, no expenses tracked yet
  }

  // 4. Investment Habit (0-25 points)
  // Having any investments = 20 points
  if (totalCurrentValue > 0) {
    score += 20;
  }

  // Round the score
  const finalScore = Math.round(score);

  // Calculate individual metrics for display
  const debtRatio = income > 0 ? Math.round((totalMonthlyPayment / income) * 100) : 0;
  const emergencyMonths = expenses > 0 ? Math.round(totalCurrentValue / expenses) : 0;

  const getLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    if (s > 0) return "Needs Work";
    return "No Data";
  };

  return {
    score: finalScore,
    label: getLabel(finalScore),
    savingsRate,
    debtRatio,
    emergencyMonths,
    isLoading,
    hasData: income > 0 || totalCurrentValue > 0 || totalDebt > 0,
  };
}

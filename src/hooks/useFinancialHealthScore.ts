import { useFinancialSummary } from "./useTransactions";
import { useInvestmentSummary } from "./useInvestments";
import { useDebtSummary } from "./useDebts";

export function useFinancialHealthScore() {
  const { income, expenses, savingsRate, isLoading: transactionsLoading } = useFinancialSummary();
  const { totalCurrentValue, isLoading: investmentsLoading } = useInvestmentSummary();
  const { totalDebt, totalMonthlyPayment, isLoading: debtsLoading } = useDebtSummary();

  const isLoading = transactionsLoading || investmentsLoading || debtsLoading;

  // Calculate score components (0-100 each)
  let score = 0;
  let componentsCount = 0;

  // 1. Savings Rate Score (0-25 points)
  // 20%+ savings rate = 25 points
  if (income > 0) {
    const savingsScore = Math.min(25, (savingsRate / 20) * 25);
    score += savingsScore;
    componentsCount++;
  }

  // 2. Debt-to-Income Ratio (0-25 points)
  // Lower is better. 0% = 25 points, 50%+ = 0 points
  if (income > 0) {
    const dtiRatio = (totalMonthlyPayment / income) * 100;
    const dtiScore = Math.max(0, 25 - (dtiRatio / 2));
    score += dtiScore;
    componentsCount++;
  } else if (totalDebt === 0) {
    score += 25; // No income but also no debt
    componentsCount++;
  }

  // 3. Emergency Fund (0-25 points)
  // 6 months expenses = 25 points
  if (expenses > 0) {
    const monthsCovered = totalCurrentValue / expenses;
    const emergencyScore = Math.min(25, (monthsCovered / 6) * 25);
    score += emergencyScore;
    componentsCount++;
  } else if (totalCurrentValue > 0) {
    score += 25; // Has investments, no expenses tracked yet
    componentsCount++;
  }

  // 4. Investment Habit (0-25 points)
  // Having any investments = base 15 points
  // Diversified investments = up to 25 points
  if (totalCurrentValue > 0) {
    score += 20;
    componentsCount++;
  } else {
    componentsCount++; // Still count it even if 0
  }

  // Normalize score to 0-100
  const finalScore = componentsCount > 0 ? Math.round(score) : 0;

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

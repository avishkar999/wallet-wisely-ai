import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { format, subMonths, isSameMonth, parseISO } from "date-fns";

export type PersonaType = "student" | "professional" | "freelancer" | "business" | "investor" | "other";
export type IncomePattern = "fixed" | "variable" | "irregular";
export type FinancialPriority = 
  | "save" 
  | "spend_less" 
  | "emergency_fund" 
  | "invest" 
  | "debt" 
  | "track" 
  | "discipline";
export type BudgetingStyle = "simple" | "category" | "savings_first" | "percentage" | "custom";
export type InsightStyle = "simple" | "detailed" | "advanced";
export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY";

export type ExpenseClassification = "essential" | "lifestyle" | "discretionary" | "investment" | "debt" | "other";

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: ExpenseClassification;
  monthlyLimit?: number;
  isArchived?: boolean;
}

export interface CustomIncomeSource {
  id: string;
  name: string;
  icon: string;
  expectedAmount?: number;
  type: "salary" | "freelance" | "business" | "allowance" | "investment" | "rental" | "other";
}

export interface FinancialRule {
  id: string;
  title: string;
  description: string;
  category?: string;
  threshold: number;
  condition: "below" | "above" | "save_at_least" | "invest_pct";
  enabled: boolean;
}

export interface MonthlyCycleData {
  monthKey: string; // "YYYY-MM"
  budget: number;
  note: string;
  savingsTarget?: number;
  setupCopiedFrom?: string;
}

export interface CoinKeeperProfile {
  persona: PersonaType;
  incomePattern: IncomePattern;
  primaryPriority: FinancialPriority;
  budgetingStyle: BudgetingStyle;
  insightStyle: InsightStyle;
  currency: CurrencyCode;
  currencySymbol: string;
  expectedMonthlyIncome: number;
  monthlySavingsTarget: number;
  defaultMonthlyBudget: number;
  enabledModules: string[];
  dashboardCardsOrder: string[];
  onboardingCompleted: boolean;
  theme: "dark" | "light";
}

export interface MoneyPulseStatus {
  status: "healthy" | "watch" | "critical";
  score: number | null;
  isStandby?: boolean;
  title: string;
  description: string;
  burnRatePerDay: number;
  daysRemainingInMonth: number;
  projectedMonthEndSpending: number;
  budgetUsedPercent: number;
  savingsProgressPercent: number;
  keyFactors: { label: string; status: "good" | "warning" | "alert"; detail: string }[];
}

interface CoinKeeperContextType {
  profile: CoinKeeperProfile;
  updateProfile: (updates: Partial<CoinKeeperProfile>) => void;
  categories: CustomCategory[];
  addCategory: (cat: Omit<CustomCategory, "id">) => void;
  updateCategory: (id: string, updates: Partial<CustomCategory>) => void;
  deleteCategory: (id: string) => void;
  incomeSources: CustomIncomeSource[];
  addIncomeSource: (source: Omit<CustomIncomeSource, "id">) => void;
  updateIncomeSource: (id: string, updates: Partial<CustomIncomeSource>) => void;
  deleteIncomeSource: (id: string) => void;
  rules: FinancialRule[];
  addRule: (rule: Omit<FinancialRule, "id">) => void;
  toggleRule: (id: string) => void;
  deleteRule: (id: string) => void;
  currentSelectedMonth: string; // "YYYY-MM"
  setSelectedMonth: (month: string) => void;
  monthCycles: Record<string, MonthlyCycleData>;
  getCurrentMonthCycle: () => MonthlyCycleData;
  updateMonthCycle: (monthKey: string, updates: Partial<MonthlyCycleData>) => void;
  resetMonthSetup: (targetMonth: string, mode: "copy_previous" | "fresh" | "custom", customBudget?: number) => void;
  moneyPulse: MoneyPulseStatus;
  formatMoney: (amount: number, compact?: boolean) => string;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (show: boolean) => void;
  showDashboardCustomizer: boolean;
  setShowDashboardCustomizer: (show: boolean) => void;
  showQuickAddModal: boolean;
  setShowQuickAddModal: (show: boolean) => void;
  quickAddInitialType: "expense" | "income" | "transfer";
  openQuickAdd: (type?: "expense" | "income" | "transfer") => void;
  showMonthResetModal: boolean;
  setShowMonthResetModal: (show: boolean) => void;
  showMonthlyWrappedModal: boolean;
  setShowMonthlyWrappedModal: (show: boolean) => void;
  resetToPersonaPresets: (persona: PersonaType) => void;
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  JPY: "¥",
};

// Preset categories tailored to personas
export const PERSONA_PRESET_CATEGORIES: Record<PersonaType, Omit<CustomCategory, "id">[]> = {
  student: [
    { name: "College & Tuition", icon: "🎓", color: "#38bdf8", type: "essential", monthlyLimit: 5000 },
    { name: "Hostel / PG", icon: "🏠", color: "#a855f7", type: "essential", monthlyLimit: 8000 },
    { name: "Mess & Canteen", icon: "🍱", color: "#f59e0b", type: "essential", monthlyLimit: 4500 },
    { name: "Books & Study", icon: "📚", color: "#10b981", type: "essential", monthlyLimit: 1200 },
    { name: "Friends & Hangouts", icon: "🎉", color: "#ec4899", type: "lifestyle", monthlyLimit: 2500 },
    { name: "Transit & Metro", icon: "🚌", color: "#06b6d4", type: "essential", monthlyLimit: 1500 },
    { name: "Subscriptions", icon: "📱", color: "#6366f1", type: "lifestyle", monthlyLimit: 600 },
    { name: "Clothing & Tech", icon: "👕", color: "#8b5cf6", type: "discretionary", monthlyLimit: 2000 },
  ],
  professional: [
    { name: "Rent & Housing", icon: "🏢", color: "#a855f7", type: "essential", monthlyLimit: 20000 },
    { name: "EMIs & Credit", icon: "💳", color: "#ef4444", type: "debt", monthlyLimit: 8500 },
    { name: "Groceries & Supplies", icon: "🛒", color: "#10b981", type: "essential", monthlyLimit: 9000 },
    { name: "Utilities & Wifi", icon: "⚡", color: "#f59e0b", type: "essential", monthlyLimit: 3500 },
    { name: "Investments & SIP", icon: "📈", color: "#14b8a6", type: "investment", monthlyLimit: 15000 },
    { name: "Dining & Cafe", icon: "☕", color: "#f97316", type: "lifestyle", monthlyLimit: 5000 },
    { name: "Family & Parents", icon: "👨‍👩‍👧", color: "#ec4899", type: "essential", monthlyLimit: 8000 },
    { name: "Travel & Fuel", icon: "✈️", color: "#06b6d4", type: "lifestyle", monthlyLimit: 4000 },
  ],
  freelancer: [
    { name: "Client Work Tools", icon: "💻", color: "#38bdf8", type: "essential", monthlyLimit: 3000 },
    { name: "Software & Cloud", icon: "🌐", color: "#6366f1", type: "essential", monthlyLimit: 2500 },
    { name: "Workspace & Cafe", icon: "☕", color: "#f97316", type: "essential", monthlyLimit: 3500 },
    { name: "Tax Reserve", icon: "💼", color: "#ef4444", type: "essential", monthlyLimit: 8000 },
    { name: "Personal Living", icon: "🏠", color: "#a855f7", type: "essential", monthlyLimit: 18000 },
    { name: "Emergency Buffer", icon: "🛡️", color: "#10b981", type: "investment", monthlyLimit: 10000 },
    { name: "Healthcare", icon: "🏥", color: "#f43f5e", type: "essential", monthlyLimit: 2500 },
    { name: "Lifestyle & Books", icon: "📚", color: "#8b5cf6", type: "lifestyle", monthlyLimit: 4000 },
  ],
  business: [
    { name: "Business Ops", icon: "⚙️", color: "#38bdf8", type: "essential", monthlyLimit: 25000 },
    { name: "Marketing & Ads", icon: "📣", color: "#ec4899", type: "essential", monthlyLimit: 15000 },
    { name: "Inventory / Vendors", icon: "📦", color: "#f59e0b", type: "essential", monthlyLimit: 30000 },
    { name: "Taxes & Legal", icon: "⚖️", color: "#ef4444", type: "essential", monthlyLimit: 12000 },
    { name: "Personal Drawings", icon: "🏦", color: "#10b981", type: "essential", monthlyLimit: 40000 },
    { name: "Growth Capital", icon: "🚀", color: "#14b8a6", type: "investment", monthlyLimit: 20000 },
  ],
  investor: [
    { name: "Equity & Mutual Funds", icon: "📈", color: "#14b8a6", type: "investment", monthlyLimit: 30000 },
    { name: "Fixed Deposits / Bonds", icon: "🏛️", color: "#3b82f6", type: "investment", monthlyLimit: 15000 },
    { name: "Real Estate & Gold", icon: "🥇", color: "#eab308", type: "investment", monthlyLimit: 20000 },
    { name: "Living Essentials", icon: "🏠", color: "#a855f7", type: "essential", monthlyLimit: 25000 },
    { name: "Lifestyle & Travel", icon: "✈️", color: "#ec4899", type: "lifestyle", monthlyLimit: 15000 },
    { name: "Advisory & Tools", icon: "📊", color: "#6366f1", type: "essential", monthlyLimit: 4000 },
  ],
  other: [
    { name: "Housing & Rent", icon: "🏠", color: "#a855f7", type: "essential", monthlyLimit: 15000 },
    { name: "Food & Groceries", icon: "🛒", color: "#10b981", type: "essential", monthlyLimit: 8000 },
    { name: "Utilities & Bills", icon: "⚡", color: "#f59e0b", type: "essential", monthlyLimit: 3500 },
    { name: "Transportation", icon: "🚗", color: "#06b6d4", type: "essential", monthlyLimit: 4000 },
    { name: "Savings & SIP", icon: "📈", color: "#14b8a6", type: "investment", monthlyLimit: 10000 },
    { name: "Fun & Leisure", icon: "🎉", color: "#ec4899", type: "lifestyle", monthlyLimit: 5000 },
  ],
};

const PERSONA_PRESET_INCOME: Record<PersonaType, Omit<CustomIncomeSource, "id">[]> = {
  student: [
    { name: "Parental Allowance", icon: "👨‍👩‍👦", expectedAmount: 18000, type: "allowance" },
    { name: "Part-time / Tutoring", icon: "📚", expectedAmount: 7000, type: "freelance" },
  ],
  professional: [
    { name: "Monthly Salary", icon: "💼", expectedAmount: 75000, type: "salary" },
    { name: "Annual / Quarterly Bonus", icon: "🎁", expectedAmount: 10000, type: "salary" },
    { name: "Dividends & Interest", icon: "📈", expectedAmount: 2500, type: "investment" },
  ],
  freelancer: [
    { name: "Client Retainers", icon: "🤝", expectedAmount: 45000, type: "freelance" },
    { name: "Project Milestones", icon: "🎯", expectedAmount: 30000, type: "freelance" },
    { name: "Consulting Hours", icon: "💡", expectedAmount: 12000, type: "freelance" },
  ],
  business: [
    { name: "Business Revenue", icon: "🏢", expectedAmount: 120000, type: "business" },
    { name: "Profit Distributions", icon: "📊", expectedAmount: 35000, type: "business" },
  ],
  investor: [
    { name: "Dividend Income", icon: "💸", expectedAmount: 25000, type: "investment" },
    { name: "Rental Yields", icon: "🏠", expectedAmount: 35000, type: "rental" },
    { name: "Capital Gains", icon: "📈", expectedAmount: 20000, type: "investment" },
  ],
  other: [
    { name: "Primary Income", icon: "💵", expectedAmount: 45000, type: "salary" },
    { name: "Secondary Source", icon: "✨", expectedAmount: 8000, type: "other" },
  ],
};

const DEFAULT_PROFILE: CoinKeeperProfile = {
  persona: "professional",
  incomePattern: "fixed",
  primaryPriority: "save",
  budgetingStyle: "category",
  insightStyle: "detailed",
  currency: "INR",
  currencySymbol: "₹",
  expectedMonthlyIncome: 0,
  monthlySavingsTarget: 0,
  defaultMonthlyBudget: 0,
  enabledModules: [
    "pulse",
    "cycle",
    "budget",
    "trends",
    "cashflow",
    "accounts",
    "goals",
    "categories",
    "subscriptions",
    "investments",
    "debts",
    "habits",
    "rules",
    "networth",
  ],
  dashboardCardsOrder: [
    "pulse",
    "cycle",
    "budget",
    "trends",
    "cashflow",
    "accounts",
    "goals",
    "categories",
    "subscriptions",
    "investments",
    "debts",
    "habits",
  ],
  onboardingCompleted: false,
  theme: "dark",
};

const DEFAULT_RULES: FinancialRule[] = [];

const CoinKeeperContext = createContext<CoinKeeperContextType | undefined>(undefined);

const STORAGE_KEY_PROFILE = "coinkeeper_clean_profile_v3";
const STORAGE_KEY_CATEGORIES = "coinkeeper_clean_categories_v3";
const STORAGE_KEY_INCOME = "coinkeeper_clean_income_v3";
const STORAGE_KEY_RULES = "coinkeeper_clean_rules_v3";
const STORAGE_KEY_CYCLES = "coinkeeper_clean_cycles_v3";

export function CoinKeeperProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();

  const currentSystemMonth = useMemo(() => format(new Date(), "yyyy-MM"), []);
  const [currentSelectedMonth, setSelectedMonth] = useState<string>(currentSystemMonth);

  // Modals state
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [showDashboardCustomizer, setShowDashboardCustomizer] = useState<boolean>(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickAddInitialType, setQuickAddInitialType] = useState<"expense" | "income" | "transfer">("expense");
  const [showMonthResetModal, setShowMonthResetModal] = useState<boolean>(false);
  const [showMonthlyWrappedModal, setShowMonthlyWrappedModal] = useState<boolean>(false);

  const openQuickAdd = (type: "expense" | "income" | "transfer" = "expense") => {
    setQuickAddInitialType(type);
    setShowQuickAddModal(true);
  };

  // Load profile from localStorage with fallback
  const [profile, setProfile] = useState<CoinKeeperProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  });

  // Load custom categories
  const [categories, setCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return PERSONA_PRESET_CATEGORIES.professional.map((c, i) => ({
      ...c,
      id: `cat-preset-${i + 1}`,
    }));
  });

  // Load income sources
  const [incomeSources, setIncomeSources] = useState<CustomIncomeSource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INCOME);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return PERSONA_PRESET_INCOME.professional.map((s, i) => ({
      ...s,
      id: `inc-preset-${i + 1}`,
    }));
  });

  // Load financial rules
  const [rules, setRules] = useState<FinancialRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RULES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_RULES;
  });

  // Load monthly cycle records (supports variable budgets & custom notes per month)
  const [monthCycles, setMonthCycles] = useState<Record<string, MonthlyCycleData>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CYCLES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      [currentSystemMonth]: {
        monthKey: currentSystemMonth,
        budget: 48000,
        note: "Q4 Financial Focus & Savings Momentum",
        savingsTarget: 18000,
      },
    };
  });

  // Persist state updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    } catch {
      // ignore
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(incomeSources));
    } catch {
      // ignore
    }
  }, [incomeSources]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    } catch {
      // ignore
    }
  }, [rules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CYCLES, JSON.stringify(monthCycles));
    } catch {
      // ignore
    }
  }, [monthCycles]);

  const updateProfile = (updates: Partial<CoinKeeperProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      if (updates.currency) {
        next.currencySymbol = CURRENCY_SYMBOLS[updates.currency] || "₹";
      }
      return next;
    });
  };

  // Helper to get or auto-initialize cycle data for selected month
  const getCurrentMonthCycle = (): MonthlyCycleData => {
    if (monthCycles[currentSelectedMonth]) {
      return monthCycles[currentSelectedMonth];
    }
    // Auto-create with default monthly budget
    const newCycle: MonthlyCycleData = {
      monthKey: currentSelectedMonth,
      budget: profile.defaultMonthlyBudget || 45000,
      note: "Standard monthly budget",
      savingsTarget: profile.monthlySavingsTarget || 15000,
    };
    setMonthCycles((prev) => ({ ...prev, [currentSelectedMonth]: newCycle }));
    return newCycle;
  };

  const updateMonthCycle = (monthKey: string, updates: Partial<MonthlyCycleData>) => {
    setMonthCycles((prev) => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || {
          monthKey,
          budget: profile.defaultMonthlyBudget,
          note: "",
          savingsTarget: profile.monthlySavingsTarget,
        }),
        ...updates,
      },
    }));
  };

  // 3-choice Month Reset & Duplication
  const resetMonthSetup = (
    targetMonth: string,
    mode: "copy_previous" | "fresh" | "custom",
    customBudget?: number
  ) => {
    const prevDate = subMonths(parseISO(`${targetMonth}-01`), 1);
    const prevKey = format(prevDate, "yyyy-MM");
    const previousSetup = monthCycles[prevKey];

    let newBudget = profile.defaultMonthlyBudget;
    let newNote = `Budget for ${format(parseISO(`${targetMonth}-01`), "MMMM yyyy")}`;

    if (mode === "copy_previous" && previousSetup) {
      newBudget = previousSetup.budget;
      newNote = `Carried forward from ${format(prevDate, "MMM yyyy")}`;
    } else if (mode === "custom" && customBudget) {
      newBudget = customBudget;
      newNote = "Customized monthly limit";
    }

    setMonthCycles((prev) => ({
      ...prev,
      [targetMonth]: {
        monthKey: targetMonth,
        budget: newBudget,
        note: newNote,
        savingsTarget: previousSetup?.savingsTarget || profile.monthlySavingsTarget,
        setupCopiedFrom: mode === "copy_previous" ? prevKey : undefined,
      },
    }));
  };

  // Reset categories & sources according to a selected persona
  const resetToPersonaPresets = (persona: PersonaType) => {
    const presetCats = PERSONA_PRESET_CATEGORIES[persona] || PERSONA_PRESET_CATEGORIES.other;
    const presetInc = PERSONA_PRESET_INCOME[persona] || PERSONA_PRESET_INCOME.other;

    const newCategories: CustomCategory[] = presetCats.map((c, i) => ({
      ...c,
      id: `cat-${Date.now()}-${i}`,
    }));

    const newIncome: CustomIncomeSource[] = presetInc.map((s, i) => ({
      ...s,
      id: `inc-${Date.now()}-${i}`,
    }));

    setCategories(newCategories);
    setIncomeSources(newIncome);

    const personaBudgets: Record<PersonaType, number> = {
      student: 22000,
      professional: 52000,
      freelancer: 45000,
      business: 90000,
      investor: 65000,
      other: 40000,
    };

    updateProfile({
      persona,
      defaultMonthlyBudget: personaBudgets[persona] || 45000,
      monthlySavingsTarget: Math.round((personaBudgets[persona] || 45000) * 0.3),
    });
  };

  // Category CRUD
  const addCategory = (cat: Omit<CustomCategory, "id">) => {
    const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setCategories((prev) => [...prev, { ...cat, id }]);
  };

  const updateCategory = (id: string, updates: Partial<CustomCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Income Sources CRUD
  const addIncomeSource = (source: Omit<CustomIncomeSource, "id">) => {
    const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setIncomeSources((prev) => [...prev, { ...source, id }]);
  };

  const updateIncomeSource = (id: string, updates: Partial<CustomIncomeSource>) => {
    setIncomeSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteIncomeSource = (id: string) => {
    setIncomeSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Financial Rules CRUD
  const addRule = (rule: Omit<FinancialRule, "id">) => {
    const id = `rule-${Date.now()}`;
    setRules((prev) => [...prev, { ...rule, id }]);
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Currency formatter
  const formatMoney = (amount: number, compact = false): string => {
    const sym = profile.currencySymbol || "₹";
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    if (compact) {
      if (abs >= 10000000) return `${sign}${sym}${(abs / 10000000).toFixed(1)}Cr`;
      if (abs >= 100000) return `${sign}${sym}${(abs / 100000).toFixed(1)}L`;
      if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(1)}k`;
      return `${sign}${sym}${abs.toFixed(0)}`;
    }

    return `${sign}${sym}${abs.toLocaleString(
      profile.currency === "INR" ? "en-IN" : "en-US",
      { maximumFractionDigits: 0 }
    )}`;
  };

  // Signature Money Pulse computation based on user's priority
  const moneyPulse = useMemo<MoneyPulseStatus>(() => {
    const now = new Date();
    const cycle = monthCycles[currentSelectedMonth] || {
      budget: profile.defaultMonthlyBudget,
      savingsTarget: profile.monthlySavingsTarget,
    };

    // Calculate month stats for currentSelectedMonth
    const monthTx = transactions.filter((t) =>
      t.transaction_date?.startsWith(currentSelectedMonth)
    );

    const year = parseInt(currentSelectedMonth.slice(0, 4), 10);
    const month = parseInt(currentSelectedMonth.slice(5, 7), 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = isSameMonth(parseISO(`${currentSelectedMonth}-01`), now)
      ? now.getDate()
      : daysInMonth;
    const daysRemaining = Math.max(1, daysInMonth - currentDay);

    // If zero transactions recorded, return clean Standby state
    if (monthTx.length === 0) {
      return {
        status: "healthy" as const,
        score: null,
        isStandby: true,
        title: "Ready · Awaiting Activity",
        description: "Your financial space is ready. Record your first transaction to initiate real-time Money Pulse calculations.",
        burnRatePerDay: 0,
        daysRemainingInMonth: daysRemaining,
        projectedMonthEndSpending: 0,
        budgetUsedPercent: 0,
        savingsProgressPercent: 0,
        keyFactors: [
          {
            label: "System Status",
            status: "good" as const,
            detail: "Zero recorded outlays. Ready for your first entry.",
          },
        ],
      };
    }

    const totalIncome = monthTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpenses = monthTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const budget = cycle.budget || profile.defaultMonthlyBudget || 45000;
    const savingsTarget = cycle.savingsTarget || profile.monthlySavingsTarget || 15000;
    const netSavings = Math.max(0, totalIncome - totalExpenses);

    const burnRatePerDay = currentDay > 0 ? Math.round(totalExpenses / currentDay) : 0;
    const projectedMonthEndSpending = Math.round(totalExpenses + burnRatePerDay * daysRemaining);
    const budgetUsedPercent = budget > 0 ? Math.round((totalExpenses / budget) * 100) : 0;
    const savingsProgressPercent = savingsTarget > 0 ? Math.round((netSavings / savingsTarget) * 100) : 0;

    // Adapt scoring based on user's selected primaryPriority
    let score = 85;
    const keyFactors: MoneyPulseStatus["keyFactors"] = [];

    // Factor 1: Budget Pace
    if (budgetUsedPercent > 100) {
      score -= profile.primaryPriority === "spend_less" ? 35 : 25;
      keyFactors.push({
        label: "Budget Discipline",
        status: "alert",
        detail: `${budgetUsedPercent - 100}% over monthly limit`,
      });
    } else if (budgetUsedPercent > 80 && currentDay < daysInMonth * 0.7) {
      score -= 15;
      keyFactors.push({
        label: "Budget Pace",
        status: "warning",
        detail: `${budgetUsedPercent}% used with ${daysRemaining} days remaining`,
      });
    } else {
      keyFactors.push({
        label: "Budget Pace",
        status: "good",
        detail: `${100 - budgetUsedPercent}% breathing room remaining`,
      });
    }

    // Factor 2: Savings Progress
    if (profile.primaryPriority === "save" || profile.primaryPriority === "emergency_fund") {
      if (savingsProgressPercent >= 70) {
        score += 10;
        keyFactors.push({
          label: "Savings Target",
          status: "good",
          detail: `${savingsProgressPercent}% of monthly target secured`,
        });
      } else {
        score -= 15;
        keyFactors.push({
          label: "Savings Target",
          status: "warning",
          detail: `${100 - savingsProgressPercent}% left to reach monthly target`,
        });
      }
    } else {
      keyFactors.push({
        label: "Savings Accumulation",
        status: savingsProgressPercent >= 50 ? "good" : "warning",
        detail: `${savingsProgressPercent}% achieved towards savings goal`,
      });
    }

    // Factor 3: Burn Rate
    const expectedDailyBudget = Math.round(budget / daysInMonth);
    if (burnRatePerDay > expectedDailyBudget * 1.25) {
      score -= 12;
      keyFactors.push({
        label: "Daily Burn Rate",
        status: "warning",
        detail: `${formatMoney(burnRatePerDay)}/day exceeds target pace`,
      });
    } else {
      keyFactors.push({
        label: "Daily Burn Rate",
        status: "good",
        detail: `${formatMoney(burnRatePerDay)}/day within safe guardrails`,
      });
    }

    score = Math.max(10, Math.min(99, score));

    let status: MoneyPulseStatus["status"] = "healthy";
    let title = "Pulse: Healthy & In Control";
    let description = "Your spending rate aligns with your financial priorities this month.";

    if (score < 60) {
      status = "critical";
      title = "Pulse: High Burn Rate";
      description = "Spending velocity indicates early budget exhaustion. Attention advised.";
    } else if (score < 78) {
      status = "watch";
      title = "Pulse: Moderate Caution";
      description = "Track upcoming discretionary expenses to maintain your target savings rate.";
    }

    return {
      status,
      score,
      title,
      description,
      burnRatePerDay,
      daysRemainingInMonth: daysRemaining,
      projectedMonthEndSpending,
      budgetUsedPercent,
      savingsProgressPercent,
      keyFactors,
    };
  }, [transactions, currentSelectedMonth, monthCycles, profile, formatMoney]);

  return (
    <CoinKeeperContext.Provider
      value={{
        profile,
        updateProfile,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        incomeSources,
        addIncomeSource,
        updateIncomeSource,
        deleteIncomeSource,
        rules,
        addRule,
        toggleRule,
        deleteRule,
        currentSelectedMonth,
        setSelectedMonth,
        monthCycles,
        getCurrentMonthCycle,
        updateMonthCycle,
        resetMonthSetup,
        moneyPulse,
        formatMoney,
        showOnboardingModal,
        setShowOnboardingModal,
        showDashboardCustomizer,
        setShowDashboardCustomizer,
        showQuickAddModal,
        setShowQuickAddModal,
        quickAddInitialType,
        openQuickAdd,
        showMonthResetModal,
        setShowMonthResetModal,
        showMonthlyWrappedModal,
        setShowMonthlyWrappedModal,
        resetToPersonaPresets,
      }}
    >
      {children}
    </CoinKeeperContext.Provider>
  );
}

export function useCoinKeeper() {
  const context = useContext(CoinKeeperContext);
  if (!context) {
    throw new Error("useCoinKeeper must be used within CoinKeeperProvider");
  }
  return context;
}

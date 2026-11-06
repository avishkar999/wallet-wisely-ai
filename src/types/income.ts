import {
  Briefcase,
  Laptop,
  Building2,
  GraduationCap,
  TrendingUp,
  PieChart,
  Percent,
  Home,
  Share2,
  Video,
  Gift,
  RotateCcw,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

export interface IncomeCategoryConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

export const PREDEFINED_INCOME_CATEGORIES: IncomeCategoryConfig[] = [
  {
    id: "salary",
    name: "Salary",
    icon: Briefcase,
    color: "#10b981",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-500",
    borderClass: "border-emerald-500/30",
    description: "Primary employment salary, wages, and fixed paychecks",
  },
  {
    id: "freelancing",
    name: "Freelancing",
    icon: Laptop,
    color: "#06b6d4",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-500",
    borderClass: "border-cyan-500/30",
    description: "Client projects, consulting, contract work, and gigs",
  },
  {
    id: "business_income",
    name: "Business Income",
    icon: Building2,
    color: "#6366f1",
    bgClass: "bg-indigo-500/10",
    textClass: "text-indigo-500",
    borderClass: "border-indigo-500/30",
    description: "Revenue from commercial business ventures and company profits",
  },
  {
    id: "internship_stipend",
    name: "Internship Stipend",
    icon: GraduationCap,
    color: "#14b8a6",
    bgClass: "bg-teal-500/10",
    textClass: "text-teal-500",
    borderClass: "border-teal-500/30",
    description: "Academic or professional internship allowances and stipends",
  },
  {
    id: "investment_returns",
    name: "Investment Returns",
    icon: TrendingUp,
    color: "#3b82f6",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-500",
    borderClass: "border-blue-500/30",
    description: "Capital gains, mutual fund redemptions, and equity profits",
  },
  {
    id: "dividends",
    name: "Dividends",
    icon: PieChart,
    color: "#0ea5e9",
    bgClass: "bg-sky-500/10",
    textClass: "text-sky-500",
    borderClass: "border-sky-500/30",
    description: "Quarterly or annual shareholder dividend payouts",
  },
  {
    id: "interest_income",
    name: "Interest Income",
    icon: Percent,
    color: "#f59e0b",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-500",
    borderClass: "border-amber-500/30",
    description: "Savings account interest, fixed deposits (FD), and bond yields",
  },
  {
    id: "rental_income",
    name: "Rental Income",
    icon: Home,
    color: "#8b5cf6",
    bgClass: "bg-purple-500/10",
    textClass: "text-purple-500",
    borderClass: "border-purple-500/30",
    description: "Rent from residential, commercial, or equipment leases",
  },
  {
    id: "affiliate_marketing",
    name: "Affiliate Marketing",
    icon: Share2,
    color: "#ec4899",
    bgClass: "bg-pink-500/10",
    textClass: "text-pink-500",
    borderClass: "border-pink-500/30",
    description: "Referral commissions, partner links, and affiliate programs",
  },
  {
    id: "content_creation",
    name: "Content Creation",
    icon: Video,
    color: "#f43f5e",
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-500",
    borderClass: "border-rose-500/30",
    description: "YouTube ad revenue, sponsorships, newsletters, and digital media",
  },
  {
    id: "gifts_and_rewards",
    name: "Gifts and Rewards",
    icon: Gift,
    color: "#d946ef",
    bgClass: "bg-fuchsia-500/10",
    textClass: "text-fuchsia-500",
    borderClass: "border-fuchsia-500/30",
    description: "Cash gifts from family, festival bonuses, and rewards",
  },
  {
    id: "refunds_and_cashback",
    name: "Refunds and Cashback",
    icon: RotateCcw,
    color: "#84cc16",
    bgClass: "bg-lime-500/10",
    textClass: "text-lime-500",
    borderClass: "border-lime-500/30",
    description: "Merchant refunds, credit card cashback, and tax rebates",
  },
  {
    id: "other_income",
    name: "Other Income",
    icon: CircleDollarSign,
    color: "#10b981",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-500",
    borderClass: "border-emerald-500/30",
    description: "Miscellaneous or uncategorised incoming cash flow",
  },
];

export interface PaymentMethodOption {
  id: string;
  name: string;
  description: string;
}

export const INCOME_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "upi", name: "UPI", description: "Google Pay, PhonePe, Paytm, BHIM" },
  { id: "bank_transfer", name: "Bank Transfer", description: "NEFT, IMPS, RTGS, Wire" },
  { id: "cash", name: "Cash", description: "Physical currency received" },
  { id: "card", name: "Card", description: "Debit, Credit, or Prepaid card settlement" },
  { id: "other", name: "Other", description: "Crypto, Cheque, or other method" },
];

/**
 * Returns category config for a given string or fallback to "Other Income"
 */
export function getIncomeCategoryConfig(rawCategory: string | null | undefined): IncomeCategoryConfig {
  if (!rawCategory) return PREDEFINED_INCOME_CATEGORIES[12]; // Other Income

  const normalized = rawCategory.trim().toLowerCase().replace(/[\s-]+/g, "_");

  // Direct match by id
  const foundById = PREDEFINED_INCOME_CATEGORIES.find((c) => c.id === normalized);
  if (foundById) return foundById;

  // Match by name
  const foundByName = PREDEFINED_INCOME_CATEGORIES.find(
    (c) => c.name.toLowerCase() === rawCategory.trim().toLowerCase()
  );
  if (foundByName) return foundByName;

  // Match partial keywords
  if (normalized.includes("salary") || normalized.includes("wage") || normalized.includes("payroll")) {
    return PREDEFINED_INCOME_CATEGORIES[0];
  }
  if (normalized.includes("freelance") || normalized.includes("consult") || normalized.includes("gig")) {
    return PREDEFINED_INCOME_CATEGORIES[1];
  }
  if (normalized.includes("business") || normalized.includes("corp") || normalized.includes("firm")) {
    return PREDEFINED_INCOME_CATEGORIES[2];
  }
  if (normalized.includes("stipend") || normalized.includes("intern")) {
    return PREDEFINED_INCOME_CATEGORIES[3];
  }
  if (normalized.includes("investment") || normalized.includes("fund") || normalized.includes("stock")) {
    return PREDEFINED_INCOME_CATEGORIES[4];
  }
  if (normalized.includes("dividend")) {
    return PREDEFINED_INCOME_CATEGORIES[5];
  }
  if (normalized.includes("interest") || normalized.includes("fd") || normalized.includes("deposit")) {
    return PREDEFINED_INCOME_CATEGORIES[6];
  }
  if (normalized.includes("rent") || normalized.includes("tenant") || normalized.includes("lease")) {
    return PREDEFINED_INCOME_CATEGORIES[7];
  }
  if (normalized.includes("affiliate") || normalized.includes("commission")) {
    return PREDEFINED_INCOME_CATEGORIES[8];
  }
  if (normalized.includes("content") || normalized.includes("creator") || normalized.includes("youtube")) {
    return PREDEFINED_INCOME_CATEGORIES[9];
  }
  if (normalized.includes("gift") || normalized.includes("reward") || normalized.includes("bonus")) {
    return PREDEFINED_INCOME_CATEGORIES[10];
  }
  if (normalized.includes("refund") || normalized.includes("cashback") || normalized.includes("rebate")) {
    return PREDEFINED_INCOME_CATEGORIES[11];
  }

  // If custom category, create dynamic config
  return {
    id: normalized,
    name: rawCategory,
    icon: CircleDollarSign,
    color: "#10b981",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-500",
    borderClass: "border-emerald-500/30",
    description: "Custom Income Source",
  };
}

export function formatIncomePaymentMethod(method: string | null | undefined): string {
  if (!method) return "UPI";
  const m = method.toLowerCase();
  if (m === "bank_transfer" || m === "neft") return "Bank Transfer";
  if (m === "debit_card" || m === "credit_card" || m === "card") return "Card";
  if (m === "cash") return "Cash";
  if (m === "upi") return "UPI";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

import { Constants, Database } from "@/integrations/supabase/types";

export type TransactionCategory = Database["public"]["Enums"]["transaction_category"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export interface CategorizationResult {
  category: TransactionCategory;
  type: "expense" | "income";
  isTransfer: boolean;
  isRefund: boolean;
  cleanedName: string;
  merchant: string;
  referenceNo: string;
  suggestedTags: string[];
  confidence: "high" | "medium" | "low";
  matchedRule?: string;
}

// Stored custom user rules in localStorage for learning user preferences
const CUSTOM_RULES_KEY = "coinkeeper_categorization_rules";
const CUSTOM_TAGS_KEY = "coinkeeper_custom_tags";

export interface CustomRule {
  id: string;
  keyword: string;
  category: TransactionCategory;
  tags: string[];
  type?: "expense" | "income" | "transfer";
}

export function getCustomRules(): CustomRule[] {
  try {
    const raw = localStorage.getItem(CUSTOM_RULES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function saveCustomRule(rule: Omit<CustomRule, "id">) {
  try {
    const existing = getCustomRules();
    const newRule: CustomRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = [newRule, ...existing.filter(r => r.keyword.toLowerCase() !== rule.keyword.toLowerCase())];
    localStorage.setItem(CUSTOM_RULES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getKnownCustomTags(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    "Groceries",
    "Rent",
    "Dining",
    "Coffee",
    "Utilities",
    "Delivery",
    "Subscriptions",
    "Fastag",
    "Fuel",
    "Healthcare",
    "Salary",
    "Shopping",
    "Travel",
    "Weekend",
    "Client",
    "College",
  ];
}

export function addKnownCustomTag(tag: string) {
  try {
    const trimmed = tag.trim().replace(/^#/, "");
    if (!trimmed) return;
    const existing = getKnownCustomTags();
    if (!existing.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...existing, trimmed];
      localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
}

// Keyword mapping dictionary for intelligent bank statement parsing
interface RuleDefinition {
  keywords: string[];
  category: TransactionCategory;
  defaultTags: string[];
  type?: "expense" | "income";
}

const CATEGORY_RULES: RuleDefinition[] = [
  // FOOD & DINING
  {
    category: "food",
    defaultTags: ["Dining", "Food"],
    keywords: [
      "swiggy", "zomato", "blinkit", "zepto", "instamart", "bigbasket", "grofers",
      "starbucks", "mcdonald", "burger king", "kfc", "subway", "dominos", "pizza hut",
      "haldiram", "chai point", "barista", "cafe coffee day", "dunkin", "costa coffee",
      "nature's basket", "bbdaily", "dunzo", "restaurant", "cafe", "dhaba", "bistro",
      "bakery", "sweets", "canteen", "eatery", "food court", "tiffin", "mess",
      "supermarket", "provision", "kirana", "fresh veggies", "meat market", "licious"
    ],
  },

  // TRAVEL & TRANSPORT
  {
    category: "travel",
    defaultTags: ["Travel", "Commute"],
    keywords: [
      "uber", "ola", "rapido", "irctc", "indian railways", "makemytrip", "goibibo",
      "cleartrip", "yatra", "indigo", "air india", "vistara", "spicejet", "akasa",
      "airasia", "fuel", "petrol", "diesel", "hpcl", "bpcl", "indianoil", "shell",
      "metro", "dmrc", "bmrc", "mmrda", "fastag", "toll", "parking", "auto", "cab",
      "taxi", "bus", "redbus", "abhibus", "flight", "airlines", "train", "booking.com",
      "airbnb", "oyo", "hostel", "agoda", "zoomcar", "revv"
    ],
  },

  // SHOPPING & RETAIL
  {
    category: "shopping",
    defaultTags: ["Shopping"],
    keywords: [
      "amazon", "flipkart", "myntra", "ajio", "nykaa", "tata cliq", "meesho",
      "zara", "h&m", "uniqlo", "decathlon", "croma", "reliance digital", "apple store",
      "lifestyle", "westside", "pantaloons", "shoppers stop", "max fashion", "lenskart",
      "titan", "fastrack", "ikea", "urban ladder", "pepperfry", "marks and spencer",
      "rel retail", "vijay sales", "poorvika", "sangeetha", "retail", "mart"
    ],
  },

  // BILLS & UTILITIES
  {
    category: "bills",
    defaultTags: ["Bills", "Utilities"],
    keywords: [
      "bescom", "adani electricity", "tata power", "torrent power", "mseb", "ndmc",
      "bses", "mahanagar gas", "igl", "gujarat gas", "bwssb", "water board",
      "airtel", "jio", "vodafone", "idea", "bsnl", "act fibernet", "tata play",
      "dish tv", "sun direct", "netflix", "spotify", "prime video", "hotstar",
      "disney", "youtube premium", "apple.com/bill", "google storage", "icloud",
      "rent", "maintenance", "society", "electricity", "broadband", "recharge",
      "billdesk", "bbps", "credit card payment", "cred"
    ],
  },

  // EDUCATION & LEARNING
  {
    category: "education",
    defaultTags: ["Education"],
    keywords: [
      "coursera", "udemy", "edx", "udacity", "skillshare", "unacademy", "byjus",
      "physicswallah", "allen", "aakash", "college", "school", "university",
      "tuition", "fee", "coaching", "exam", "books", "kindle", "pearson", "wiley",
      "oreilly", "tutorial", "training", "certification"
    ],
  },

  // HEALTH & WELLNESS
  {
    category: "health",
    defaultTags: ["Healthcare"],
    keywords: [
      "apollo", "practo", "netmeds", "1mg", "tata 1mg", "pharmeasy", "medplus",
      "fortis", "max healthcare", "manipal", "narayana", "hospital", "clinic",
      "pharmacy", "chemist", "doctor", "dental", "dentist", "optician", "diagnostic",
      "metropolis", "dr lal pathlabs", "cult.fit", "cult fit", "gym", "fitness",
      "gold's gym", "anytime fitness", "yoga", "wellness"
    ],
  },

  // ENTERTAINMENT
  {
    category: "entertainment",
    defaultTags: ["Entertainment"],
    keywords: [
      "bookmyshow", "pvr", "inox", "cinepolis", "movie", "cinema", "theatre",
      "playstation", "xbox", "steam", "riot games", "nintendo", "gaming", "concert",
      "insider.in", "event", "amusement", "bowling", "club", "pub", "brewery"
    ],
  },

  // INCOME & CREDITS
  {
    category: "income",
    type: "income",
    defaultTags: ["Salary", "Income"],
    keywords: [
      "salary", "payroll", "stipend", "wages", "dividend", "interest cr", "interest credited",
      "neft-cr", "rtgs-cr", "imps-cr", "client payment", "honorarium", "freelance",
      "direct credit", "ach-cr", "refund", "cashback"
    ],
  },
];

// Clean UPI and Bank description strings into human readable names
export function cleanBankNarration(narration: string): { cleanedName: string; merchant: string; referenceNo: string } {
  let cleaned = narration.trim();
  let referenceNo = "";
  let merchant = "";

  // 1. Extract UPI Reference Numbers or UTR (e.g., UPI/123456789012/..., RRN: 123456789012)
  const upiMatch = cleaned.match(/UPI\/(?:CR|DR)?\/?(\d{9,16})/i) || cleaned.match(/(?:UTR|RRN|REF|CHQ|TXN)[:\s\/-]*([A-Z0-9]{8,18})/i);
  if (upiMatch && upiMatch[1]) {
    referenceNo = upiMatch[1];
  }

  // 2. Extract UPI VPA or merchant if format is UPI/123456/MERCHANT/VPA
  const upiParts = cleaned.split("/");
  if (cleaned.toUpperCase().startsWith("UPI/") && upiParts.length >= 3) {
    // Often UPI/123456789/PayeeName/... or UPI/DR/123456/PayeeName
    const potentialMerchant = upiParts.slice(2).find(part => part.length > 2 && !/^\d+$/.test(part));
    if (potentialMerchant) {
      merchant = potentialMerchant.replace(/[_-]/g, " ").trim();
    }
  }

  // 3. Remove common transaction prefixes and noise
  cleaned = cleaned
    .replace(/^UPI\/(?:CR|DR)?\/?\d+\/?/i, "")
    .replace(/^POS\s+\d+\s+/i, "")
    .replace(/^ECOM\s+\d+\s+/i, "")
    .replace(/^NEFT-(?:CR|DR)-/i, "")
    .replace(/^RTGS-(?:CR|DR)-/i, "")
    .replace(/^IMPS-(?:CR|DR)-/i, "")
    .replace(/^ACH-(?:CR|DR)-/i, "")
    .replace(/^INB\s+/i, "")
    .replace(/^MB\s+/i, "")
    .replace(/^ATM\s+WDL\s+/i, "ATM Cash Withdrawal ")
    .replace(/@\w+(\.\w+)?/, "") // strip @okaxis, @okhdfcbank
    .replace(/\s{2,}/g, " ")
    .trim();

  // 4. Format Capitalization
  if (!merchant && cleaned) {
    // Pick the first 3-4 significant words
    const words = cleaned.split(/[\/\-:]/).filter(w => w.trim().length > 1);
    merchant = words[0] || cleaned.slice(0, 30);
  }

  const titleCased = (merchant || cleaned)
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 45);

  return {
    cleanedName: titleCased || "Bank Transaction",
    merchant: titleCased || "Unknown Merchant",
    referenceNo,
  };
}

// Main auto-categorizer function
export function autoCategorizeTransaction(
  description: string,
  rawAmount: number,
  isCredit: boolean
): CategorizationResult {
  const normalizedDesc = description.toLowerCase();
  const { cleanedName, merchant, referenceNo } = cleanBankNarration(description);

  // Check 1: User-saved custom categorization rules first (highest priority)
  const customRules = getCustomRules();
  for (const rule of customRules) {
    if (normalizedDesc.includes(rule.keyword.toLowerCase())) {
      return {
        category: rule.category,
        type: rule.type || (isCredit ? "income" : "expense"),
        isTransfer: rule.type === "transfer" || rule.category === "transport",
        isRefund: isCredit && /refund|reversal|chargeback/i.test(normalizedDesc),
        cleanedName,
        merchant,
        referenceNo,
        suggestedTags: rule.tags.length > 0 ? rule.tags : [rule.category],
        confidence: "high",
        matchedRule: `Custom Rule: "${rule.keyword}"`,
      };
    }
  }

  // Check 2: Refund / Reversal detection (Must not distort regular spending or income)
  const isRefund = /refund|reversal|chargeback|return|cashback/i.test(normalizedDesc);
  if (isRefund && isCredit) {
    return {
      category: "other",
      type: "income",
      isTransfer: false,
      isRefund: true,
      cleanedName: `Refund: ${cleanedName}`,
      merchant,
      referenceNo,
      suggestedTags: ["Refund", "Reversal"],
      confidence: "high",
      matchedRule: "Refund / Reversal Detection",
    };
  }

  // Check 3: Transfers (Self transfers, sweep, internal transfers, wallet loads)
  const isTransfer = /self trf|self transfer|trf to|trf from|internal trf|sweep|fd creation|auto sweep|funds trf/i.test(
    normalizedDesc
  );
  if (isTransfer) {
    return {
      category: "other",
      type: isCredit ? "income" : "expense",
      isTransfer: true,
      isRefund: false,
      cleanedName: `Transfer: ${cleanedName}`,
      merchant,
      referenceNo,
      suggestedTags: ["Transfer", "Internal"],
      confidence: "high",
      matchedRule: "Internal Account Transfer",
    };
  }

  // Check 4: Income keywords
  if (isCredit) {
    for (const rule of CATEGORY_RULES.filter(r => r.type === "income")) {
      for (const kw of rule.keywords) {
        if (normalizedDesc.includes(kw)) {
          return {
            category: "income",
            type: "income",
            isTransfer: false,
            isRefund: false,
            cleanedName,
            merchant,
            referenceNo,
            suggestedTags: rule.defaultTags,
            confidence: "high",
            matchedRule: `Keyword: "${kw}"`,
          };
        }
      }
    }

    // Default credit is income
    return {
      category: "income",
      type: "income",
      isTransfer: false,
      isRefund: false,
      cleanedName,
      merchant,
      referenceNo,
      suggestedTags: ["Income"],
      confidence: "medium",
      matchedRule: "Bank Credit / Deposit",
    };
  }

  // Check 5: Standard Expense Category Matching
  for (const rule of CATEGORY_RULES.filter(r => r.type !== "income")) {
    for (const kw of rule.keywords) {
      if (normalizedDesc.includes(kw)) {
        return {
          category: rule.category,
          type: "expense",
          isTransfer: false,
          isRefund: false,
          cleanedName,
          merchant,
          referenceNo,
          suggestedTags: rule.defaultTags,
          confidence: "high",
          matchedRule: `Matched Keyword: "${kw}"`,
        };
      }
    }
  }

  // Fallback for unclassified debit
  return {
    category: "other",
    type: "expense",
    isTransfer: false,
    isRefund: false,
    cleanedName,
    merchant,
    referenceNo,
    suggestedTags: ["Uncategorized"],
    confidence: "low",
    matchedRule: "General Debit",
  };
}

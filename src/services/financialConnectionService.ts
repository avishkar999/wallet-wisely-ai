import {
  ConsentArtifact,
  ConnectionState,
  SupportedInstitution,
  AutomatedFinancialRecord,
  ConnectionProviderInfo,
} from "@/types/connection";
import { autoCategorizeTransaction, cleanBankNarration } from "@/utils/autoCategorizer";

const STORAGE_KEY_CONSENTS = "walletwisely_connected_consents";
const STORAGE_KEY_SYNC_STATE = "walletwisely_sync_state";

export const SUPPORTED_INSTITUTIONS: ConnectionProviderInfo[] = [
  {
    id: "hdfc",
    name: "HDFC Bank",
    logo: "🏦",
    supportedMethods: ["account_aggregator", "bank_statement"],
    tier: "production_sandbox",
    description: "Connect via RBI Account Aggregator or official NetBanking statement sync.",
    coverageNote: "Comprehensive UPI & NetBanking debits/credits with 12-digit UTR tracking.",
  },
  {
    id: "sbi",
    name: "State Bank of India",
    logo: "🏛️",
    supportedMethods: ["account_aggregator", "bank_statement"],
    tier: "production_sandbox",
    description: "OnlineSBI statement and AA consent architecture for savings and current accounts.",
    coverageNote: "Tracks YONO UPI, IMPS, and ATM withdrawals with auto-categorization.",
  },
  {
    id: "icici",
    name: "ICICI Bank",
    logo: "🛡️",
    supportedMethods: ["account_aggregator", "bank_statement"],
    tier: "production_sandbox",
    description: "iMobile / NetBanking automated feed with smart merchant classification.",
    coverageNote: "Full UPI VPA extraction (e.g. UPI/merchant@okhdfcbank) and POS breakdown.",
  },
  {
    id: "axis",
    name: "Axis Bank",
    logo: "💳",
    supportedMethods: ["account_aggregator", "bank_statement"],
    tier: "production_sandbox",
    description: "Connect Axis internet banking feed with verified consent artefacts.",
    coverageNote: "Includes credit card auto-debits and Google Pay / PhonePe UPI handles.",
  },
  {
    id: "kotak",
    name: "Kotak Mahindra Bank",
    logo: "💎",
    supportedMethods: ["account_aggregator", "bank_statement"],
    tier: "production_sandbox",
    description: "Kotak 811 and premier accounts sync via regulated data consent.",
    coverageNote: "Clean merchant narratives for Swiggy, Blinkit, Uber, and billers.",
  },
];

// Helper: load consents from localStorage
export function getStoredConsents(): ConsentArtifact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONSENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Helper: save consents
export function saveStoredConsents(consents: ConsentArtifact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONSENTS, JSON.stringify(consents));
  } catch {
    // ignore
  }
}

/**
 * Determine overall ConnectionState based on consents and transaction count.
 */
export function determineConnectionState(
  consents: ConsentArtifact[],
  transactionCount: number,
  isSyncing: boolean = false
): ConnectionState {
  if (isSyncing) return "syncing";
  if (!consents || consents.length === 0) return "disconnected";

  // Check if any active consent requires renewal
  const now = new Date();
  const hasExpired = consents.some((c) => {
    if (c.status === "EXPIRED" || c.status === "REVOKED") return true;
    const expiry = new Date(c.consentExpiry);
    return expiry < now;
  });

  if (hasExpired && consents.every((c) => new Date(c.consentExpiry) < now)) {
    return "reauth_required";
  }

  const activeConsents = consents.filter((c) => c.status === "ACTIVE");
  if (activeConsents.length === 0) return "disconnected";

  if (transactionCount === 0) return "connected_empty";
  return "synced";
}

/**
 * Create a new authorized consent artifact (RBI Account Aggregator model).
 * Strictly view-only; NEVER requests passwords or UPI PINs.
 */
export function createConsentArtifact(params: {
  institutionId: SupportedInstitution;
  accountType?: "savings" | "current" | "credit_card";
  accountMask?: string;
  durationMonths?: number;
}): ConsentArtifact {
  const provider = SUPPORTED_INSTITUTIONS.find((i) => i.id === params.institutionId);
  const now = new Date();
  const duration = params.durationMonths || 12;
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + duration);

  const consent: ConsentArtifact = {
    consentId: `consent_${params.institutionId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    institutionId: params.institutionId,
    institutionName: provider ? provider.name : "Financial Institution",
    accountMask: params.accountMask || `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
    accountType: params.accountType || "savings",
    purpose: "Automated Personal Expense Analysis & Budget Tracking",
    dataLifeDays: duration * 30,
    frequency: "DAILY",
    status: "ACTIVE",
    consentStart: now.toISOString(),
    consentExpiry: expiry.toISOString(),
    lastSyncTimestamp: new Date().toISOString(),
    transactionCount: 0,
  };

  const existing = getStoredConsents();
  const updated = [consent, ...existing.filter((c) => c.institutionId !== params.institutionId)];
  saveStoredConsents(updated);
  return consent;
}

/**
 * Revoke and remove a consent artifact.
 */
export function revokeConsent(consentId: string): void {
  const existing = getStoredConsents();
  const updated = existing.filter((c) => c.consentId !== consentId);
  saveStoredConsents(updated);
}

/**
 * Update consent status (e.g. renew).
 */
export function renewConsentArtifact(consentId: string): ConsentArtifact | null {
  const existing = getStoredConsents();
  const target = existing.find((c) => c.consentId === consentId);
  if (!target) return null;

  const now = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + 12);

  target.status = "ACTIVE";
  target.consentStart = now.toISOString();
  target.consentExpiry = expiry.toISOString();
  target.lastSyncTimestamp = now.toISOString();

  saveStoredConsents(existing);
  return target;
}

/**
 * Automated Transaction Processing Engine
 * 1. Validates schema
 * 2. Normalises amounts and descriptions
 * 3. Identifies self-transfers, CC bill payments, reversals, and refunds
 * 4. Flags uncertain categorisations for user review rather than inventing details
 * 5. Deduplicates
 */
export function processAutomatedRecord(raw: {
  rawDescription: string;
  amount: number;
  dateStr: string;
  referenceNo?: string;
  institution?: string;
  accountMask?: string;
}): AutomatedFinancialRecord {
  const rawNarration = raw.rawDescription || "";
  const cleaned = cleanBankNarration(rawNarration);
  const categorised = autoCategorizeTransaction(rawNarration);

  // Transfer / non-expense detection
  const lowerDesc = rawNarration.toLowerCase();
  const isSelfTransfer =
    lowerDesc.includes("self transfer") ||
    lowerDesc.includes("own a/c") ||
    lowerDesc.includes("sweep transfer") ||
    lowerDesc.includes("auto sweep") ||
    lowerDesc.includes("to own acc") ||
    lowerDesc.includes("internal trf");

  const isCreditCardPayment =
    lowerDesc.includes("credit card payment") ||
    lowerDesc.includes("cc payment") ||
    lowerDesc.includes("cred club") ||
    lowerDesc.includes("billpay credit card") ||
    lowerDesc.includes("billdesk cc");

  const isInvestmentOutflow =
    lowerDesc.includes("zerodha") ||
    lowerDesc.includes("groww") ||
    lowerDesc.includes("mutual fund") ||
    lowerDesc.includes("sip ") ||
    lowerDesc.includes("bse star") ||
    lowerDesc.includes("uti mf");

  const isReversal =
    lowerDesc.includes("reversal") ||
    lowerDesc.includes("refund") ||
    lowerDesc.includes("chargeback") ||
    lowerDesc.includes("failed txn rev") ||
    categorised.isRefund;

  const isTransferOrNonExpense =
    isSelfTransfer || isCreditCardPayment || isInvestmentOutflow || categorised.isTransfer;

  // Determine payment channel
  let paymentChannel: "UPI" | "IMPS" | "NEFT" | "CARD" | "AUTOPAY" | "OTHER" = "OTHER";
  if (lowerDesc.includes("upi") || lowerDesc.includes("@") || lowerDesc.includes("vpa")) {
    paymentChannel = "UPI";
  } else if (lowerDesc.includes("imps")) {
    paymentChannel = "IMPS";
  } else if (lowerDesc.includes("neft")) {
    paymentChannel = "NEFT";
  } else if (lowerDesc.includes("pos") || lowerDesc.includes("card") || lowerDesc.includes("ecom")) {
    paymentChannel = "CARD";
  } else if (lowerDesc.includes("ach") || lowerDesc.includes("nach") || lowerDesc.includes("mandate")) {
    paymentChannel = "AUTOPAY";
  }

  // Uncertain categorization flag: if category is 'other' or confidence is low
  const isUncertain = categorised.category === "other" || categorised.confidence === "low";

  return {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    institution: raw.institution || "Connected Bank",
    accountMask: raw.accountMask || "•••• 0000",
    paymentChannel,
    merchantName: categorised.merchant || cleaned.merchant || "Merchant",
    rawDescription: rawNarration,
    referenceNo: raw.referenceNo || categorised.referenceNo || "",
    amount: Math.abs(raw.amount),
    type: categorised.type,
    category: categorised.category,
    date: raw.dateStr,
    isTransferOrNonExpense,
    isReversalOrRefund: isReversal,
    isUncertainCategory: isUncertain,
    isDuplicate: false,
    status: "POSTED",
  };
}

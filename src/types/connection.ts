export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "syncing"
  | "connected_empty"
  | "synced"
  | "reauth_required"
  | "error";

export type SupportedInstitution =
  | "hdfc"
  | "sbi"
  | "icici"
  | "axis"
  | "kotak"
  | "paytm_bank"
  | "other";

export interface ConsentArtifact {
  consentId: string;
  institutionId: SupportedInstitution;
  institutionName: string;
  accountMask: string; // e.g. "•••• 4821"
  accountType: "savings" | "current" | "credit_card";
  purpose: "Automated Personal Expense Analysis & Budget Tracking";
  dataLifeDays: number;
  frequency: "DAILY" | "ON_DEMAND" | "REALTIME";
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED";
  consentStart: string; // ISO date
  consentExpiry: string; // ISO date
  lastSyncTimestamp: string | null;
  transactionCount: number;
}

export interface AutomatedFinancialRecord {
  id: string;
  institution: string;
  accountMask: string;
  paymentChannel: "UPI" | "IMPS" | "NEFT" | "CARD" | "AUTOPAY" | "OTHER";
  merchantName: string;
  rawDescription: string;
  referenceNo?: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  date: string; // ISO YYYY-MM-DD
  isTransferOrNonExpense: boolean; // transfers, credit card bill payments, internal moves
  isReversalOrRefund: boolean;
  isUncertainCategory: boolean; // flags ambiguous records for user review rather than inventing details
  isDuplicate: boolean;
  status: "POSTED" | "PENDING";
}

export interface ConnectionProviderInfo {
  id: string;
  name: string;
  logo: string;
  supportedMethods: ("account_aggregator" | "bank_statement")[];
  tier: "production_sandbox" | "statement_sync" | "regulated_aa";
  description: string;
  coverageNote: string;
}

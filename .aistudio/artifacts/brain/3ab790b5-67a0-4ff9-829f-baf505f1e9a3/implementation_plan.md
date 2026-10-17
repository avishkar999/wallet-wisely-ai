# Bank Statement Import, Auto-Categorizer & Dashboard Category Filter

A bank statement import and automated categorization engine for CoinKeeper/WalletWisely that parses CSV and Excel statements (.xlsx, .xls), normalizes records via preset bank profiles and interactive column mapping, prevents duplicate entries, and enables custom category tagging and dynamic dashboard category filtering.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed via interactive user clarification and have been locked into the design:

- **Confirmed Decision 1: Bank Profile Mapping**: Bank statement normalization uses built-in preset bank profiles (HDFC, SBI, ICICI, Axis, Kotak, Chase/Generic) paired with a live visual column mapper fallback so any statement variant can be processed effortlessly.
- **Confirmed Decision 2: Duplicate Handling**: Duplicate transactions (matching on date + amount + description/reference against existing records) are automatically flagged and pre-skipped, with a dedicated preview toggle allowing users to inspect and selectively re-include items.
- **Confirmed Decision 3: UI Integration**: The Bank Import workflow is integrated as a responsive modal dialog directly accessible from the primary top navigation header (next to "+ Add Transaction") and from the Transactions History page ("Import Statement" action button).
- **Confirmed Decision 4: Dashboard Category Filter**: The home dashboard gains a Category & Tag filter bar allowing users to isolate spending, budget tracking, and summary cards by specific categories without altering the underlying global ledger.
- **Confirmed Decision 5: Data Privacy & Client-Side Execution**: All CSV and Excel parsing runs entirely in-memory within the client browser. No files, passwords, UPI PINs, or raw bank files are transmitted to external servers.

---

## 1. Overview & Core Concept

- **What It Does**: Enables users to drag and drop or select bank statements in `.csv`, `.xlsx`, or `.xls` format. The system parses date, description, amount, transaction type (debit/credit), merchant, and reference code. An intelligent categorization engine classifies expenses into canonical categories (*Food, Travel, Shopping, Bills, Education, Transfers, Healthcare, Other*) or matches existing custom user categories. A comprehensive preview screen highlights validation issues, skips duplicate records, separates refunds/reversals/transfers from expense totals, and allows one-click batch import directly into the user's ledger and monthly budget.
- **Target Audience / Persona**: Students, salaried professionals, freelancers, and business owners who want fast, batch bank reconciliations without tedious manual transaction entry.
- **Key Value**: Eliminates manual data entry friction; reconciles months of spending in seconds while preventing double counting and preserving clean personal budgets.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Triggering Import**:
   - The user clicks **"Import Statement"** from the top header or from the **Transactions History** screen.
   - A modal opens with a clean drag-and-drop dropzone supporting `.csv`, `.xlsx`, and `.xls`.

2. **Bank Profile & Column Mapping**:
   - The user selects a bank preset (e.g., *HDFC Bank, State Bank of India, ICICI Bank, Axis Bank, Kotak Mahindra, or Generic Standard*) or allows auto-detection.
   - An interactive mapping review displays detected columns for Date, Description, Amount (or separate Debit/Credit columns), Reference ID, and Category/Tag.

3. **Intelligent Normalization & Categorization**:
   - Dates are parsed across common banking formats (`DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`).
   - Descriptions are sanitized to extract clean merchant names and payment modes (e.g., UPI, IMPS, POS, NEFT, ATM, NetBanking).
   - Rules engine tags records into Food, Travel, Shopping, Bills, Education, Healthcare, Transfers, and custom user labels.
   - Credits matching known refund/reversal keywords or transfer patterns are isolated so they do not artificially distort spending summaries.

4. **Interactive Validation & Preview Curtain**:
   - Summary banner displays: *Total Transactions*, *Valid Items*, *Auto-Skipped Duplicates*, *Total Inflows*, and *Total Outflows*.
   - Tabular preview with inline editing: users can change an auto-assigned category, adjust tags, or toggle inclusion.
   - Duplicates tab allows inspecting matched existing records with side-by-side comparison.

5. **Commit & Dashboard Impact**:
   - On confirmation, transactions are batch-inserted into the user's database.
   - The dashboard and monthly budget reflect updated figures immediately.
   - A toast notification confirms: *"Imported 42 transactions · 3 duplicates skipped"*.

6. **Dashboard Category Filtering**:
   - On the main dashboard, an interactive segmented filter bar lets users filter between "All Categories" and individual categories (e.g., "Food", "Bills", "Groceries").
   - Spending metrics, recent transactions list, and budget progress cards respond dynamically to the selected category filter.

### Visual Identity & Theme

- **Aesthetic Direction**: High-end modern fintech, clean dark/light mode posture, crisp typography with tabular numbers (`tabular-nums`), hairline dividers, and zero mechanical clutter.
- **Color Palette & Semantic Tokens**:
  - Background: Neutral dark slate / clean surface background.
  - Success / Inflow: Mint emerald (`#10b981`) for deposits and savings.
  - Expense / Outflow: Crimson rose (`#f43f5e`) for debits.
  - Duplicates / Warning: Amber (`#f59e0b`) for skipped duplicates and review warnings.
  - Primary Accent: Deep Indigo / Violet (`#6366f1`) for import actions.
- **Typography**: Display structure using `Plus Jakarta Sans`, data grids and monetary amounts with monospace tabular figures (`font-mono` / `tabular-nums`).

---

## 3. Key Product Decisions & Trade-Offs

- **Client-Side Parsing via `xlsx` & Native Delimited Parser**:
  - *Chosen Approach*: Lightweight client-side parsing using `xlsx` for Excel workbooks and delimiter-aware parsing for CSVs.
  - *Why*: Zero server transmission of sensitive bank statements, instant feedback, no cold-start latency, complete user privacy.
  - *Alternatives Considered*: Backend Python/Node parser service; rejected due to latency and data sovereignty concerns.

- **Deduplication Strategy**:
  - *Chosen Approach*: Fingerprinting based on normalized date string + absolute amount + clean merchant/reference string against existing user transactions. Exact matches are flagged with `isDuplicate = true` and unchecked by default.
  - *Why*: Prevents accidental double counting when users re-upload quarterly or overlapping statements, while giving full control to override.

- **Transfer & Refund Isolation**:
  - *Chosen Approach*: Classifying credit refunds (e.g., "REFUND", "REVERSAL", "CASHBACK") as negative expenses or offsetting credits, and internal transfers (e.g., "TRF TO ACCT", "SELF TRANSFER") as transfers rather than net income/expense.
  - *Why*: Guarantees accurate personal expense calculations without inflated income or artificial expense spikes.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interface                                │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │ Top Header / Txn History  │      │     Adaptive Dashboard      │   │
│   │  [Import Statement Button]│      │ [Category Filter Segmented] │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌───────────────────────────────────────┐   ┌───────────────────────────┐
│       BankStatementImportDialog       │   │  Filtered Summary Metrics │
│                                       │   │  - Filtered Total Spend   │
│  ┌─────────────────────────────────┐  │   │  - Category Budget Card   │
│  │ 1. Drag & Drop (.csv, .xlsx)    │  │   │  - Filtered Txn History   │
│  │ 2. Bank Profile / Column Mapper │  │   └───────────────────────────┘
│  │ 3. Normalization Engine         │  │
│  │ 4. Deduplication & Validator    │  │
│  │ 5. Review & Batch Commit        │  │
│  └─────────────────────────────────┘  │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Bank Statement Engine Pipeline                     │
│                                                                        │
│  ┌───────────────┐     ┌────────────────┐     ┌─────────────────────┐  │
│  │ Statement     │ ──> │ Bank Presets & │ ──> │ Rule-based Auto     │  │
│  │ File Parser   │     │ Column Normal- │     │ Categorizer         │  │
│  │ (CSV / Excel) │     │ ization        │     │ (Merchant + Keyword)│  │
│  └───────────────┘     └────────────────┘     └──────────┬──────────┘  │
│                                                          │             │
│                                                          ▼             │
│  ┌───────────────┐     ┌────────────────┐     ┌─────────────────────┐  │
│  │ Supabase /    │ <── │ Batch Insert   │ <── │ Deduplication &     │  │
│  │ Mock Database │     │ Mutation Hook  │     │ Anomaly Detection   │  │
│  └───────────────┘     └────────────────┘     └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Structures & Normalization Schema

```typescript
export interface ParsedBankTransaction {
  id: string; // client temporary ID
  rawDate: string;
  normalizedDate: string; // YYYY-MM-DD
  rawDescription: string;
  cleanMerchant: string;
  referenceId?: string;
  amount: number;
  type: "expense" | "income" | "transfer";
  category: string; // food, shopping, transport, bills, health, etc.
  customTag?: string;
  paymentMethod: "upi" | "debit_card" | "credit_card" | "neft" | "cash" | "other";
  isDuplicate: boolean;
  duplicateMatchId?: string;
  selectedForImport: boolean;
  validationError?: string;
}

export interface BankPresetProfile {
  id: string;
  name: string;
  dateColumn: string[];
  descriptionColumn: string[];
  debitColumn: string[];
  creditColumn: string[];
  amountColumn: string[];
  typeColumn?: string[];
  refColumn?: string[];
  dateFormat: string;
}
```

### Components to Build & Extend

1. **`src/utils/bankStatementParser.ts`**:
   - Parses CSV strings or Excel ArrayBuffers.
   - Preset mapping definitions for HDFC, SBI, ICICI, Axis, Kotak, and Standard/Generic formats.
   - Fuzzy column detection (headers matching `date`, `txn_date`, `narration`, `description`, `withdrawal`, `debit`, `deposit`, `credit`, `ref_no`, `chq/ref no`).

2. **`src/utils/autoCategorizer.ts`**:
   - Merchant keyword library (e.g. Swiggy/Zomato -> Food; Uber/Ola/Metro -> Travel; Amazon/Flipkart/Myntra -> Shopping; Airtel/Jio/Bescom -> Bills; Apollo/PharmEasy -> Health; Zerodha/Groww -> Investment).
   - Detection of refunds, reversals, cashback, and peer-to-peer transfers.

3. **`src/components/transactions/BankStatementImportDialog.tsx`**:
   - Full 3-step import wizard: Upload -> Column Verification -> Preview & Confirmation.
   - Batch inclusion/exclusion checkboxes and duplicate inspection drawer.

4. **`src/components/transactions/TransactionsHistory.tsx` & `src/pages/Index.tsx`**:
   - Integration of the "Import Statement" action button in both locations.
   - Custom tag support in transaction listing and editing.

5. **`src/components/dashboard/AdaptiveDashboard.tsx`**:
   - Category filtering bar allowing real-time dashboard filtering by category or custom tag.

---

## 5. Implementation Sequence (Post-Approval)

1. **Dependency Installation**: Install `xlsx` package for robust `.xlsx` and `.xls` binary workbook parsing.
2. **Statement Parser & Categorizer**: Create `bankStatementParser.ts` and `autoCategorizer.ts` with bank presets and keyword dictionaries.
3. **Import Dialog Component**: Build `BankStatementImportDialog.tsx` with dropzone, column mapper, preview table, and duplicate toggles.
4. **Batch Mutation Hook**: Add batch insert helper in `useTransactions.ts` ensuring clean atomic updates.
5. **UI Integration**: Connect the import trigger into `Index.tsx` header and `TransactionsHistory.tsx`.
6. **Dashboard Filtering**: Add category filter tabs to the dashboard and connect to card recalculations.
7. **Verification**: Run TypeScript compilation and build tests to verify zero regressions.

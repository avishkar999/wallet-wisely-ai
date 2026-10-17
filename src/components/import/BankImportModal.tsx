import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Download,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Info,
  Lock,
  Search,
  Tag,
  Check,
  X,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransactions, useBatchAddTransactions } from "@/hooks/useTransactions";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import {
  BANK_PROFILES,
  BankProfileId,
  ColumnMappingConfig,
  NormalizedImportTransaction,
  ParseResult,
  parseBankStatementFile,
  generateSampleStatementCSV,
  generateSampleStatementExcel,
  detectColumnMapping,
  normalizeRowsToTransactions,
} from "@/utils/bankStatementParser";
import {
  TransactionCategory,
  PaymentMethod,
  getKnownCustomTags,
  addKnownCustomTag,
  saveCustomRule,
} from "@/utils/autoCategorizer";
import { auth } from "@/lib/firebase";
import { batchCreateFirestoreTransactions, FirestoreTransaction } from "@/services/firestoreService";

interface BankImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_OPTIONS: { id: TransactionCategory; label: string }[] = [
  { id: "food", label: "Food & Dining" },
  { id: "shopping", label: "Shopping & Retail" },
  { id: "travel", label: "Travel & Commute" },
  { id: "bills", label: "Bills & Utilities" },
  { id: "education", label: "Education" },
  { id: "health", label: "Healthcare & Medical" },
  { id: "entertainment", label: "Entertainment" },
  { id: "recharges", label: "Recharges & Mobile" },
  { id: "income", label: "Income / Deposits" },
  { id: "other", label: "Other / Uncategorized" },
];

export function BankImportModal({ open, onOpenChange }: BankImportModalProps) {
  const { toast } = useToast();
  const { formatMoney } = useCoinKeeper();
  const { data: existingTransactions = [] } = useTransactions();
  const batchAddTransactions = useBatchAddTransactions();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow steps: 'upload' -> 'mapping' (optional) -> 'preview' -> 'complete'
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [selectedProfile, setSelectedProfile] = useState<BankProfileId>("generic");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Working editable copy of transactions in preview step
  const [workingTransactions, setWorkingTransactions] = useState<NormalizedImportTransaction[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig | null>(null);

  // Preview filtering & search
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "ready" | "duplicates" | "special" | "issues">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoSkipDuplicates, setAutoSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Quick tag addition state
  const [newTagInput, setNewTagInput] = useState<{ txnId: string; text: string } | null>(null);
  const knownTags = useMemo(() => getKnownCustomTags(), []);

  // Handle file drop / selection
  const handleFileSelected = async (file: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      toast({
        title: "Unsupported File Format",
        description: "Please upload a CSV (.csv) or Excel (.xlsx, .xls) bank statement.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setIsParsing(true);

    try {
      const result = await parseBankStatementFile(file, selectedProfile, existingTransactions);
      setParseResult(result);
      setColumnMapping(result.mapping);
      setWorkingTransactions(result.transactions);

      if (selectedProfile === "custom") {
        setStep("mapping");
      } else {
        setStep("preview");
      }

      toast({
        title: "Statement Parsed",
        description: `Successfully analyzed ${result.transactions.length} transactions from ${file.name}.`,
      });
    } catch (err: any) {
      console.error("Statement parse error:", err);
      toast({
        title: "Could Not Parse Statement",
        description: err.message || "Failed to read statement columns. Try selecting 'Custom Mapping'.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Re-run normalizer if column mapping changed in mapping step
  const applyCustomMapping = () => {
    if (!parseResult || !columnMapping) return;

    try {
      const updatedTxns = normalizeRowsToTransactions(
        parseResult.rawRows,
        columnMapping,
        existingTransactions
      );
      setWorkingTransactions(updatedTxns);
      setStep("preview");
      toast({
        title: "Mapping Applied",
        description: `Mapped ${updatedTxns.length} transactions. Review your entries below.`,
      });
    } catch (err: any) {
      toast({
        title: "Mapping Error",
        description: err.message || "Could not apply column mapping.",
        variant: "destructive",
      });
    }
  };

  // Toggle single row inclusion
  const toggleRowInclusion = (id: string) => {
    setWorkingTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, included: !t.included } : t))
    );
  };

  // Select all or deselect all in current view
  const toggleSelectAllInView = (selected: boolean) => {
    const visibleIds = new Set(filteredTransactions.map(t => t.id));
    setWorkingTransactions(prev =>
      prev.map(t => (visibleIds.has(t.id) ? { ...t, included: selected } : t))
    );
  };

  // Auto-skip duplicates toggle handler
  const handleAutoSkipToggle = (checked: boolean) => {
    setAutoSkipDuplicates(checked);
    setWorkingTransactions(prev =>
      prev.map(t => {
        if (t.isDuplicate) {
          return { ...t, included: !checked };
        }
        return t;
      })
    );
  };

  // Row field update helpers
  const updateRowField = (id: string, updates: Partial<NormalizedImportTransaction>) => {
    setWorkingTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Add tag to transaction
  const handleAddTagToRow = (txnId: string, tag: string) => {
    const clean = tag.trim().replace(/^#/, "");
    if (!clean) return;
    addKnownCustomTag(clean);

    setWorkingTransactions(prev =>
      prev.map(t => {
        if (t.id === txnId) {
          const currentTags = t.tags || [];
          if (!currentTags.includes(clean)) {
            return { ...t, tags: [...currentTags, clean] };
          }
        }
        return t;
      })
    );
    setNewTagInput(null);
  };

  // Remove tag from row
  const handleRemoveTagFromRow = (txnId: string, tagToRemove: string) => {
    setWorkingTransactions(prev =>
      prev.map(t => {
        if (t.id === txnId) {
          return { ...t, tags: t.tags.filter(t => t !== tagToRemove) };
        }
        return t;
      })
    );
  };

  // Filtered transactions in preview
  const filteredTransactions = useMemo(() => {
    return workingTransactions.filter(txn => {
      // Tab filter
      if (activeFilterTab === "ready" && (!txn.included || txn.isDuplicate)) return false;
      if (activeFilterTab === "duplicates" && !txn.isDuplicate) return false;
      if (activeFilterTab === "special" && !txn.isTransfer && !txn.isRefund) return false;
      if (activeFilterTab === "issues" && !txn.validationError) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = txn.name.toLowerCase().includes(query);
        const matchesDesc = txn.rawDescription.toLowerCase().includes(query);
        const matchesCat = txn.category.toLowerCase().includes(query);
        const matchesTags = txn.tags.some(tg => tg.toLowerCase().includes(query));
        const matchesRef = txn.referenceNo.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesCat || matchesTags || matchesRef;
      }

      return true;
    });
  }, [workingTransactions, activeFilterTab, searchQuery]);

  // Real-time calculations of selected items
  const includedCount = workingTransactions.filter(t => t.included).length;
  const duplicateCount = workingTransactions.filter(t => t.isDuplicate).length;
  const refundCount = workingTransactions.filter(t => t.isRefund).length;
  const transferCount = workingTransactions.filter(t => t.isTransfer).length;
  const issueCount = workingTransactions.filter(t => Boolean(t.validationError)).length;

  const totalExpenseOutflow = workingTransactions
    .filter(t => t.included && t.type === "expense" && !t.isTransfer)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncomeInflow = workingTransactions
    .filter(t => t.included && t.type === "income" && !t.isTransfer)
    .reduce((sum, t) => sum + t.amount, 0);

  // Execute Batch Import
  const handleConfirmImport = async () => {
    const toImport = workingTransactions.filter(t => t.included);

    if (toImport.length === 0) {
      toast({
        title: "No Transactions Selected",
        description: "Please check at least one transaction to import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      // Map to supabase insert shape
      const batchPayload = toImport.map(t => {
        // Teach custom rule engine when user customized a category
        if (t.name && t.category) {
          saveCustomRule({
            keyword: t.name.slice(0, 15),
            category: t.category,
            tags: t.tags,
            type: t.type,
          });
        }

        return {
          name: t.name,
          amount: t.amount,
          type: t.type,
          category: t.category,
          transaction_date: t.normalizedDate,
          payment_method: t.paymentMethod,
          description: t.referenceNo
            ? `${t.rawDescription} [Ref: ${t.referenceNo}]`
            : t.rawDescription,
          tags: t.tags,
          merchant: t.merchant,
          reference_no: t.referenceNo,
          raw_description: t.rawDescription,
        };
      });

      await batchAddTransactions.mutateAsync(batchPayload);

      // Persist to Firebase Firestore if authenticated
      if (auth.currentUser) {
        try {
          const firestoreTxs: FirestoreTransaction[] = toImport.map((t, idx) => ({
            id: `tx_${Date.now()}_${idx}`,
            userId: auth.currentUser!.uid,
            amount: t.amount,
            type: t.type,
            category: t.category,
            date: t.normalizedDate,
            description: t.referenceNo ? `${t.rawDescription} [Ref: ${t.referenceNo}]` : t.rawDescription,
            merchant: t.merchant,
            paymentMethod: t.paymentMethod,
            referenceNo: t.referenceNo,
            tags: t.tags,
            source: "bank_import",
            importBatchId: parseResult?.batchId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          await batchCreateFirestoreTransactions(firestoreTxs, {
            id: parseResult?.batchId || `batch_${Date.now()}`,
            userId: auth.currentUser.uid,
            fileName: uploadedFile?.name || "bank_statement.csv",
            bankName: detectedPreset?.name || "Auto-detected Bank",
            importedCount: toImport.length,
            duplicatesSkipped: duplicateCount,
            totalAmount: totalExpenseOutflow + totalIncomeInflow,
            importedAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.warn("Firestore sync warning during batch import:", fsErr);
        }
      }

      toast({
        title: "Import Successful!",
        description: `Imported ${toImport.length} transactions. Outflow: ${formatMoney(totalExpenseOutflow)}, Inflow: ${formatMoney(totalIncomeInflow)}.`,
      });

      // Reset and close
      setUploadedFile(null);
      setParseResult(null);
      setWorkingTransactions([]);
      setStep("upload");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Batch import error:", err);
      toast({
        title: "Import Failed",
        description: err.message || "Failed to save transactions to database.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImportFlow = () => {
    setUploadedFile(null);
    setParseResult(null);
    setWorkingTransactions([]);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 border-border/60 bg-card/95 backdrop-blur-2xl">
        {/* Modal Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/50 bg-secondary/15 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Import Bank Statement</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
                    CSV & Excel
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Universal statement parser with automated expense categorizer, duplicate detection & zero credential leaks.
                </DialogDescription>
              </div>
            </div>

            {step !== "upload" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetImportFlow}
                className="text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Start Over
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* STEP 1: Upload & Preset Selection */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Bank Profile Selection */}
              <div>
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5 block">
                  1. Select Bank Format Profile
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {BANK_PROFILES.map(profile => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedProfile(profile.id)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        selectedProfile === profile.id
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                          : "border-border/60 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-foreground truncate">{profile.bankName}</span>
                        {selectedProfile === profile.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {profile.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div>
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2.5 block">
                  2. Upload Statement File
                </Label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-primary/80 rounded-2xl p-8 text-center bg-secondary/10 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-14 h-14 rounded-2xl bg-secondary/50 group-hover:bg-primary/10 border border-border group-hover:border-primary/30 flex items-center justify-center mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-all">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>

                  <h4 className="text-sm font-semibold text-foreground">
                    {isParsing ? "Analyzing statement columns..." : "Click or drag your bank statement here"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Supports <span className="font-mono text-foreground">.CSV</span>,{" "}
                    <span className="font-mono text-foreground">.XLSX</span>, and{" "}
                    <span className="font-mono text-foreground">.XLS</span> statement files from any bank.
                  </p>

                  <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border">HDFC Bank</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border">SBI</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border">ICICI</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border">Axis</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border">Paytm / UPI</span>
                  </div>
                </div>
              </div>

              {/* Sample Files Download for immediate zero-friction testing */}
              <div className="p-3.5 rounded-xl border border-border/50 bg-secondary/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Don't have a statement handy? Download our realistic sample statements to test right away:
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateSampleStatementCSV}
                    className="text-xs h-7 gap-1 border-border/60"
                  >
                    <Download className="w-3 h-3" /> Sample CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateSampleStatementExcel}
                    className="text-xs h-7 gap-1 border-border/60"
                  >
                    <Download className="w-3 h-3" /> Sample Excel
                  </Button>
                </div>
              </div>

              {/* Security & Access Control Guardrail Banner */}
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-400 block mb-0.5">
                    Zero-Credential & Client-Side Privacy Guarantee
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Statements are parsed 100% locally in your browser. CoinKeeper never requires, accesses, or stores
                    your UPI PINs, OTPs, or net banking passwords. Your financial data is protected with strict
                    user-level isolation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Custom Mapping Override */}
          {step === "mapping" && columnMapping && parseResult && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Map Statement Columns</h3>
                  <p className="text-xs text-muted-foreground">
                    Detected {parseResult.headers.length} columns in <span className="font-mono text-foreground">{parseResult.fileName}</span>. Match your file columns below:
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={applyCustomMapping}
                  className="bg-primary text-primary-foreground text-xs gap-1 h-8"
                >
                  Apply & Preview <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border/60 bg-secondary/15">
                {/* Date Column */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Date Column *</Label>
                  <Select
                    value={columnMapping.dateColumn}
                    onValueChange={val => setColumnMapping(prev => prev ? { ...prev, dateColumn: val } : null)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select date column" />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description Column */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Narration / Description Column *</Label>
                  <Select
                    value={columnMapping.descColumn}
                    onValueChange={val => setColumnMapping(prev => prev ? { ...prev, descColumn: val } : null)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select description column" />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Mode */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-foreground">Amount Column Style</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="amountMode"
                        checked={columnMapping.amountMode === "split"}
                        onChange={() => setColumnMapping(prev => prev ? { ...prev, amountMode: "split" } : null)}
                        className="accent-primary"
                      />
                      <span>Separate Debit & Credit Columns (Recommended for Banks)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="amountMode"
                        checked={columnMapping.amountMode === "single"}
                        onChange={() => setColumnMapping(prev => prev ? { ...prev, amountMode: "single" } : null)}
                        className="accent-primary"
                      />
                      <span>Single Amount Column (with +/- or CR/DR indicator)</span>
                    </label>
                  </div>
                </div>

                {columnMapping.amountMode === "split" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Debit / Withdrawal Column *</Label>
                      <Select
                        value={columnMapping.debitColumn || ""}
                        onValueChange={val => setColumnMapping(prev => prev ? { ...prev, debitColumn: val } : null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select debit column" />
                        </SelectTrigger>
                        <SelectContent>
                          {parseResult.headers.map(h => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Credit / Deposit Column *</Label>
                      <Select
                        value={columnMapping.creditColumn || ""}
                        onValueChange={val => setColumnMapping(prev => prev ? { ...prev, creditColumn: val } : null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select credit column" />
                        </SelectTrigger>
                        <SelectContent>
                          {parseResult.headers.map(h => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium text-foreground">Amount Column *</Label>
                    <Select
                      value={columnMapping.amountColumn || ""}
                      onValueChange={val => setColumnMapping(prev => prev ? { ...prev, amountColumn: val } : null)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select amount column" />
                      </SelectTrigger>
                      <SelectContent>
                        {parseResult.headers.map(h => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reference / Cheque No */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Reference / UTR / Cheque (Optional)</Label>
                  <Select
                    value={columnMapping.refColumn || "none"}
                    onValueChange={val => setColumnMapping(prev => prev ? { ...prev, refColumn: val === "none" ? "" : val } : null)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Optional reference column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None / Auto-extract</SelectItem>
                      {parseResult.headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Date Format</Label>
                  <Select
                    value={columnMapping.dateFormat || "auto"}
                    onValueChange={val => setColumnMapping(prev => prev ? { ...prev, dateFormat: val } : null)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="text-xs">Auto-detect (Recommended)</SelectItem>
                      <SelectItem value="dd/MM/yyyy" className="text-xs">DD/MM/YYYY (e.g. 15/10/2026)</SelectItem>
                      <SelectItem value="yyyy-MM-dd" className="text-xs">YYYY-MM-DD (e.g. 2026-10-15)</SelectItem>
                      <SelectItem value="MM/dd/yyyy" className="text-xs">MM/DD/YYYY (e.g. 10/15/2026)</SelectItem>
                      <SelectItem value="dd-MMM-yyyy" className="text-xs">DD-MMM-YYYY (e.g. 15-Oct-2026)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview, Auto-Categorization & Duplicate Resolution */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/60 bg-secondary/15">
                  <span className="text-[11px] text-muted-foreground block">Ready to Import</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-bold text-foreground">{includedCount}</span>
                    <span className="text-xs text-muted-foreground">of {workingTransactions.length}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                  <span className="text-[11px] text-destructive/80 block">Total Outflow (Expenses)</span>
                  <span className="text-xl font-bold text-destructive mt-0.5 block">
                    {formatMoney(totalExpenseOutflow)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-[11px] text-emerald-400 block">Total Inflow (Deposits)</span>
                  <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
                    {formatMoney(totalIncomeInflow)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-secondary/15">
                  <span className="text-[11px] text-muted-foreground block">Detected Duplicates</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-xl font-bold ${duplicateCount > 0 ? "text-amber-400" : "text-foreground"}`}>
                      {duplicateCount}
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={autoSkipDuplicates}
                        onCheckedChange={handleAutoSkipToggle}
                        className="w-3.5 h-3.5"
                      />
                      <span>Auto-skip</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Special Handling Notice (Transfers & Refunds) */}
              {(refundCount > 0 || transferCount > 0) && (
                <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Auto-separated <strong className="text-foreground">{refundCount} refunds/reversals</strong> and{" "}
                      <strong className="text-foreground">{transferCount} internal transfers</strong> so they do not distort your regular monthly spending limits.
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    Safe Budgeting
                  </Badge>
                </div>
              )}

              {/* Controls & Filter Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    type="button"
                    variant={activeFilterTab === "all" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFilterTab("all")}
                    className="text-xs h-7 px-2.5 font-medium"
                  >
                    All ({workingTransactions.length})
                  </Button>
                  <Button
                    type="button"
                    variant={activeFilterTab === "ready" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFilterTab("ready")}
                    className="text-xs h-7 px-2.5 font-medium text-emerald-400"
                  >
                    Ready ({includedCount})
                  </Button>
                  {duplicateCount > 0 && (
                    <Button
                      type="button"
                      variant={activeFilterTab === "duplicates" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilterTab("duplicates")}
                      className="text-xs h-7 px-2.5 font-medium text-amber-400"
                    >
                      Duplicates ({duplicateCount})
                    </Button>
                  )}
                  {(transferCount > 0 || refundCount > 0) && (
                    <Button
                      type="button"
                      variant={activeFilterTab === "special" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilterTab("special")}
                      className="text-xs h-7 px-2.5 font-medium text-sky-400"
                    >
                      Transfers & Refunds ({transferCount + refundCount})
                    </Button>
                  )}
                  {issueCount > 0 && (
                    <Button
                      type="button"
                      variant={activeFilterTab === "issues" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilterTab("issues")}
                      className="text-xs h-7 px-2.5 font-medium text-destructive"
                    >
                      Warnings ({issueCount})
                    </Button>
                  )}
                </div>

                {/* Search & Bulk Select */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search preview..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-7 text-xs pl-7"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAllInView(true)}
                    className="text-[11px] h-7 px-2 border-border/60"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAllInView(false)}
                    className="text-[11px] h-7 px-2 border-border/60"
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("mapping")}
                    title="Edit column mapping"
                    className="text-xs h-7 px-2"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Transactions Preview Table */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
                <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
                  {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      No transactions match the selected filter.
                    </div>
                  ) : (
                    filteredTransactions.map(txn => {
                      const isCredit = txn.type === "income";
                      const isDebit = txn.type === "expense";

                      return (
                        <div
                          key={txn.id}
                          className={`p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                            txn.included ? "bg-background/40 hover:bg-secondary/30" : "bg-muted/30 opacity-60 hover:opacity-90"
                          } ${txn.isDuplicate ? "border-l-2 border-l-amber-500" : ""}`}
                        >
                          {/* Left: Checkbox + Date + Name + Narration */}
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <Checkbox
                              checked={txn.included}
                              onCheckedChange={() => toggleRowInclusion(txn.id)}
                              className="mt-1"
                            />
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Input
                                  value={txn.name}
                                  onChange={e => updateRowField(txn.id, { name: e.target.value })}
                                  className="h-6 text-xs font-semibold max-w-[200px] border-transparent hover:border-border focus:border-primary px-1.5 rounded"
                                />

                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {txn.normalizedDate}
                                </span>

                                {txn.isDuplicate && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                    Duplicate skipped
                                  </Badge>
                                )}

                                {txn.isRefund && (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                    Refund
                                  </Badge>
                                )}

                                {txn.isTransfer && (
                                  <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/30">
                                    Transfer
                                  </Badge>
                                )}

                                {txn.referenceNo && (
                                  <span className="text-[10px] font-mono text-muted-foreground/80">
                                    Ref: {txn.referenceNo}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-muted-foreground truncate" title={txn.rawDescription}>
                                {txn.rawDescription}
                              </p>

                              {/* Tags Row */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {txn.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-secondary/80 text-foreground border border-border/50 group"
                                  >
                                    #{tag}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTagFromRow(txn.id, tag)}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ))}

                                {newTagInput?.txnId === txn.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <Input
                                      autoFocus
                                      placeholder="tag name"
                                      value={newTagInput.text}
                                      onChange={e => setNewTagInput({ txnId: txn.id, text: e.target.value })}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") handleAddTagToRow(txn.id, newTagInput.text);
                                        if (e.key === "Escape") setNewTagInput(null);
                                      }}
                                      className="h-5 text-[10px] w-20 px-1 py-0"
                                    />
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleAddTagToRow(txn.id, newTagInput.text)}
                                      className="h-5 w-5"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setNewTagInput({ txnId: txn.id, text: "" })}
                                    className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-secondary/40"
                                  >
                                    <Tag className="w-2.5 h-2.5" /> +tag
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Category Selector + Type Toggle + Amount */}
                          <div className="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-center">
                            {/* Category Selector */}
                            <Select
                              value={txn.category}
                              onValueChange={val => updateRowField(txn.id, { category: val as TransactionCategory })}
                            >
                              <SelectTrigger className="h-7 text-[11px] w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map(opt => (
                                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Type Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                updateRowField(txn.id, {
                                  type: txn.type === "expense" ? "income" : "expense",
                                })
                              }
                              className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                                txn.type === "income"
                                  ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                  : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                              }`}
                              title="Click to flip between Expense and Income"
                            >
                              {txn.type}
                            </button>

                            {/* Amount Display */}
                            <div className="text-right w-24">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  txn.type === "income" ? "text-emerald-400" : "text-foreground"
                                }`}
                              >
                                {txn.type === "income" ? "+" : "-"}
                                {formatMoney(txn.amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/50 bg-secondary/15 flex items-center justify-between gap-3 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          {step === "upload" && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Client-side parsing · Never requests or stores UPI PINs or Passwords</span>
            </div>
          )}

          {step === "mapping" && (
            <Button
              size="sm"
              onClick={applyCustomMapping}
              className="bg-primary text-primary-foreground text-xs gap-1.5 h-8 font-semibold shadow-sm"
            >
              Apply Mapping & Preview <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}

          {step === "preview" && (
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {includedCount} transaction{includedCount === 1 ? "" : "s"} selected
              </span>
              <Button
                size="sm"
                disabled={includedCount === 0 || isImporting}
                onClick={handleConfirmImport}
                className="bg-primary text-primary-foreground text-xs gap-1.5 h-9 font-semibold shadow-sm px-4"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Import {includedCount} Transactions
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

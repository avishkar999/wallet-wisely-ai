import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  RecurringTransaction,
  useRecurringTransactions,
  useUpdateRecurringTransaction,
  useDeleteRecurringTransaction,
} from "@/hooks/useRecurringTransactions";
import {
  ImportPreviewDialog,
  buildImportPlan,
  type ImportPlanRow,
} from "./ImportPreviewDialog";
import { AddRecurringDialog } from "@/components/calendar/AddRecurringDialog";
import { EditRecurringDialog } from "./EditRecurringDialog";
import { format, differenceInDays, isBefore, isToday } from "date-fns";
import { CalendarClock, Pencil, Trash2, Repeat, Download, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportRecurringToCSV,
  exportRecurringToJSON,
  parseRecurringFile,
  parseCsvTable,
  parseMappedCsv,
  guessMapping,
  mappingIsComplete,
  type ColumnMapping,
  type CsvTable,
} from "@/utils/recurringBackup";
import { ColumnMappingDialog } from "./ColumnMappingDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateDueDate } from "@/lib/validation/recurring";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function dueBadge(nextDueDate: string, isActive: boolean) {
  if (!isActive) return { label: "Paused", variant: "outline" as const };
  const due = new Date(nextDueDate);
  const today = new Date();
  if (isBefore(due, today) && !isToday(due)) return { label: "Overdue", variant: "destructive" as const };
  if (isToday(due)) return { label: "Due today", variant: "default" as const };
  return { label: `in ${differenceInDays(due, today) + 1}d`, variant: "secondary" as const };
}

export function RecurringManager() {
  const { data: schedules = [], isLoading } = useRecurringTransactions();
  const updateRecurring = useUpdateRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();

  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateErrors, setDateErrors] = useState<Record<string, string | undefined>>({});
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    plan: ImportPlanRow[];
    skipped: string[];
    fileName: string;
  } | null>(null);
  const [mapper, setMapper] = useState<{ table: CsvTable; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (kind: "csv" | "json") => {
    if (schedules.length === 0) {
      toast.error("No schedules to export");
      return;
    }
    const filename = `recurring-schedules-${format(new Date(), "yyyy-MM-dd")}`;
    if (kind === "csv") exportRecurringToCSV(schedules, filename);
    else exportRecurringToJSON(schedules, filename);
    toast.success(`Exported ${schedules.length} schedule${schedules.length > 1 ? "s" : ""}`);
  };

  const showPreview = (
    result: { valid: Parameters<typeof buildImportPlan>[0]; errors: string[] },
    fileName: string
  ) => {
    if (result.valid.length === 0 && result.errors.length === 0) {
      toast.error("No schedules found in this file");
      return;
    }
    setPreview({
      plan: buildImportPlan(result.valid, schedules),
      skipped: result.errors,
      fileName,
    });
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const isJson =
        file.name.toLowerCase().endsWith(".json") ||
        text.trim().startsWith("{") ||
        text.trim().startsWith("[");

      if (!isJson) {
        const table = parseCsvTable(text);
        if (!table) {
          toast.error("CSV has no data rows");
          return;
        }
        const saved = loadSavedMapping(table.headers);
        if (saved) {
          toast.info("Using your saved column mapping");
          showPreview(parseMappedCsv(table, saved), file.name);
          return;
        }
        const guessed = guessMapping(table.headers);
        if (!mappingIsComplete(guessed)) {
          setMapper({ table, fileName: file.name });
          return;
        }
        showPreview(parseMappedCsv(table, guessed), file.name);
        return;
      }

      showPreview(parseRecurringFile(file.name, text), file.name);
    } catch {
      toast.error("Could not read that file");
    } finally {
      setImporting(false);
    }
  };

  const confirmMapping = (mapping: ColumnMapping) => {
    if (!mapper) return;
    const { table, fileName } = mapper;
    setMapper(null);
    showPreview(parseMappedCsv(table, mapping), fileName);
  };

  const togglePause = async (item: RecurringTransaction) => {
    const next = !(item.is_active ?? true);
    try {
      await updateRecurring.mutateAsync({ id: item.id, is_active: next });
      toast.success(next ? `${item.title} resumed` : `${item.title} paused`);
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const changeDueDate = async (item: RecurringTransaction, value: string) => {
    const error = validateDueDate(value);
    if (error) {
      setDateErrors((prev) => ({ ...prev, [item.id]: error }));
      return;
    }
    setDateErrors((prev) => ({ ...prev, [item.id]: undefined }));
    try {
      await updateRecurring.mutateAsync({ id: item.id, next_due_date: value });
      toast.success("Next due date updated");
    } catch {
      toast.error("Failed to update due date");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecurring.mutateAsync(deleteId);
      toast.success("Schedule deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="w-4 h-4 text-primary" />
              Recurring Schedules
              {schedules.length > 0 && (
                <Badge variant="secondary">{schedules.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {importing ? "Importing…" : "Import"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleImportFile(file);
                }}
              />

              <AddRecurringDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarClock className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No schedules yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add bills, EMIs, subscriptions or salary to automate them
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {schedules.map((item) => {
                  const active = item.is_active ?? true;
                  const badge = dueBadge(item.next_due_date, active);
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={cn(
                        "p-3 rounded-xl border bg-card/50 backdrop-blur-sm space-y-3",
                        !active && "opacity-70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            <Badge variant={badge.variant} className="text-xs shrink-0">
                              {badge.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.frequency}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.next_due_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "font-semibold text-sm whitespace-nowrap",
                            item.type === "income" ? "text-success" : "text-destructive"
                          )}
                        >
                          {item.type === "income" ? "+" : "-"}
                          {formatCurrency(Number(item.amount))}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="date"
                          min="2000-01-01"
                          max="2100-12-31"
                          aria-label={`Next due date for ${item.title}`}
                          aria-invalid={!!dateErrors[item.id]}
                          value={item.next_due_date}
                          onChange={(e) => changeDueDate(item, e.target.value)}
                          className={cn(
                            "h-8 text-xs w-[9.5rem]",
                            dateErrors[item.id] && "border-destructive"
                          )}
                        />
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Switch
                            checked={active}
                            onCheckedChange={() => togglePause(item)}
                            aria-label={active ? "Pause schedule" : "Resume schedule"}
                          />
                          <span className="text-xs text-muted-foreground w-12">
                            {active ? "Active" : "Paused"}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setEditItem(item)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {dateErrors[item.id] && (
                        <p className="text-xs text-destructive">{dateErrors[item.id]}</p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <EditRecurringDialog
        item={editItem}
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      />

      {preview && (
        <ImportPreviewDialog
          open={!!preview}
          onOpenChange={(open) => !open && setPreview(null)}
          plan={preview.plan}
          skipped={preview.skipped}
          fileName={preview.fileName}
        />
      )}

      <ColumnMappingDialog
        open={!!mapper}
        onOpenChange={(open) => !open && setMapper(null)}
        table={mapper?.table ?? null}
        fileName={mapper?.fileName ?? ""}
        onConfirm={confirmMapping}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Future transactions will no longer be posted automatically. Already recorded
              transactions are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

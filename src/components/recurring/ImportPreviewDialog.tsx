import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  RecurringTransaction,
  RecurringTransactionInsert,
  useAddRecurringTransaction,
  useUpdateRecurringTransaction,
} from "@/hooks/useRecurringTransactions";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export type ImportPlanRow = {
  action: "create" | "update";
  item: RecurringTransactionInsert;
  existing?: RecurringTransaction;
};

export function buildImportPlan(
  valid: RecurringTransactionInsert[],
  existing: RecurringTransaction[]
): ImportPlanRow[] {
  const key = (title: string, frequency: string) =>
    `${title.trim().toLowerCase()}|${frequency.toLowerCase()}`;
  const byKey = new Map(existing.map((e) => [key(e.title, e.frequency), e]));

  return valid.map((item) => {
    const match = byKey.get(key(item.title, item.frequency));
    return match
      ? { action: "update" as const, item, existing: match }
      : { action: "create" as const, item };
  });
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ImportPlanRow[];
  skipped: string[];
  fileName: string;
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  plan,
  skipped,
  fileName,
}: ImportPreviewDialogProps) {
  const addRecurring = useAddRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();
  const [running, setRunning] = useState(false);

  const counts = useMemo(
    () => ({
      create: plan.filter((r) => r.action === "create").length,
      update: plan.filter((r) => r.action === "update").length,
      skip: skipped.length,
    }),
    [plan, skipped]
  );

  const confirm = async () => {
    setRunning(true);
    const failures: string[] = [];
    let created = 0;
    let updated = 0;

    for (const row of plan) {
      try {
        if (row.action === "update" && row.existing) {
          await updateRecurring.mutateAsync({ id: row.existing.id, ...row.item });
          updated++;
        } else {
          await addRecurring.mutateAsync(row.item);
          created++;
        }
      } catch {
        failures.push(row.item.title);
      }
    }

    setRunning(false);
    onOpenChange(false);

    if (created || updated) {
      toast.success(`Import complete — ${created} created, ${updated} updated`);
    }
    if (failures.length) {
      toast.error(`Could not save: ${failures.slice(0, 3).join(", ")}`);
    }
    if (!created && !updated && !failures.length) {
      toast.error("Nothing was imported");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review import</DialogTitle>
          <DialogDescription className="truncate">
            {fileName} — nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Plus className="w-3 h-3" /> {counts.create} new
          </Badge>
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="w-3 h-3" /> {counts.update} updated
          </Badge>
          {counts.skip > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" /> {counts.skip} skipped
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[45vh] pr-3">
          <div className="space-y-2">
            {plan.map((row, idx) => (
              <div
                key={`${row.item.title}-${idx}`}
                className="p-2.5 rounded-lg border bg-card/50 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{row.item.title}</p>
                    <Badge
                      variant={row.action === "create" ? "secondary" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {row.action === "create" ? "New" : "Update"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {row.item.frequency} · {row.item.category} · next {row.item.next_due_date}
                  </p>
                  {row.action === "update" && row.existing && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Replaces {formatCurrency(Number(row.existing.amount))} due{" "}
                      {row.existing.next_due_date}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    row.item.type === "income" ? "text-success" : "text-destructive"
                  )}
                >
                  {row.item.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(row.item.amount))}
                </span>
              </div>
            ))}

            {skipped.map((message, idx) => (
              <div
                key={`skip-${idx}`}
                className="p-2.5 rounded-lg border border-destructive/40 bg-destructive/5"
              >
                <p className="text-xs text-destructive">Skipped — {message}</p>
              </div>
            ))}

            {plan.length === 0 && skipped.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No rows found in this file.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={running || plan.length === 0}>
            {running
              ? "Importing…"
              : `Import ${plan.length} schedule${plan.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

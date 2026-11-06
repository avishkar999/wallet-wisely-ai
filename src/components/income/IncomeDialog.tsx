import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tables } from "@/integrations/supabase/types";
import { ArrowDownLeft } from "lucide-react";
import { IncomeForm } from "@/components/forms/IncomeForm";

type Transaction = Tables<"transactions">;

interface IncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeToEdit?: Transaction | null;
  onSuccess?: () => void;
}

export function IncomeDialog({
  open,
  onOpenChange,
  incomeToEdit,
  onSuccess,
}: IncomeDialogProps) {
  const isEditing = Boolean(incomeToEdit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-2xl border-border/80 p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wider">
            <ArrowDownLeft className="w-4 h-4" />
            <span>{isEditing ? "Edit Income Entry" : "Record New Inflow"}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
            {isEditing ? "Update Income Record" : "Add Income"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Log received salaries, freelance payouts, business earnings, or dividends into WalletWisely.
          </DialogDescription>
        </DialogHeader>

        <IncomeForm
          initialData={incomeToEdit}
          isDialogMode={true}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

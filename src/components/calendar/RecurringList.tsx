import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useRecurringTransactions, 
  useDeleteRecurringTransaction, 
  useUpdateRecurringTransaction,
  getNextDueDate 
} from "@/hooks/useRecurringTransactions";
import { useAddTransaction } from "@/hooks/useTransactions";
import { format, differenceInDays, isBefore, isToday } from "date-fns";
import { Bell, Trash2, Check, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

export function RecurringList() {
  const { data: recurring = [], isLoading } = useRecurringTransactions();
  const deleteRecurring = useDeleteRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();
  const addTransaction = useAddTransaction();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatus = (nextDueDate: string) => {
    const due = new Date(nextDueDate);
    const today = new Date();
    const daysUntil = differenceInDays(due, today);

    if (isBefore(due, today) && !isToday(due)) {
      return { label: "Overdue", variant: "destructive" as const, daysUntil };
    }
    if (isToday(due)) {
      return { label: "Due Today", variant: "default" as const, daysUntil: 0 };
    }
    if (daysUntil <= 3) {
      return { label: `${daysUntil}d left`, variant: "secondary" as const, daysUntil };
    }
    return { label: `${daysUntil}d`, variant: "outline" as const, daysUntil };
  };

  const handleMarkPaid = async (item: typeof recurring[0]) => {
    try {
      // Add as a transaction
      await addTransaction.mutateAsync({
        name: item.title,
        amount: item.amount,
        type: item.type,
        category: item.category as any,
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "other",
        description: `Recurring: ${item.title}`,
      });

      // Update next due date
      const nextDate = getNextDueDate(item.frequency, new Date(item.next_due_date));
      await updateRecurring.mutateAsync({
        id: item.id,
        next_due_date: format(nextDate, "yyyy-MM-dd"),
      });

      toast.success(`${item.title} marked as paid`);
    } catch (error) {
      toast.error("Failed to mark as paid");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecurring.mutateAsync(deleteId);
      toast.success("Recurring transaction deleted");
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const activeRecurring = recurring.filter(r => r.is_active);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Recurring Transactions
            {activeRecurring.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activeRecurring.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRecurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recurring transactions</p>
              <p className="text-xs text-muted-foreground mt-1">Add bills and subscriptions to track</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-2">
                <AnimatePresence>
                  {activeRecurring.map((item) => {
                    const status = getStatus(item.next_due_date);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          status.label === "Overdue" && "border-destructive/50 bg-destructive/5",
                          status.label === "Due Today" && "border-primary/50 bg-primary/5",
                          status.label !== "Overdue" && status.label !== "Due Today" && "bg-secondary/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{item.title}</p>
                              <Badge variant={status.variant} className="text-xs shrink-0">
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.frequency}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(item.next_due_date), "MMM d")}
                              </span>
                            </div>
                          </div>
                          <span className={cn(
                            "font-semibold text-sm whitespace-nowrap",
                            item.type === "income" ? "text-success" : "text-destructive"
                          )}>
                            {item.type === "income" ? "+" : "-"}
                            {formatCurrency(Number(item.amount))}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={() => handleMarkPaid(item)}
                            disabled={addTransaction.isPending || updateRecurring.isPending}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring transaction. This action cannot be undone.
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

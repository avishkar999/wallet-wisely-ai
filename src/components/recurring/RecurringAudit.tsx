import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Database,
  Table2,
  ChevronDown,
  Repeat,
  Receipt,
  ShieldCheck,
  Code2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useRecurringTransactions,
  useDeleteRecurringTransaction,
  useDeleteRecurringWithTransactions,
  useDeleteGeneratedTransactions,
  AUTO_RECURRING_MARKER,
  type RecurringTransaction,
} from "@/hooks/useRecurringTransactions";
import { useTransactions } from "@/hooks/useTransactions";
import { useAutoRecurringStatus } from "@/hooks/useAutoRecurring";
import { AutoPostStatus } from "./AutoPostStatus";
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

const currency = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const AUTO_MARKER = AUTO_RECURRING_MARKER;

export function RecurringAudit() {
  const { data: recurring = [], isLoading: loadingRecurring } = useRecurringTransactions();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions();
  const deleteSchedule = useDeleteRecurringTransaction();
  const deleteWithTx = useDeleteRecurringWithTransactions();
  const deleteGenerated = useDeleteGeneratedTransactions();
  const { running: autoPosting } = useAutoRecurringStatus();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    schedule: RecurringTransaction;
    count: number;
  } | null>(null);
  const [confirmOrphans, setConfirmOrphans] = useState(false);

  const generated = useMemo(
    () => transactions.filter((t) => (t.description || "").startsWith(AUTO_MARKER)),
    [transactions]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recurring
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      .map((r) => {
        const linked = generated
          .filter((t) => t.name.toLowerCase() === r.title.toLowerCase())
          .sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1));
        const total = linked.reduce((s, t) => s + Number(t.amount), 0);
        return { schedule: r, linked, total };
      });
  }, [recurring, generated, query]);

  const orphans = useMemo(() => {
    const titles = new Set(recurring.map((r) => r.title.toLowerCase()));
    return generated.filter((t) => !titles.has(t.name.toLowerCase()));
  }, [generated, recurring]);

  const loading = loadingRecurring || loadingTx;
  const deleting = deleteSchedule.isPending || deleteWithTx.isPending || deleteGenerated.isPending;

  const handleDeleteOnly = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSchedule.mutateAsync(deleteTarget.schedule.id);
      toast.success("Schedule deleted — its transactions were kept");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteTarget) return;
    try {
      const removed = await deleteWithTx.mutateAsync({
        id: deleteTarget.schedule.id,
        title: deleteTarget.schedule.title,
      });
      toast.success(`Schedule and ${removed} transaction${removed === 1 ? "" : "s"} deleted`);
      setDeleteTarget(null);
      if (expanded === deleteTarget.schedule.id) setExpanded(null);
    } catch {
      toast.error("Failed to delete schedule and transactions");
    }
  };

  const handleClearOrphans = async () => {
    try {
      const removed = await deleteGenerated.mutateAsync(orphans.map((t) => t.id));
      toast.success(`Removed ${removed} unlinked transaction${removed === 1 ? "" : "s"}`);
      setConfirmOrphans(false);
    } catch {
      toast.error("Failed to remove unlinked transactions");
    }
  };

  return (
    <div className="space-y-6">
      {/* Storage map */}
      <div className="grid gap-4 md:grid-cols-3">
        <StoreCard
          icon={Repeat}
          table="recurring_transactions"
          title="Schedules"
          count={recurring.length}
          description="Every recurring rule you create (title, amount, frequency, next due date, active state) lives here."
        />
        <StoreCard
          icon={Receipt}
          table="transactions"
          title="Generated entries"
          count={generated.length}
          description={`Each posted occurrence is written as a normal transaction tagged "${AUTO_MARKER}".`}
        />
        <StoreCard
          icon={ShieldCheck}
          table="row level security"
          title="Access"
          count={null}
          description="Both tables are scoped to your account only — every read and write is filtered by your user id."
        />
      </div>

      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 flex items-start gap-3">
        <Database className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Schedules never store money themselves. When a due date arrives the app inserts a row into{" "}
          <code className="text-foreground">transactions</code> dated on that day and rolls{" "}
          <code className="text-foreground">next_due_date</code> forward. Deleting a schedule leaves
          the transactions it already created intact.
        </p>
      </div>

      <Input
        placeholder="Search schedules by title or category…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading audit data…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recurring schedules stored yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ schedule, linked, total }) => {
            const open = expanded === schedule.id;
            return (
              <div
                key={schedule.id}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(open ? null : schedule.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">{schedule.title}</span>
                      <Badge variant="secondary" className="capitalize">{schedule.frequency}</Badge>
                      <Badge variant={schedule.is_active ? "default" : "outline"}>
                        {schedule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currency(Number(schedule.amount))} · next due{" "}
                      {format(new Date(schedule.next_due_date), "dd MMM yyyy")} ·{" "}
                      {linked.length} generated ({currency(total)})
                    </p>
                  </div>
                  <ChevronDown
                    className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Rows in <code>transactions</code>
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRaw(showRaw === schedule.id ? null : schedule.id)}
                          >
                            <Code2 className="w-4 h-4 mr-2" />
                            {showRaw === schedule.id ? "Hide" : "Show"} stored record
                          </Button>
                        </div>

                        {showRaw === schedule.id && (
                          <pre className="text-xs bg-secondary/60 rounded-xl p-3 overflow-x-auto text-muted-foreground">
{JSON.stringify(schedule, null, 2)}
                          </pre>
                        )}

                        {linked.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No transactions generated from this schedule yet.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {linked.slice(0, 25).map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-3 text-sm py-2 border-b border-border/60 last:border-0"
                              >
                                <div className="min-w-0">
                                  <p className="text-foreground truncate">{t.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {format(new Date(t.transaction_date), "dd MMM yyyy")} ·{" "}
                                    {t.category} · {t.payment_method} · id {t.id.slice(0, 8)}…
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "font-medium whitespace-nowrap",
                                    t.type === "income" ? "text-success" : "text-foreground"
                                  )}
                                >
                                  {currency(Number(t.amount))}
                                </span>
                              </div>
                            ))}
                            {linked.length > 25 && (
                              <p className="text-xs text-muted-foreground pt-2">
                                Showing latest 25 of {linked.length}.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {orphans.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4">
          <div className="flex items-center gap-2 mb-2">
            <Table2 className="w-4 h-4 text-warning" />
            <p className="font-medium text-foreground">Unlinked generated transactions</p>
            <Badge variant="outline">{orphans.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            These were created by a recurring schedule that has since been renamed or deleted.
          </p>
          <div className="space-y-1">
            {orphans.slice(0, 15).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-1">
                <span className="text-muted-foreground truncate">
                  {format(new Date(t.transaction_date), "dd MMM yyyy")} · {t.name}
                </span>
                <span className="text-foreground">{currency(Number(t.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreCard({
  icon: Icon,
  table,
  title,
  count,
  description,
}: {
  icon: typeof Repeat;
  table: string;
  title: string;
  count: number | null;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <code className="text-xs text-muted-foreground">{table}</code>
        </div>
        {count !== null && (
          <span className="ml-auto text-2xl font-bold text-foreground">{count}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}

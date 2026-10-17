import { useState } from "react";
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
import {
  Tag,
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  Receipt,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransactions, useUpdateTransaction } from "@/hooks/useTransactions";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";
import { getKnownCustomTags, addKnownCustomTag } from "@/utils/autoCategorizer";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagManagerDialog({ open, onOpenChange }: TagManagerDialogProps) {
  const { toast } = useToast();
  const { formatMoney } = useCoinKeeper();
  const { data: transactions = [] } = useTransactions();
  const updateTransaction = useUpdateTransaction();

  const [newTagInput, setNewTagInput] = useState("");
  const [selectedTagForInspection, setSelectedTagForInspection] = useState<string | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [knownTags, setKnownTags] = useState<string[]>(() => getKnownCustomTags());

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, "");
    if (!trimmed) return;

    if (knownTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        title: "Tag Already Exists",
        description: `#${trimmed} is already in your tags list.`,
      });
      return;
    }

    addKnownCustomTag(trimmed);
    setKnownTags(getKnownCustomTags());
    setNewTagInput("");
    toast({
      title: "Tag Created",
      description: `Created #${trimmed} tag. You can now tag transactions with this label.`,
    });
  };

  // Attach a tag to a transaction
  const handleToggleTagOnTransaction = async (txn: any, tag: string) => {
    const currentTags: string[] = txn.tags || [];
    let updatedTags: string[];

    if (currentTags.includes(tag)) {
      updatedTags = currentTags.filter(t => t !== tag);
    } else {
      updatedTags = [...currentTags, tag];
    }

    try {
      await updateTransaction.mutateAsync({
        id: txn.id,
        tags: updatedTags,
      } as any);

      toast({
        title: "Tags Updated",
        description: `Updated tags for "${txn.name}".`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to Update Tag",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Filtered transactions for selected tag inspection
  const matchingTransactions = selectedTagForInspection
    ? transactions.filter(t => (t as any).tags?.includes(selectedTagForInspection))
    : transactions;

  // Count usage per tag
  const tagCounts = knownTags.reduce((acc, tag) => {
    acc[tag] = transactions.filter(t => (t as any).tags?.includes(tag)).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredTags = knownTags.filter(t =>
    t.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-border/60 bg-card/95 backdrop-blur-2xl">
        <DialogHeader className="p-5 pb-4 border-b border-border/50 bg-secondary/15 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Transaction Categorizer & Custom Tags</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Organize and label expenses with custom tags like Groceries, Rent, Client, or Coffee.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Create New Custom Tag */}
          <div className="p-4 rounded-xl border border-border/60 bg-secondary/15 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Create New Custom Label
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                  #
                </span>
                <Input
                  placeholder="e.g. Groceries, Rent, ClientExpenses, Gaming..."
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAddNewTag();
                  }}
                  className="pl-7 text-xs h-9 bg-background"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddNewTag}
                className="bg-primary text-primary-foreground text-xs gap-1.5 h-9 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tag
              </Button>
            </div>
          </div>

          {/* Tags Cloud & Filtering */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Your Custom Labels ({knownTags.length})
              </Label>
              <div className="relative w-44">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search labels..."
                  value={tagSearchQuery}
                  onChange={e => setTagSearchQuery(e.target.value)}
                  className="h-7 text-xs pl-7"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTagForInspection(null)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  selectedTagForInspection === null
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                    : "bg-secondary/30 text-muted-foreground border-border/50 hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                All Transactions ({transactions.length})
              </button>

              {filteredTags.map(tag => {
                const count = tagCounts[tag] || 0;
                const isSelected = selectedTagForInspection === tag;

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTagForInspection(isSelected ? null : tag)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                        : "bg-secondary/30 text-foreground border-border/50 hover:bg-secondary/60"
                    }`}
                  >
                    <span>#{tag}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? "bg-black/20 text-white" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transactions Tagging List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {selectedTagForInspection
                  ? `Transactions tagged with #${selectedTagForInspection} (${matchingTransactions.length})`
                  : `All Recent Transactions (${transactions.length})`}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Click any tag to toggle label on transaction
              </span>
            </div>

            <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50 divide-y divide-border/40 max-h-[300px] overflow-y-auto">
              {matchingTransactions.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p>No transactions found for this tag.</p>
                </div>
              ) : (
                matchingTransactions.map((txn: any) => {
                  const currentTags: string[] = txn.tags || [];

                  return (
                    <div
                      key={txn.id}
                      className="p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{txn.name}</p>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {txn.category}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {txn.transaction_date}
                          </span>
                        </div>

                        {/* Active Tags & Quick Tag Toggles */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {knownTags.slice(0, 6).map(tag => {
                            const isTagged = currentTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleToggleTagOnTransaction(txn, tag)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                  isTagged
                                    ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                                    : "bg-secondary/20 text-muted-foreground border-border/40 hover:bg-secondary/50 hover:text-foreground"
                                }`}
                              >
                                {isTagged && "✓ "}#{tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 self-end sm:self-center">
                        <p
                          className={`font-mono font-bold text-sm ${
                            txn.type === "income" ? "text-emerald-400" : "text-foreground"
                          }`}
                        >
                          {txn.type === "income" ? "+" : "-"}
                          {formatMoney(Number(txn.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 bg-secondary/15 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Custom tags automatically persist across future statement imports
          </span>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 bg-primary text-primary-foreground font-semibold px-4"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

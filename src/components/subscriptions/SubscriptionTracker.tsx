import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCcw,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from "lucide-react";
import {
  useSubscriptionDetection,
  DetectedSubscription,
} from "@/hooks/useSubscriptionDetection";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryColors: Record<string, string> = {
  entertainment: "bg-purple-500/20 text-purple-400",
  bills: "bg-blue-500/20 text-blue-400",
  shopping: "bg-pink-500/20 text-pink-400",
  health: "bg-green-500/20 text-green-400",
  food: "bg-orange-500/20 text-orange-400",
  recharges: "bg-cyan-500/20 text-cyan-400",
  education: "bg-indigo-500/20 text-indigo-400",
  other: "bg-gray-500/20 text-gray-400",
};

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function SubscriptionTracker() {
  const { subscriptions, summary, isLoading } = useSubscriptionDetection();
  const [selectedSubscription, setSelectedSubscription] =
    useState<DetectedSubscription | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || sub.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && sub.isActive) ||
      (filterStatus === "inactive" && !sub.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeSubscriptions = filteredSubscriptions.filter((s) => s.isActive);
  const inactiveSubscriptions = filteredSubscriptions.filter((s) => !s.isActive);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Subscriptions
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary.activeSubscriptions}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <RefreshCcw className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(summary.monthlyTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Yearly Cost</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(summary.yearlyTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-hover border-warning/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Review Suggested
                  </p>
                  <p className="text-2xl font-bold text-warning">
                    {summary.reviewCandidates}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.potentialMonthlySavings)}/mo
                    potential savings
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="bills">Bills</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="recharges">Recharges</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscription List */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Active ({activeSubscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Inactive ({inactiveSubscriptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="space-y-3">
            <AnimatePresence>
              {activeSubscriptions.length === 0 ? (
                <Card className="glass">
                  <CardContent className="py-12 text-center">
                    <RefreshCcw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No active subscriptions detected
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add more transactions to detect recurring expenses
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeSubscriptions.map((sub, index) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    index={index}
                    isExpanded={expandedId === sub.id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === sub.id ? null : sub.id)
                    }
                    onViewDetails={() => setSelectedSubscription(sub)}
                    formatCurrency={formatCurrency}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="inactive">
          <div className="space-y-3">
            <AnimatePresence>
              {inactiveSubscriptions.length === 0 ? (
                <Card className="glass">
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No inactive subscriptions
                    </p>
                  </CardContent>
                </Card>
              ) : (
                inactiveSubscriptions.map((sub, index) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    index={index}
                    isExpanded={expandedId === sub.id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === sub.id ? null : sub.id)
                    }
                    onViewDetails={() => setSelectedSubscription(sub)}
                    formatCurrency={formatCurrency}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>

      {/* Subscription Details Dialog */}
      <Dialog
        open={!!selectedSubscription}
        onOpenChange={() => setSelectedSubscription(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSubscription?.name}
              <Badge
                variant={selectedSubscription?.isActive ? "default" : "secondary"}
              >
                {selectedSubscription?.isActive ? "Active" : "Inactive"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Average Amount</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(selectedSubscription.averageAmount)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Frequency</p>
                  <p className="text-lg font-semibold text-foreground">
                    {frequencyLabels[selectedSubscription.frequency]}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(selectedSubscription.totalSpent)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Occurrences</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedSubscription.occurrences}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Confidence Score
                </p>
                <div className="flex items-center gap-3">
                  <Progress
                    value={selectedSubscription.confidenceScore}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {selectedSubscription.confidenceScore}%
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Payment History
                </p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {selectedSubscription.relatedTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30"
                    >
                      <span className="text-muted-foreground">
                        {format(parseISO(txn.date), "MMM d, yyyy")}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SubscriptionCardProps {
  subscription: DetectedSubscription;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewDetails: () => void;
  formatCurrency: (amount: number) => string;
}

function SubscriptionCard({
  subscription,
  index,
  isExpanded,
  onToggleExpand,
  onViewDetails,
  formatCurrency,
}: SubscriptionCardProps) {
  const daysUntilNext = differenceInDays(
    parseISO(subscription.nextExpectedDate),
    new Date()
  );
  const isUpcoming = daysUntilNext <= 7 && daysUntilNext >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`glass-hover cursor-pointer ${
          isUpcoming ? "border-warning/30" : ""
        }`}
      >
        <CardContent className="pt-4">
          <div
            className="flex items-center justify-between"
            onClick={onToggleExpand}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  categoryColors[subscription.category] || categoryColors.other
                }`}
              >
                <RefreshCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{subscription.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{subscription.category}</span>
                  <span>•</span>
                  <span>{frequencyLabels[subscription.frequency]}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatCurrency(subscription.averageAmount)}
                </p>
                {isUpcoming && (
                  <p className="text-xs text-warning">
                    Due in {daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Last Payment
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {format(
                          parseISO(subscription.lastPaymentDate),
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Next Expected
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {format(
                          parseISO(subscription.nextExpectedDate),
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Confidence
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {subscription.confidenceScore}%
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails();
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

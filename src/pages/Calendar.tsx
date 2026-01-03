import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddRecurringDialog } from "@/components/calendar/AddRecurringDialog";
import { RecurringList } from "@/components/calendar/RecurringList";
import { UpcomingReminders } from "@/components/calendar/UpcomingReminders";

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: recurring = [] } = useRecurringTransactions();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOffset = monthStart.getDay();
  const emptyDays = Array(startDayOffset).fill(null);

  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, typeof transactions> = {};
    transactions.forEach((t) => {
      const dateKey = t.transaction_date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });
    return grouped;
  }, [transactions]);

  const recurringByDate = useMemo(() => {
    const grouped: Record<string, typeof recurring> = {};
    recurring.filter(r => r.is_active).forEach((r) => {
      const dateKey = r.next_due_date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(r);
    });
    return grouped;
  }, [recurring]);

  const selectedDateTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return transactionsByDate[dateKey] || [];
  }, [selectedDate, transactionsByDate]);

  const selectedDateRecurring = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return recurringByDate[dateKey] || [];
  }, [selectedDate, recurringByDate]);

  const getDaySummary = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayTransactions = transactionsByDate[dateKey] || [];
    const dayRecurring = recurringByDate[dateKey] || [];
    const income = dayTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = dayTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expense, count: dayTransactions.length, hasRecurring: dayRecurring.length > 0 };
  };

  const monthlyTotals = useMemo(() => {
    const monthStr = format(currentMonth, "yyyy-MM");
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.transaction_date.startsWith(monthStr)) {
        if (t.type === "income") income += Number(t.amount);
        else expense += Number(t.amount);
      }
    });
    return { income, expense };
  }, [transactions, currentMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <UpcomingReminders />

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Income</p>
                <p className="text-lg font-semibold text-success">{formatCurrency(monthlyTotals.income)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Expenses</p>
                <p className="text-lg font-semibold text-destructive">{formatCurrency(monthlyTotals.expense)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Balance</p>
                <p className={cn("text-lg font-semibold", monthlyTotals.income - monthlyTotals.expense >= 0 ? "text-success" : "text-destructive")}>
                  {formatCurrency(monthlyTotals.income - monthlyTotals.expense)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <AddRecurringDialog />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
                      Today
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {emptyDays.map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {daysInMonth.map((day) => {
                  const summary = getDaySummary(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const hasTransactions = summary.count > 0;

                  return (
                    <motion.button
                      key={day.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square p-1 rounded-lg flex flex-col items-center justify-start transition-all relative",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isToday && "ring-2 ring-primary",
                        !isSelected && !isToday && "hover:bg-secondary",
                        !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50"
                      )}
                    >
                      <span className={cn("text-sm font-medium", isToday && !isSelected && "text-primary")}>
                        {format(day, "d")}
                      </span>
                      <div className="flex gap-0.5 mt-1">
                        {summary.income > 0 && (
                          <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-success")} />
                        )}
                        {summary.expense > 0 && (
                          <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-destructive")} />
                        )}
                        {summary.hasRecurring && (
                          <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-warning")} />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-muted-foreground">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-xs text-muted-foreground">Expense</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-xs text-muted-foreground">Bill Due</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Recurring Transactions */}
          <RecurringList />

          {/* Selected Day Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateTransactions.length === 0 && selectedDateRecurring.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No transactions on this day</p>
                </div>
              ) : (
                <ScrollArea className="h-[250px] pr-2">
                  <div className="space-y-3">
                    {selectedDateRecurring.map((item) => (
                      <div key={item.id} className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Bell className="w-3 h-3 text-warning" />
                              <p className="font-medium text-sm truncate">{item.title}</p>
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                              {item.category.replace("_", " ")}
                            </Badge>
                          </div>
                          <span className={cn(
                            "font-semibold text-sm whitespace-nowrap",
                            item.type === "income" ? "text-success" : "text-destructive"
                          )}>
                            {item.type === "income" ? "+" : "-"}
                            {formatCurrency(Number(item.amount))}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedDateTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{transaction.name}</p>
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                              {transaction.category.replace("_", " ")}
                            </Badge>
                          </div>
                          <span className={cn(
                            "font-semibold text-sm whitespace-nowrap",
                            transaction.type === "income" ? "text-success" : "text-destructive"
                          )}>
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(Number(transaction.amount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {selectedDate && selectedDateTransactions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Income</span>
                    <span className="text-success font-medium">
                      {formatCurrency(selectedDateTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="text-destructive font-medium">
                      {formatCurrency(selectedDateTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

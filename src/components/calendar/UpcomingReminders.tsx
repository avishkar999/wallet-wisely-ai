import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUpcomingReminders } from "@/hooks/useRecurringTransactions";
import { format } from "date-fns";
import { Bell, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function UpcomingReminders() {
  const reminders = useUpcomingReminders();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (reminders.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary animate-pulse" />
            Upcoming Reminders
            <Badge variant="secondary" className="ml-auto">
              {reminders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reminders.slice(0, 5).map((reminder) => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md text-sm",
                  reminder.isOverdue && "bg-destructive/10",
                  reminder.isDueToday && "bg-primary/10",
                  !reminder.isOverdue && !reminder.isDueToday && "bg-secondary/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {reminder.isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  ) : reminder.isDueToday ? (
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{reminder.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.isOverdue 
                        ? `Overdue by ${Math.abs(reminder.daysUntilDue)} days` 
                        : reminder.isDueToday 
                          ? "Due today"
                          : `Due in ${reminder.daysUntilDue} days`
                      }
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "font-medium shrink-0",
                  reminder.type === "income" ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(Number(reminder.amount))}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

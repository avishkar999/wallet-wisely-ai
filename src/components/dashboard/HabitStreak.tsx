import { motion } from "framer-motion";
import { Flame, Calendar, TrendingUp, CheckCircle2 } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { startOfWeek, addDays, isSameDay, parseISO, isToday, format, startOfMonth, isAfter } from "date-fns";

export function HabitStreak() {
  const { data: transactions = [] } = useTransactions();
  
  // Calculate streak based on days with tracked expenses
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const hasActivity = transactions.some(t => 
      isSameDay(parseISO(t.transaction_date), date)
    );
    return {
      date,
      dayName: format(date, 'EEE'),
      hasActivity,
      isToday: isToday(date),
      isPast: date < today && !isToday(date),
    };
  });

  // Calculate current month streak (resets at month start)
  const calculateMonthlyStreak = () => {
    // Only consider transactions from current month
    const monthTransactions = transactions.filter(t => {
      const tDate = parseISO(t.transaction_date);
      return isAfter(tDate, monthStart) || isSameDay(tDate, monthStart);
    });

    const sortedDates = monthTransactions
      .map(t => parseISO(t.transaction_date))
      .sort((a, b) => b.getTime() - a.getTime());
    
    if (sortedDates.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    
    // Only count days within current month
    const daysInMonth = today.getDate();
    
    for (let i = 0; i < daysInMonth; i++) {
      const checkDate = addDays(currentDate, -i);
      
      // Don't count days before month start
      if (checkDate < monthStart) break;
      
      const hasActivity = sortedDates.some(d => isSameDay(d, checkDate));
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateMonthlyStreak();
  const activeDays = weekDays.filter(d => d.hasActivity).length;
  const currentMonthName = format(today, "MMMM");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-premium rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Tracking Streak</h3>
            <p className="text-xs text-muted-foreground">{currentMonthName} streak</p>
          </div>
        </div>
        <motion.div 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <Flame className="w-3.5 h-3.5 text-warning" />
          <span className="text-sm font-bold text-warning">{streak}</span>
          <span className="text-xs text-warning/70">days</span>
        </motion.div>
      </div>

      {/* Week Progress */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {weekDays.map((day, index) => (
          <motion.div
            key={day.dayName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className="flex flex-col items-center gap-1.5"
          >
            <span className={`text-xs ${day.isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {day.dayName.charAt(0)}
            </span>
            <div 
              className={`
                habit-dot
                ${day.hasActivity ? 'habit-dot-active' : 'habit-dot-inactive'}
                ${day.isToday ? 'habit-dot-today' : ''}
              `}
            />
          </motion.div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {activeDays}/7 days this week
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {streak >= 7 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-success"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">On track!</span>
            </motion.div>
          )}
          {streak < 7 && streak > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Keep going!</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

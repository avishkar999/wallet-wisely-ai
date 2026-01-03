import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, addWeeks, addMonths, addYears, isBefore, isToday, differenceInDays } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type TransactionCategory = Database["public"]["Enums"]["transaction_category"];

export type RecurringTransaction = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: string;
  category: TransactionCategory;
  frequency: string;
  day_of_month: number | null;
  day_of_week: number | null;
  next_due_date: string;
  reminder_days_before: number | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringTransactionInsert = {
  title: string;
  amount: number;
  type: string;
  category: TransactionCategory;
  frequency: string;
  next_due_date: string;
  day_of_month?: number | null;
  day_of_week?: number | null;
  reminder_days_before?: number;
  is_active?: boolean;
  notes?: string | null;
};

export function useRecurringTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recurring_transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("next_due_date", { ascending: true });
      
      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!user,
  });
}

export function useAddRecurringTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: RecurringTransactionInsert) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("recurring_transactions")
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
    },
  });
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; next_due_date?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
    },
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
    },
  });
}

// Helper to calculate next due date after marking as paid
export function getNextDueDate(frequency: string, currentDate: Date): Date {
  switch (frequency) {
    case "daily":
      return addDays(currentDate, 1);
    case "weekly":
      return addWeeks(currentDate, 1);
    case "monthly":
      return addMonths(currentDate, 1);
    case "yearly":
      return addYears(currentDate, 1);
    default:
      return addMonths(currentDate, 1);
  }
}

// Get upcoming reminders
export function useUpcomingReminders() {
  const { data: recurring = [] } = useRecurringTransactions();
  
  const today = new Date();
  
  return recurring
    .filter(r => r.is_active)
    .map(r => {
      const dueDate = new Date(r.next_due_date);
      const daysUntilDue = differenceInDays(dueDate, today);
      const reminderDays = r.reminder_days_before || 3;
      const isReminder = daysUntilDue <= reminderDays && daysUntilDue >= 0;
      const isOverdue = isBefore(dueDate, today) && !isToday(dueDate);
      
      return {
        ...r,
        daysUntilDue,
        isReminder,
        isOverdue,
        isDueToday: isToday(dueDate),
      };
    })
    .filter(r => r.isReminder || r.isOverdue || r.isDueToday)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

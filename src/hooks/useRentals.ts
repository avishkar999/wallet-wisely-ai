import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RentalType = "shop" | "home" | "other";
export type RentalStatus = "active" | "vacant" | "pending" | "terminated";

export interface Rental {
  id: string;
  user_id: string;
  name: string;
  type: RentalType;
  address: string | null;
  monthly_rent: number;
  security_deposit: number | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_due_day: number | null;
  status: RentalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalPayment {
  id: string;
  user_id: string;
  rental_id: string;
  amount: number;
  payment_date: string;
  payment_month: string;
  is_partial: boolean;
  late_fee: number;
  notes: string | null;
  created_at: string;
}

export interface RentalExpense {
  id: string;
  user_id: string;
  rental_id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  created_at: string;
}

export function useRentals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rentals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("rentals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Rental[];
    },
    enabled: !!user,
  });
}

export function useRentalPayments(rentalId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rental_payments", user?.id, rentalId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("rental_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false });
      
      if (rentalId) {
        query = query.eq("rental_id", rentalId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RentalPayment[];
    },
    enabled: !!user,
  });
}

export function useRentalExpenses(rentalId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rental_expenses", user?.id, rentalId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("rental_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });
      
      if (rentalId) {
        query = query.eq("rental_id", rentalId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RentalExpense[];
    },
    enabled: !!user,
  });
}

export function useAddRental() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rental: Omit<Rental, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("rentals")
        .insert({ ...rental, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
  });
}

export function useUpdateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Rental> & { id: string }) => {
      const { data, error } = await supabase
        .from("rentals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
  });
}

export function useDeleteRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rentals")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
  });
}

export function useAddRentalPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payment: Omit<RentalPayment, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("rental_payments")
        .insert({ ...payment, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental_payments"] });
    },
  });
}

export function useAddRentalExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (expense: Omit<RentalExpense, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("rental_expenses")
        .insert({ ...expense, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental_expenses"] });
    },
  });
}

export function useRentalSummary() {
  const { data: rentals = [], isLoading: rentalsLoading } = useRentals();
  const { data: payments = [], isLoading: paymentsLoading } = useRentalPayments();
  const { data: expenses = [], isLoading: expensesLoading } = useRentalExpenses();

  const totalMonthlyRent = rentals
    .filter(r => r.status === "active")
    .reduce((sum, r) => sum + Number(r.monthly_rent), 0);

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netIncome = totalCollected - totalExpenses;

  const byType = {
    shop: rentals.filter(r => r.type === "shop"),
    home: rentals.filter(r => r.type === "home"),
    other: rentals.filter(r => r.type === "other"),
  };

  const byStatus = {
    active: rentals.filter(r => r.status === "active").length,
    vacant: rentals.filter(r => r.status === "vacant").length,
    pending: rentals.filter(r => r.status === "pending").length,
  };

  return {
    rentals,
    payments,
    expenses,
    totalMonthlyRent,
    totalCollected,
    totalExpenses,
    netIncome,
    byType,
    byStatus,
    isLoading: rentalsLoading || paymentsLoading || expensesLoading,
    rentalCount: rentals.length,
  };
}

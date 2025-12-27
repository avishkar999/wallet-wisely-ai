import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type CalendarEvent = Tables<"calendar_events">;
type CalendarEventInsert = TablesInsert<"calendar_events">;
type CalendarEventUpdate = TablesUpdate<"calendar_events">;

export function useCalendarEvents(month?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["calendar_events", user?.id, month],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id);

      if (month) {
        const startDate = `${month}-01`;
        const endDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0)
          .toISOString().split("T")[0];
        query = query.gte("event_date", startDate).lte("event_date", endDate);
      }

      const { data, error } = await query.order("event_date", { ascending: true });
      
      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!user,
  });
}

export function useAddCalendarEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: Omit<CalendarEventInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...event, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CalendarEventUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
    },
  });
}

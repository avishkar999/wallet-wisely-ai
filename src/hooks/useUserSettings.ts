import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMappingStore,
  replaceMappingStore,
  subscribeMappings,
  type ColumnMapping,
} from "@/utils/recurringBackup";

export type UserSettings = {
  id: string;
  user_id: string;
  csv_column_mappings: Record<string, ColumnMapping>;
  last_monthly_reset: string | null;
  monthly_budget_goal: number;
};

async function fetchOrCreate(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as UserSettings;

  const { data: created, error: insertError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select()
    .single();
  if (insertError) throw insertError;
  return created as unknown as UserSettings;
}

export function useUserSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => (user ? fetchOrCreate(user.id) : null),
    enabled: !!user,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<UserSettings, "id" | "user_id">>) => {
      if (!user) throw new Error("Not authenticated");
      await fetchOrCreate(user.id);
      const { data, error } = await supabase
        .from("user_settings")
        .update(updates as never)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });
}

/**
 * Keeps the remembered CSV column mappings in sync with the user's account,
 * so import preferences follow them to any device.
 */
export function useCsvMappingSync() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const update = useUpdateUserSettings();

  // Pull remote mappings into the local cache once they load.
  useEffect(() => {
    if (!settings) return;
    const remote = settings.csv_column_mappings ?? {};
    const local = getMappingStore();
    const merged = { ...remote, ...local };
    replaceMappingStore(merged);
    if (JSON.stringify(merged) !== JSON.stringify(remote)) {
      update.mutate({ csv_column_mappings: merged });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.id]);

  // Push any local change back up.
  useEffect(() => {
    if (!user) return;
    return subscribeMappings(() => {
      update.mutate({ csv_column_mappings: getMappingStore() });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}

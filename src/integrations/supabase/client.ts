import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_PUBLISHABLE_KEY &&
  !SUPABASE_URL.includes('placeholder')
);

// Demo user ID used across sessions
const DEMO_USER_ID = "demo-user-id";
const DEMO_USER = {
  id: DEMO_USER_ID,
  app_metadata: {},
  user_metadata: { display_name: "Avishkar" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "demo@coinkeeper.app",
};

const DEMO_SESSION = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: DEMO_USER,
};

function getStoredSession() {
  try {
    const raw = localStorage.getItem("coinkeeper_session_v3");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEMO_SESSION;
}

function setStoredSession(session: any) {
  try {
    if (session) {
      localStorage.setItem("coinkeeper_session_v3", JSON.stringify(session));
    } else {
      localStorage.removeItem("coinkeeper_session_v3");
    }
  } catch {
    // ignore
  }
}

// Zero-data storage purge and key version
const CLEAN_STORAGE_VERSION = "coinkeeper_clean_zero_v3";

function purgeOldFinancialData() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const purged = localStorage.getItem(CLEAN_STORAGE_VERSION);
    if (!purged) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("ww_db_") ||
            key.startsWith("wallet_wisely_") ||
            key.startsWith("coinkeeper_db_") ||
            key.startsWith("coinkeeper_custom_") ||
            key.startsWith("coinkeeper_financial_rules_") ||
            key.startsWith("coinkeeper_income_sources_") ||
            key.startsWith("coinkeeper_user_profile_"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(CLEAN_STORAGE_VERSION, "true");
    }
  } catch {
    // ignore
  }
}

// Run storage cleanup immediately
purgeOldFinancialData();

export function clearAllFinancialData() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const tables = [
      "transactions",
      "budgets",
      "debts",
      "investments",
      "savings_goals",
      "recurring_transactions",
      "emergency_fund",
      "monthly_summaries",
      "accounts",
      "rentals",
    ];
    tables.forEach((t) => {
      localStorage.setItem(`ck_db_clean_${t}`, JSON.stringify([]));
    });
    localStorage.removeItem("coinkeeper_clean_profile_v3");
    localStorage.removeItem("coinkeeper_clean_cycles_v3");
    localStorage.removeItem("coinkeeper_clean_rules_v3");
  } catch {
    // ignore
  }
}

// Initial mock database seed — ABSOLUTE ZERO DATA
function getInitialData(table: string, userId: string): any[] {
  const now = new Date();
  const nowIso = now.toISOString();

  switch (table) {
    case "profiles":
      return [
        {
          id: "profile-1",
          user_id: userId,
          display_name: "Avishkar",
          avatar_url: null,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "user_settings":
      return [
        {
          id: "settings-1",
          user_id: userId,
          monthly_budget_goal: 0,
          last_monthly_reset: null,
          csv_column_mappings: {},
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    // Every financial table starts at 100% clean ZERO DATA
    case "transactions":
    case "budgets":
    case "debts":
    case "investments":
    case "savings_goals":
    case "recurring_transactions":
    case "emergency_fund":
    case "monthly_summaries":
    case "accounts":
    case "rentals":
    default:
      return [];
  }
}

function getTableRecords(table: string, userId: string = DEMO_USER_ID): any[] {
  const storageKey = `ck_db_clean_${table}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const initial = getInitialData(table, userId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

function saveTableRecords(table: string, records: any[]) {
  try {
    localStorage.setItem(`ck_db_clean_${table}`, JSON.stringify(records));
  } catch {
    // ignore
  }
}

function createMockQueryBuilder(table: string) {
  let filters: Array<(item: any) => boolean> = [];
  let sortFn: ((a: any, b: any) => number) | null = null;
  let limitVal: number | null = null;
  let isSingle = false;
  let isMaybeSingle = false;
  let action: "select" | "insert" | "update" | "delete" = "select";
  let payload: any = null;

  const builder: any = {
    select: (_fields?: string) => {
      action = "select";
      return builder;
    },
    insert: (data: any) => {
      action = "insert";
      payload = data;
      return builder;
    },
    update: (updates: any) => {
      action = "update";
      payload = updates;
      return builder;
    },
    delete: () => {
      action = "delete";
      return builder;
    },
    eq: (column: string, value: any) => {
      filters.push((item) => item[column] === value);
      return builder;
    },
    neq: (column: string, value: any) => {
      filters.push((item) => item[column] !== value);
      return builder;
    },
    gte: (column: string, value: any) => {
      filters.push((item) => item[column] >= value);
      return builder;
    },
    lte: (column: string, value: any) => {
      filters.push((item) => item[column] <= value);
      return builder;
    },
    gt: (column: string, value: any) => {
      filters.push((item) => item[column] > value);
      return builder;
    },
    lt: (column: string, value: any) => {
      filters.push((item) => item[column] < value);
      return builder;
    },
    in: (column: string, values: any[]) => {
      filters.push((item) => values.includes(item[column]));
      return builder;
    },
    order: (column: string, { ascending = true }: { ascending?: boolean } = {}) => {
      sortFn = (a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
      };
      return builder;
    },
    limit: (count: number) => {
      limitVal = count;
      return builder;
    },
    single: () => {
      isSingle = true;
      return builder;
    },
    maybeSingle: () => {
      isMaybeSingle = true;
      return builder;
    },
    then: (onfulfilled?: any, onrejected?: any) => {
      return execute().then(onfulfilled, onrejected);
    },
  };

  async function execute() {
    let currentRecords = getTableRecords(table);

    if (action === "insert") {
      const itemsToInsert = Array.isArray(payload) ? payload : [payload];
      const nowIso = new Date().toISOString();
      const inserted = itemsToInsert.map((item) => ({
        id: item.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: item.created_at || nowIso,
        updated_at: item.updated_at || nowIso,
        ...item,
      }));
      currentRecords = [...currentRecords, ...inserted];
      saveTableRecords(table, currentRecords);
      const resData = Array.isArray(payload) ? inserted : inserted[0];
      return { data: isSingle ? (inserted[0] || null) : resData, error: null };
    }

    if (action === "update") {
      const nowIso = new Date().toISOString();
      const updatedList: any[] = [];
      currentRecords = currentRecords.map((item) => {
        const matches = filters.every((fn) => fn(item));
        if (matches) {
          const updated = { ...item, ...payload, updated_at: nowIso };
          updatedList.push(updated);
          return updated;
        }
        return item;
      });
      saveTableRecords(table, currentRecords);
      const resData = isSingle ? (updatedList[0] || null) : updatedList;
      return { data: resData, error: null };
    }

    if (action === "delete") {
      currentRecords = currentRecords.filter((item) => !filters.every((fn) => fn(item)));
      saveTableRecords(table, currentRecords);
      return { data: null, error: null };
    }

    // Default: select
    let result = currentRecords.filter((item) => filters.every((fn) => fn(item)));
    if (sortFn) {
      result.sort(sortFn);
    }
    if (limitVal !== null) {
      result = result.slice(0, limitVal);
    }

    if (isSingle) {
      if (result.length === 0) {
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
      }
      return { data: result[0], error: null };
    }

    if (isMaybeSingle) {
      return { data: result[0] || null, error: null };
    }

    return { data: result, error: null };
  }

  return builder;
}

function createMockSupabaseClient(): any {
  const authListeners: Array<(event: string, session: any) => void> = [];

  const mockClient = {
    auth: {
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authListeners.push(callback);
        const currentSession = getStoredSession();
        setTimeout(() => callback("INITIAL_SESSION", currentSession), 10);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authListeners.indexOf(callback);
                if (idx > -1) authListeners.splice(idx, 1);
              },
            },
          },
        };
      },
      getSession: async () => {
        const session = getStoredSession();
        return { data: { session }, error: null };
      },
      getUser: async () => {
        const session = getStoredSession();
        return { data: { user: session?.user ?? null }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string; password?: string }) => {
        const session = {
          ...DEMO_SESSION,
          user: {
            ...DEMO_USER,
            email: email || DEMO_USER.email,
            user_metadata: { display_name: email ? email.split("@")[0] : "Avishkar" },
          },
        };
        setStoredSession(session);
        authListeners.forEach((fn) => fn("SIGNED_IN", session));
        return { data: { user: session.user, session }, error: null };
      },
      signUp: async ({ email, options }: { email: string; password?: string; options?: any }) => {
        const displayName = options?.data?.display_name || (email ? email.split("@")[0] : "Avishkar");
        const session = {
          ...DEMO_SESSION,
          user: {
            ...DEMO_USER,
            email,
            user_metadata: { display_name: displayName },
          },
        };
        setStoredSession(session);
        authListeners.forEach((fn) => fn("SIGNED_IN", session));
        return { data: { user: session.user, session }, error: null };
      },
      signOut: async () => {
        setStoredSession(null);
        authListeners.forEach((fn) => fn("SIGNED_OUT", null));
        return { error: null };
      },
    },
    from: (tableName: string) => createMockQueryBuilder(tableName),
    functions: {
      invoke: async (functionName: string, _options?: any) => {
        return { data: { success: true, message: `Mock function ${functionName} called` }, error: null };
      },
    },
    channel: (_channelName: string) => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: () => {},
        }),
      }),
      subscribe: () => ({
        unsubscribe: () => {},
      }),
    }),
  };

  return mockClient;
}

export const supabase: any = isConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: brokeredPreviewStorage(),
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createMockSupabaseClient();

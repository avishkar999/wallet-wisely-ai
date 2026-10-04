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

// Demo user ID used across seeded mock records
const DEMO_USER_ID = "demo-user-id";
const DEMO_USER = {
  id: DEMO_USER_ID,
  app_metadata: {},
  user_metadata: { display_name: "Demo User" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "demo@walletwisely.app",
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
    const raw = localStorage.getItem("wallet_wisely_mock_session");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function setStoredSession(session: any) {
  try {
    if (session) {
      localStorage.setItem("wallet_wisely_mock_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("wallet_wisely_mock_session");
    }
  } catch {
    // ignore
  }
}

// Initial mock database seed
function getInitialData(table: string, userId: string): any[] {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const todayStr = now.toISOString().slice(0, 10);
  const nowIso = now.toISOString();

  switch (table) {
    case "profiles":
      return [
        {
          id: "profile-1",
          user_id: userId,
          display_name: "Alex Morgan",
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
          monthly_budget_goal: 3200,
          last_monthly_reset: `${currentMonth}-01`,
          csv_column_mappings: {},
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "emergency_fund":
      return [
        {
          id: "emergency-1",
          user_id: userId,
          current_amount: 8500,
          goal_amount: 15000,
          target_date: `${now.getFullYear()}-12-31`,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "budgets":
      return [
        { id: "b1", user_id: userId, category: "food", budgeted_amount: 600, month: `${currentMonth}-01`, created_at: nowIso, updated_at: nowIso },
        { id: "b2", user_id: userId, category: "transport", budgeted_amount: 250, month: `${currentMonth}-01`, created_at: nowIso, updated_at: nowIso },
        { id: "b3", user_id: userId, category: "bills", budgeted_amount: 400, month: `${currentMonth}-01`, created_at: nowIso, updated_at: nowIso },
        { id: "b4", user_id: userId, category: "entertainment", budgeted_amount: 200, month: `${currentMonth}-01`, created_at: nowIso, updated_at: nowIso },
        { id: "b5", user_id: userId, category: "shopping", budgeted_amount: 350, month: `${currentMonth}-01`, created_at: nowIso, updated_at: nowIso },
        { id: "b6", user_id: userId, category: "health", budgeted_amount: 150, month: `${currentMonth}-01`, created_at: nowIso, updated_at: nowIso },
      ];

    case "transactions":
      return [
        {
          id: "t1",
          user_id: userId,
          name: "Monthly Salary Deposit",
          description: "Primary Employer Salary",
          amount: 4800,
          type: "income",
          category: "income",
          payment_method: "neft",
          transaction_date: `${currentMonth}-01`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t2",
          user_id: userId,
          name: "Fresh Market Groceries",
          description: "Weekly food essentials & fresh produce",
          amount: 142.50,
          type: "expense",
          category: "food",
          payment_method: "debit_card",
          transaction_date: `${currentMonth}-03`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t3",
          user_id: userId,
          name: "Electric & Energy Utility",
          description: "Monthly electricity invoice",
          amount: 88.00,
          type: "expense",
          category: "bills",
          payment_method: "auto_pay",
          transaction_date: `${currentMonth}-04`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t4",
          user_id: userId,
          name: "City Commuter Rail Pass",
          description: "Monthly public transit pass",
          amount: 75.00,
          type: "expense",
          category: "transport",
          payment_method: "upi",
          transaction_date: `${currentMonth}-05`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t5",
          user_id: userId,
          name: "Online Media Streaming",
          description: "Entertainment subscription bundle",
          amount: 28.99,
          type: "expense",
          category: "entertainment",
          payment_method: "credit_card",
          transaction_date: `${currentMonth}-06`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t6",
          user_id: userId,
          name: "Organic Coffee & Bakery",
          description: "Afternoon work snack",
          amount: 18.50,
          type: "expense",
          category: "food",
          payment_method: "upi",
          transaction_date: `${currentMonth}-08`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t7",
          user_id: userId,
          name: "Pharmacy & Wellness",
          description: "Vitamins and healthcare",
          amount: 45.00,
          type: "expense",
          category: "health",
          payment_method: "debit_card",
          transaction_date: `${currentMonth}-10`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t8",
          user_id: userId,
          name: "Freelance Project Milestone",
          description: "UI/UX design consulting gig",
          amount: 950.00,
          type: "income",
          category: "income",
          payment_method: "upi",
          transaction_date: `${currentMonth}-12`,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "t9",
          user_id: userId,
          name: "Home Office Accessories",
          description: "Ergonomic keyboard and desk pad",
          amount: 120.00,
          type: "expense",
          category: "shopping",
          payment_method: "credit_card",
          transaction_date: todayStr,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "debts":
      return [
        {
          id: "d1",
          user_id: userId,
          name: "Higher Education Loan",
          type: "education_loan",
          principal_amount: 14000,
          outstanding_amount: 7200,
          interest_rate: 4.8,
          minimum_payment: 240,
          due_date: 15,
          next_payment_date: `${currentMonth}-15`,
          last_payment_date: null,
          start_date: "2023-01-15",
          end_date: "2028-01-15",
          reminder_enabled: true,
          reminder_days_before: 3,
          notes: "Low-interest federal student financing",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "d2",
          user_id: userId,
          name: "Platinum Cashback Card",
          type: "credit_card",
          principal_amount: 2500,
          outstanding_amount: 980,
          interest_rate: 17.5,
          minimum_payment: 85,
          due_date: 22,
          next_payment_date: `${currentMonth}-22`,
          last_payment_date: null,
          start_date: "2024-03-01",
          end_date: null,
          reminder_enabled: true,
          reminder_days_before: 2,
          notes: "Priority payoff to avoid interest",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "investments":
      return [
        {
          id: "inv1",
          user_id: userId,
          name: "Global Total Market Index ETF",
          type: "mutual_fund",
          invested_amount: 5000,
          current_value: 6350,
          units: 25,
          nav: 254,
          purchase_date: "2023-06-10",
          risk_level: "Moderate",
          notes: "Core long-term compounder",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "inv2",
          user_id: userId,
          name: "Clean Energy Innovation Fund",
          type: "stock",
          invested_amount: 2800,
          current_value: 3420,
          units: 40,
          nav: 85.5,
          purchase_date: "2023-09-15",
          risk_level: "High",
          notes: "Renewable energy sector basket",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "inv3",
          user_id: userId,
          name: "High-Yield Bank Deposit",
          type: "fixed_deposit",
          invested_amount: 4000,
          current_value: 4320,
          units: 1,
          nav: 4320,
          purchase_date: "2024-01-05",
          risk_level: "Low",
          notes: "Guaranteed 7.5% annual return",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "savings_goals":
      return [
        {
          id: "sg1",
          user_id: userId,
          name: "Emergency Safety Net",
          category: "Emergency",
          target_amount: 15000,
          current_amount: 8500,
          target_date: `${now.getFullYear() + 1}-06-30`,
          is_completed: false,
          notes: "6 months living buffer",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "sg2",
          user_id: userId,
          name: "Tokyo & Kyoto Vacation",
          category: "Travel",
          target_amount: 3800,
          current_amount: 2600,
          target_date: `${now.getFullYear()}-11-15`,
          is_completed: false,
          notes: "Autumn trip savings",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "sg3",
          user_id: userId,
          name: "Developer Workstation",
          category: "Electronics",
          target_amount: 1800,
          current_amount: 1800,
          target_date: `${now.getFullYear()}-03-01`,
          is_completed: true,
          notes: "Goal reached!",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    case "recurring_transactions":
      return [
        {
          id: "rt1",
          user_id: userId,
          title: "Apartment Rental Payment",
          amount: 1250,
          type: "expense",
          category: "bills",
          frequency: "monthly",
          day_of_month: 1,
          day_of_week: null,
          next_due_date: `${currentMonth}-01`,
          reminder_days_before: 3,
          is_active: true,
          notes: "Direct lease transfer",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "rt2",
          user_id: userId,
          title: "High-Speed Fiber Internet",
          amount: 65,
          type: "expense",
          category: "bills",
          frequency: "monthly",
          day_of_month: 10,
          day_of_week: null,
          next_due_date: `${currentMonth}-10`,
          reminder_days_before: 2,
          is_active: true,
          notes: "Monthly autopay",
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: "rt3",
          user_id: userId,
          title: "Spotify & Cloud Storage",
          amount: 19.99,
          type: "expense",
          category: "entertainment",
          frequency: "monthly",
          day_of_month: 18,
          day_of_week: null,
          next_due_date: `${currentMonth}-18`,
          reminder_days_before: 1,
          is_active: true,
          notes: "Digital lifestyle bundle",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ];

    default:
      return [];
  }
}

function getTableRecords(table: string, userId: string = DEMO_USER_ID): any[] {
  const storageKey = `ww_db_${table}`;
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
    localStorage.setItem(`ww_db_${table}`, JSON.stringify(records));
  } catch {
    // ignore
  }
}

function createMockQueryBuilder(table: string) {
  let records = getTableRecords(table);
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
        // Initially broadcast current session
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
            user_metadata: { display_name: email ? email.split("@")[0] : "Demo User" },
          },
        };
        setStoredSession(session);
        authListeners.forEach((fn) => fn("SIGNED_IN", session));
        return { data: { user: session.user, session }, error: null };
      },
      signUp: async ({ email, options }: { email: string; password?: string; options?: any }) => {
        const displayName = options?.data?.display_name || (email ? email.split("@")[0] : "Demo User");
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

import { z } from "zod";

export const RECURRING_CATEGORIES = [
  "food",
  "shopping",
  "transport",
  "entertainment",
  "bills",
  "health",
  "recharges",
  "education",
  "travel",
  "income",
  "other",
] as const;

export const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export const MAX_REMINDER_DAYS: Record<string, number> = {
  daily: 0,
  weekly: 6,
  monthly: 27,
  yearly: 30,
};

const MAX_AMOUNT = 10_000_000;
const MIN_DATE = new Date("2000-01-01");
const MAX_DATE = new Date("2100-12-31");

export const recurringSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required" })
      .max(100, { message: "Title must be under 100 characters" }),
    amount: z
      .number({ invalid_type_error: "Enter a valid amount" })
      .refine((v) => Number.isFinite(v), { message: "Enter a valid amount" })
      .refine((v) => v > 0, { message: "Amount must be greater than 0" })
      .refine((v) => v <= MAX_AMOUNT, { message: "Amount must be under ₹1,00,00,000" }),
    type: z.enum(["expense", "income"], { message: "Choose income or expense" }),
    category: z.enum(RECURRING_CATEGORIES, { message: "Choose a valid category" }),
    frequency: z.enum(RECURRING_FREQUENCIES, { message: "Choose a valid frequency" }),
    next_due_date: z
      .string()
      .min(1, { message: "Next due date is required" })
      .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Enter a valid date" })
      .refine((v) => {
        const d = new Date(v);
        return d >= MIN_DATE && d <= MAX_DATE;
      }, { message: "Date must be between 2000 and 2100" }),
    reminder_days_before: z
      .number()
      .int({ message: "Reminder days must be a whole number" })
      .min(0, { message: "Reminder days cannot be negative" })
      .max(30, { message: "Reminder days must be 30 or less" }),
    is_active: z.boolean().optional(),
    notes: z
      .string()
      .trim()
      .max(500, { message: "Notes must be under 500 characters" })
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    const max = MAX_REMINDER_DAYS[data.frequency] ?? 30;
    if (data.reminder_days_before > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reminder_days_before"],
        message:
          max === 0
            ? "Daily schedules can't have an advance reminder"
            : `For ${data.frequency} schedules, remind at most ${max} day${max > 1 ? "s" : ""} before`,
      });
    }
    if (data.type === "income" && data.category !== "income") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Income schedules must use the Income category",
      });
    }
    if (data.type === "expense" && data.category === "income") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Expense schedules can't use the Income category",
      });
    }
  });

export type RecurringFormValues = z.infer<typeof recurringSchema>;

export type FieldErrors = Partial<Record<keyof RecurringFormValues, string>>;

export type RecurringValidationSuccess = { ok: true; data: RecurringFormValues };
export type RecurringValidationFailure = { ok: false; errors: FieldErrors };
export type RecurringValidationResult =
  | RecurringValidationSuccess
  | RecurringValidationFailure;

export function validateRecurring(input: unknown): RecurringValidationResult {
  const parsed = recurringSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data as RecurringFormValues };
  }

  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof RecurringFormValues;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Guardrail for inline next-due-date edits. Returns an error message or null. */
export function validateDueDate(value: string): string | null {
  if (!value) return "Next due date is required";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Enter a valid date";
  if (d < MIN_DATE || d > MAX_DATE) return "Date must be between 2000 and 2100";
  return null;
}

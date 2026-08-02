import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;

    // Parse and validate input
    const body = await req.json();
    const { email, displayName } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || email.length > 255 || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeName = displayName ? String(displayName).slice(0, 100).replace(/[<>&"']/g, "") : null;

    // Use service role for data fetching scoped to authenticated user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating monthly digest for user: ${userId}, email: ${email}`);

    // Calculate date range for the previous month
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthName = startOfLastMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Fetch transactions scoped to authenticated user only
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("transaction_date", startOfLastMonth.toISOString().split("T")[0])
      .lte("transaction_date", endOfLastMonth.toISOString().split("T")[0]);

    if (txError) {
      console.error("Error fetching transactions:", txError);
      throw txError;
    }

    // Calculate summary statistics
    const income = transactions
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const expenses = transactions
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const savings = income - expenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    transactions
      ?.filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
      });

    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Detect potential subscriptions
    const expensesByName: Record<string, number[]> = {};
    transactions
      ?.filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.name.toLowerCase().trim();
        if (!expensesByName[name]) {
          expensesByName[name] = [];
        }
        expensesByName[name].push(Number(t.amount));
      });

    const potentialSubscriptions = Object.entries(expensesByName)
      .filter(([, amounts]) => amounts.length >= 2)
      .map(([name, amounts]) => ({
        name,
        count: amounts.length,
        total: amounts.reduce((a, b) => a + b, 0),
        average: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Fetch cancellation savings scoped to user
    const { data: cancelledSubs } = await supabase
      .from("subscription_decisions")
      .select("*")
      .eq("status", "cancelled")
      .eq("user_id", userId);

    const cancellationSavings = cancelledSubs?.reduce(
      (sum, d) => sum + Number(d.monthly_amount),
      0
    ) || 0;

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

    // Generate email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Financial Digest</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💰 Monthly Financial Digest</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">${monthName}</p>
          </div>

          <div style="padding: 32px;">
            ${safeName ? `<p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Hi ${safeName},</p>` : ''}
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Here's your financial summary for the past month:</p>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;">
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #166534; margin: 0 0 8px; font-size: 14px;">Income</p>
                <p style="color: #15803d; margin: 0; font-size: 24px; font-weight: bold;">${formatCurrency(income)}</p>
              </div>
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #991b1b; margin: 0 0 8px; font-size: 14px;">Expenses</p>
                <p style="color: #dc2626; margin: 0; font-size: 24px; font-weight: bold;">${formatCurrency(expenses)}</p>
              </div>
              <div style="background-color: ${savings >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: ${savings >= 0 ? '#166534' : '#991b1b'}; margin: 0 0 8px; font-size: 14px;">Net Savings</p>
                <p style="color: ${savings >= 0 ? '#15803d' : '#dc2626'}; margin: 0; font-size: 24px; font-weight: bold;">${formatCurrency(savings)}</p>
              </div>
              <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #1e40af; margin: 0 0 8px; font-size: 14px;">Savings Rate</p>
                <p style="color: #2563eb; margin: 0; font-size: 24px; font-weight: bold;">${savingsRate}%</p>
              </div>
            </div>

            ${sortedCategories.length > 0 ? `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">📊 Top Spending Categories</h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${sortedCategories.map(([category, amount], index) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; color: #374151; text-transform: capitalize;">${index + 1}. ${category.replace(/[<>&"']/g, "")}</td>
                    <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${formatCurrency(amount)}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
            ` : ''}

            ${potentialSubscriptions.length > 0 ? `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">🔄 Detected Recurring Expenses</h2>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">These expenses appeared multiple times this month:</p>
              <table style="width: 100%; border-collapse: collapse;">
                ${potentialSubscriptions.map((sub) => `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; color: #374151; text-transform: capitalize;">${sub.name.replace(/[<>&"']/g, "")}</td>
                    <td style="padding: 12px 0; color: #6b7280; text-align: center;">${sub.count}x</td>
                    <td style="padding: 12px 0; color: #111827; font-weight: 600; text-align: right;">${formatCurrency(sub.total)}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
            ` : ''}

            ${cancellationSavings > 0 ? `
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 32px; text-align: center;">
              <h3 style="color: #166534; margin: 0 0 8px; font-size: 16px;">🎉 Subscription Savings</h3>
              <p style="color: #15803d; margin: 0; font-size: 28px; font-weight: bold;">${formatCurrency(cancellationSavings)}/mo</p>
              <p style="color: #166534; margin: 8px 0 0; font-size: 14px;">saved from cancelled subscriptions</p>
            </div>
            ` : ''}

            <div style="background-color: #fefce8; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h3 style="color: #854d0e; margin: 0 0 12px; font-size: 16px;">💡 Quick Tips</h3>
              <ul style="color: #713f12; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                ${savings < 0 ? '<li>Your expenses exceeded income. Consider reviewing non-essential spending.</li>' : ''}
                ${savingsRate < 20 && savings >= 0 ? '<li>Try to save at least 20% of your income for financial security.</li>' : ''}
                ${savingsRate >= 20 ? '<li>Great job! You\'re saving a healthy portion of your income.</li>' : ''}
                ${potentialSubscriptions.length > 3 ? '<li>You have several recurring expenses. Review if all subscriptions are necessary.</li>' : ''}
                <li>Track your daily expenses to stay within budget.</li>
              </ul>
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              This is your automated monthly digest from WalletWisely.
            </p>
            <p style="color: #9ca3af; margin: 8px 0 0; font-size: 12px;">
              View your full dashboard for detailed insights.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "WalletWisely <onboarding@resend.dev>",
      to: [email],
      subject: `📊 Your ${monthName} Financial Summary`,
      html: emailHtml,
    });

    console.log("Monthly digest sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Monthly digest sent successfully",
        data: {
          income,
          expenses,
          savings,
          savingsRate,
          topCategories: sortedCategories.length,
          recurringExpenses: potentialSubscriptions.length,
          cancellationSavings,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-monthly-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

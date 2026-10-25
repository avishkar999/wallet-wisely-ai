import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages = [], financialContext = {} } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    const {
      income = 0,
      expenses = 0,
      balance = 0,
      savingsRate = 0,
      totalDebt = 0,
      totalInvestments = 0,
      categoryBreakdown = [],
      currency = "INR",
      persona = "salaried",
    } = financialContext;

    const topCategoriesText = Array.isArray(categoryBreakdown)
      ? categoryBreakdown
          .map((c: any) => `${c.label || c.category}: ${currency} ${c.spent || c.amount || 0}`)
          .slice(0, 5)
          .join(", ")
      : "None recorded yet";

    const systemPrompt = `You are "CoinKeeper Copilot", the user's personal financial advisor and wealth strategist.
Current User Balance & Financial Context:
- Monthly Income: ${currency} ${income}
- Monthly Expenses: ${currency} ${expenses}
- Net Cashflow / Savings: ${currency} ${balance} (${savingsRate}% savings rate)
- Total Debt / EMIs: ${currency} ${totalDebt}
- Investment Portfolio: ${currency} ${totalInvestments}
- Top Categories: ${topCategoriesText}
- Financial Persona: ${persona}

Provide concise, empowering, numbers-grounded advice with clear markdown formatting.`;

    if (!apiKey) {
      const fallbackResponse = `### Financial Standing Summary\n\n* **Income:** ${currency} ${income}\n* **Expenses:** ${currency} ${expenses}\n* **Net Surplus:** ${currency} ${balance} (${savingsRate}%)\n\nBased on your balance, you have ${balance > 0 ? `a positive cushion of ${currency} ${balance}` : "a tight budget this month"}.`;
      return new Response(JSON.stringify({ text: fallbackResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Gemini 3.8 Flash via REST streaming API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?key=${apiKey}`;

    const contents = [
      {
        role: "user",
        parts: [{ text: `[SYSTEM CONTEXT]: ${systemPrompt}\n\nAcknowledge your role.` }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am CoinKeeper Copilot, ready to assist with your personal finances." }],
      },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    return new Response(geminiRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, User, Bot, TrendingUp, CreditCard, PiggyBank } from "lucide-react";
import { useFinancialSummary } from "@/hooks/useTransactions";
import { useDebtSummary } from "@/hooks/useDebts";
import { useInvestmentSummary } from "@/hooks/useInvestments";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  { text: "How can I reduce my expenses?", icon: TrendingUp },
  { text: "Should I increase my SIP?", icon: PiggyBank },
  { text: "How to clear debt faster?", icon: CreditCard },
];

export function AIAdvisorChat() {
  const { income: totalIncome, expenses: totalExpenses, savingsRate, categoryTotals } = useFinancialSummary();
  const { totalDebt, avgInterestRate: avgInterest, totalMonthlyPayment: totalMonthly } = useDebtSummary();
  const { totalCurrentValue: totalValue, overallChangePercent: returnPercentage } = useInvestmentSummary();
  
  // Convert categoryTotals to array format and sort by highest spend first
  const byCategory = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const getInitialMessage = () => {
    if (totalIncome === 0 && totalExpenses === 0 && totalDebt === 0 && totalValue === 0) {
      return "Hi! I'm your AI Financial Advisor. It looks like you're just getting started. Add some transactions, investments, or debts, and I'll provide personalized insights to help you make smarter money decisions!";
    }
    return `Hi! I'm your AI Financial Advisor. I can see you have ${totalIncome > 0 ? `₹${(totalIncome / 1000).toFixed(0)}K monthly income` : 'no income recorded'}, ${totalValue > 0 ? `₹${(totalValue / 100000).toFixed(1)}L in investments` : 'no investments'}, and ${totalDebt > 0 ? `₹${(totalDebt / 100000).toFixed(1)}L in debt` : 'no debt'}. What would you like to know about your finances?`;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: getInitialMessage(),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (question: string): string => {
    const q = question.toLowerCase();

    // Expense-related questions
    if (q.includes("expense") || q.includes("spending") || q.includes("reduce")) {
      if (byCategory.length === 0) {
        return "You haven't recorded any expenses yet. Start adding your daily expenses to get personalized spending insights!";
      }
      const topCategories = [...byCategory].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
      const suggestions = topCategories.map(c => 
        `${c.category}: ₹${c.amount.toLocaleString('en-IN')} (${c.percentage}%)`
      ).join(', ');
      return `Based on your spending patterns, your top expense categories are: ${suggestions}. Consider setting budgets for each category and tracking against them. A good rule is the 50/30/20 budget: 50% needs, 30% wants, 20% savings.`;
    }

    // SIP/Investment questions
    if (q.includes("sip") || q.includes("invest")) {
      if (totalValue === 0) {
        return "You haven't added any investments yet. Start tracking your investments to get personalized advice on SIP amounts and portfolio allocation!";
      }
      const monthlyInvestmentCapacity = Math.max(0, (totalIncome - totalExpenses - totalMonthly) * 0.5);
      return `Your current portfolio is worth ₹${(totalValue / 100000).toFixed(2)}L with ${returnPercentage >= 0 ? 'a gain' : 'a loss'} of ${Math.abs(returnPercentage).toFixed(1)}%. Based on your cash flow, you could potentially invest up to ₹${monthlyInvestmentCapacity.toLocaleString('en-IN')} more per month. Consider diversifying across equity, debt, and gold in a 60:30:10 ratio for balanced growth.`;
    }

    // Debt-related questions
    if (q.includes("debt") || q.includes("loan") || q.includes("emi")) {
      if (totalDebt === 0) {
        return "Great news! You don't have any recorded debts. Keep it up! If you do take loans, remember to prioritize paying off high-interest debt first.";
      }
      return `Your total debt is ₹${(totalDebt / 100000).toFixed(1)}L with an average interest rate of ${avgInterest.toFixed(1)}%. Your monthly EMI commitment is ₹${totalMonthly.toLocaleString('en-IN')}. I recommend the avalanche method - pay minimum on all debts, then put extra money towards the highest interest rate debt. This saves the most on interest over time.`;
    }

    // Savings questions
    if (q.includes("saving") || q.includes("save")) {
      if (savingsRate <= 0) {
        return "Your current savings rate is 0% or negative. Try to identify non-essential expenses that can be reduced. Start with small goals - even saving 5% of your income is a good beginning!";
      }
      return `Your current savings rate is ${savingsRate}%. Financial experts recommend saving at least 20% of your income. ${savingsRate >= 20 ? "You're doing great! Consider investing your surplus in mutual funds or fixed deposits for better returns." : `To reach 20%, try reducing discretionary spending by ₹${((0.20 - savingsRate/100) * totalIncome).toLocaleString('en-IN')} per month.`}`;
    }

    // Default response
    return "I can help you with questions about your expenses, investments, debts, and savings. What specific aspect of your finances would you like to explore?";
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const currentInput = input;
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    const aiMessageId = (Date.now() + 1).toString();

    try {
      const response = await fetch("/api/ai-advisor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          financialContext: {
            income: totalIncome,
            expenses: totalExpenses,
            balance: totalIncome - totalExpenses,
            savingsRate,
            totalDebt,
            totalInvestments: totalValue,
            categoryBreakdown: byCategory,
            currency: "INR",
            persona: "salaried",
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream response error");
      }

      setIsTyping(false);

      // Create initial empty assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err) {
      console.warn("Streaming error, falling back to local reasoning:", err);
      const fallbackResponse = generateResponse(currentInput);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== aiMessageId);
        return [
          ...filtered,
          {
            id: aiMessageId,
            role: "assistant",
            content: fallbackResponse,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] max-h-[820px] flex flex-col min-h-0 walletpilot-panel">
      <Card variant="elevated" className="flex-1 min-h-0 flex flex-col overflow-hidden border-border/70 shadow-card bg-card/95 backdrop-blur-xl">
        <CardHeader className="border-b border-border/60 pb-3 sm:pb-4 shrink-0 bg-card/50">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  WalletPilot — AI Financial Advisor
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  Copilot
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">Autonomous intelligence powered by your financial records</p>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success font-medium">Online</span>
            </div>
          </CardTitle>
        </CardHeader>

        {/* Scrollable Message History with min-h-0 and independent overflow */}
        <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 walletpilot-messages scroll-smooth">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user" 
                  ? "bg-gradient-accent text-accent-foreground" 
                  : "bg-gradient-primary text-primary-foreground"
              }`}>
                {message.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              
              <div className={`max-w-[85%] sm:max-w-[75%] p-3.5 sm:p-4 rounded-2xl ${
                message.role === "user"
                  ? "bg-gradient-primary text-primary-foreground rounded-br-md shadow-sm"
                  : "bg-secondary/80 border border-border/40 text-foreground rounded-bl-md shadow-sm"
              }`}>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={`text-[10px] mt-2 ${
                  message.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-secondary/80 border border-border/40 p-4 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </CardContent>

        {/* Suggested Questions */}
        {messages.length < 3 && (
          <div className="px-4 py-2 border-t border-border/40 shrink-0 bg-card/40">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Suggested Prompts</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, index) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleQuestionClick(q.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border/50 text-xs text-foreground transition-all cursor-pointer hover:border-primary/40"
                  >
                    <Icon className="w-3 h-3 text-primary" />
                    <span>{q.text}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Composer - Always Accessible and non-shrinking */}
        <div className="p-3.5 sm:p-4 border-t border-border/60 shrink-0 bg-card/90 backdrop-blur-md walletpilot-composer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 items-center"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask WalletPilot about spending, budgets, investments, or debt..."
              className="flex-1 bg-secondary/70 border-border/50 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-primary h-10"
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping}
              className="h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

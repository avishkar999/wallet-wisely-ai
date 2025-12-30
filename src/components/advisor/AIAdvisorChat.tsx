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
  const { totalIncome, totalExpenses, savingsRate, byCategory } = useFinancialSummary();
  const { totalDebt, avgInterest, totalMonthly } = useDebtSummary();
  const { totalValue, returnPercentage } = useInvestmentSummary();

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
      const topCategories = byCategory.slice(0, 3);
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
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const response = generateResponse(currentInput);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <Card variant="elevated" className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Financial Advisor</h2>
              <p className="text-xs text-muted-foreground">Powered by your financial data • Available 24/7</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success">Online</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user" 
                  ? "bg-gradient-accent" 
                  : "bg-gradient-primary"
              }`}>
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-accent-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
              
              <div className={`max-w-[75%] p-4 rounded-2xl ${
                message.role === "user"
                  ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className={`text-[10px] mt-2 ${
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
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
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-secondary p-4 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Suggested Questions */}
        {messages.length < 3 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, index) => {
                const Icon = q.icon;
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuestionClick(q.text)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-xs text-foreground transition-colors"
                  >
                    <Icon className="w-3 h-3 text-primary" />
                    {q.text}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything about your finances..."
              className="flex-1 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button onClick={handleSend} size="icon" disabled={!input.trim() || isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

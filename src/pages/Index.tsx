import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { CashFlowCard } from "@/components/dashboard/CashFlowCard";
import { SpendingCategoriesCard } from "@/components/dashboard/SpendingCategoriesCard";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { ExpenseTracker } from "@/components/dashboard/ExpenseTracker";
import { InvestmentScanner } from "@/components/investments/InvestmentScanner";
import { DebtAnalyzer } from "@/components/debts/DebtAnalyzer";
import { AIAdvisorChat } from "@/components/advisor/AIAdvisorChat";
import { Bell, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "expenses":
        return <ExpenseTracker />;
      case "investments":
        return <InvestmentScanner />;
      case "debts":
        return <DebtAnalyzer />;
      case "advisor":
        return <AIAdvisorChat />;
      case "settings":
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Settings</h2>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main 
        className="transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 80 : 280 }}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <motion.h1 
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-semibold text-foreground capitalize"
              >
                {activeTab === "advisor" ? "AI Financial Advisor" : activeTab}
              </motion.h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-64 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Dec 2024
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const Dashboard = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <HealthScoreCard />
        </motion.div>
        <motion.div variants={itemVariants}>
          <CashFlowCard />
        </motion.div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants}>
          <SpendingCategoriesCard />
        </motion.div>
        <motion.div variants={itemVariants}>
          <PortfolioCard />
        </motion.div>
        <motion.div variants={itemVariants} className="space-y-6">
          <QuickActionsCard />
          <AIInsightCard />
        </motion.div>
      </div>

      {/* Bottom Row */}
      <motion.div variants={itemVariants}>
        <RecentTransactionsCard />
      </motion.div>
    </motion.div>
  );
};

export default Index;

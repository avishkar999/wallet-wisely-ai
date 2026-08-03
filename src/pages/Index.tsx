import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { HeroHealthScore } from "@/components/dashboard/HeroHealthScore";
import { HabitStreak } from "@/components/dashboard/HabitStreak";
import { SmartInsights } from "@/components/dashboard/SmartInsights";
import { InvestmentGrowth } from "@/components/dashboard/InvestmentGrowth";
import { QuickActionsCompact } from "@/components/dashboard/QuickActionsCompact";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SpendingBreakdown } from "@/components/dashboard/SpendingBreakdown";
import { ExpenseTracker } from "@/components/dashboard/ExpenseTracker";
import { InvestmentScanner } from "@/components/investments/InvestmentScanner";
import { DebtAnalyzer } from "@/components/debts/DebtAnalyzer";
import { AIAdvisorChat } from "@/components/advisor/AIAdvisorChat";
import { SettingsPage } from "@/pages/Settings";
import { CalendarPage } from "@/pages/Calendar";
import { DailySpendingTracker } from "@/components/tracker/DailySpendingTracker";
import { BudgetManager } from "@/components/budget/BudgetManager";
import { TransactionsHistory } from "@/components/transactions/TransactionsHistory";
import { SpendingAnalytics } from "@/components/analytics/SpendingAnalytics";
import { GoalTracker } from "@/components/goals/GoalTracker";
import { RentalManager } from "@/components/rentals/RentalManager";
import { Bell, Search, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMonthlyReset } from "@/hooks/useMonthlyReset";
import { useMonthlyArchive } from "@/hooks/useMonthlySummaries";
import { MonthlyHistory } from "@/components/history/MonthlyHistory";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { useAutoRecurring } from "@/hooks/useAutoRecurring";

const Index = () => {
  // Perform monthly data reset when month changes
  useMonthlyReset();
  // Archive completed months into Monthly History on app open
  useMonthlyArchive();
  // Auto-generate due recurring transactions (bills, EMI, subscriptions, income)
  useAutoRecurring();


  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "tracker":
        return <DailySpendingTracker />;
      case "budget":
        return <BudgetManager />;
      case "goals":
        return <GoalTracker />;
      case "history":
        return <TransactionsHistory />;
      case "monthly":
        return <MonthlyHistory />;

      case "analytics":
        return <SpendingAnalytics />;
      case "calendar":
        return <CalendarPage />;
      case "expenses":
        return <ExpenseTracker />;
      case "rentals":
        return <RentalManager />;
      case "investments":
        return <InvestmentScanner />;
      case "debts":
        return <DebtAnalyzer />;
      case "advisor":
        return <AIAdvisorChat />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isCollapsed={false}
              onToggle={() => {}}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}
      
      <main 
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280) }}
      >
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              <div>
                <motion.h1 
                  key={activeTab}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg sm:text-xl font-semibold text-foreground capitalize flex items-center gap-2"
                >
                  {activeTab === "dashboard" && <Sparkles className="w-5 h-5 text-primary" />}
                  {activeTab === "advisor"
                    ? "AI Financial Advisor"
                    : activeTab === "monthly"
                    ? "Monthly History"
                    : activeTab}

                </motion.h1>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-IN', { 
                    weekday: isMobile ? 'short' : 'long', 
                    month: isMobile ? 'short' : 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-64 bg-secondary/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const Dashboard = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 max-w-6xl mx-auto"
    >
      {/* Hero Health Score */}
      <HeroHealthScore />

      {/* Current month summary */}
      <MonthlySummaryCard />


      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <QuickActionsCompact />
            <HabitStreak />
          </div>
          <RecentActivity />
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <InvestmentGrowth />
          <SpendingBreakdown />
          <SmartInsights />
        </div>
      </div>
    </motion.div>
  );
};

export default Index;

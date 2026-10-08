import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  Sparkles,
  LogOut,
  CalendarDays,
  Receipt,
  Target,
  History,
  BarChart3,
  Goal,
  Building2,
  Archive,
  DatabaseZap,
  Layers,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "accounts", label: "My Money", icon: Wallet },
  { id: "tracker", label: "Daily Tracker", icon: Receipt },
  { id: "budget", label: "Budget & Flow", icon: Target },
  { id: "goals", label: "Goals", icon: Goal },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "investments", label: "Investments", icon: TrendingUp },
  { id: "debts", label: "Debts", icon: CreditCard },
  { id: "history", label: "Transactions", icon: History },
  { id: "monthly", label: "Monthly History", icon: Archive },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "advisor", label: "AI Advisor", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle }: SidebarProps) {
  const { data: profile } = useProfile();
  const { user, signOut } = useAuth();
  const { profile: ckProfile } = useCoinKeeper();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-5 flex items-center justify-between border-b border-sidebar-border/40">
        <motion.div 
          className="flex items-center gap-3"
          animate={{ opacity: isCollapsed ? 0 : 1 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="text-lg font-bold text-foreground tracking-tight flex items-center gap-1.5">
                CoinKeeper
              </span>
              <span className="text-[10px] text-primary uppercase font-mono tracking-wider font-semibold">
                Personal Finance OS
              </span>
            </motion.div>
          )}
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "transition-transform duration-300 h-8 w-8 text-muted-foreground hover:text-foreground",
            isCollapsed && "rotate-180"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && item.id === "advisor" && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 rounded-full bg-success animate-pulse"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3.5 border-t border-sidebar-border space-y-2">
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50",
          isCollapsed && "justify-center"
        )}>
          <div className="w-9 h-9 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-semibold text-xs shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
              <span className="text-[10px] text-primary capitalize font-medium">
                {ckProfile.persona} · {ckProfile.currency}
              </span>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={signOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </Button>
        )}
      </div>
    </motion.aside>
  );
}

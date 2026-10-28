import { motion } from "framer-motion";
import { Building2, RefreshCw, Target, Download, Wallet, Lock } from "lucide-react";
import { useState } from "react";
import { FinancialConnectionModal } from "@/components/connection/FinancialConnectionModal";
import { ConnectionManagerDialog } from "@/components/connection/ConnectionManagerDialog";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

export function QuickActionsCompact() {
  const { openBankImport, openExportModal } = useCoinKeeper();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const actions = [
    {
      label: "Connect Bank",
      icon: Building2,
      color: "hsl(var(--primary))",
      bgClass: "bg-primary/10 hover:bg-primary/20",
      onClick: () => setShowConnectModal(true),
    },
    {
      label: "Connections",
      icon: Lock,
      color: "hsl(var(--accent))",
      bgClass: "bg-accent/10 hover:bg-accent/20",
      onClick: () => setShowManageModal(true),
    },
    {
      label: "Import File",
      icon: RefreshCw,
      color: "hsl(var(--success))",
      bgClass: "bg-success/10 hover:bg-success/20",
      onClick: openBankImport,
    },
    {
      label: "Export CSV",
      icon: Download,
      color: "hsl(var(--warning))",
      bgClass: "bg-warning/10 hover:bg-warning/20",
      onClick: () => openExportModal("transactions"),
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-premium rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Automated Hub</h3>
            <p className="text-xs text-muted-foreground">Manage feeds & data</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.onClick}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl ${action.bgClass} border border-transparent hover:border-border/50 transition-all cursor-pointer group`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${action.color}15` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: action.color }} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <FinancialConnectionModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onOpenBankStatementImport={openBankImport}
      />
      <ConnectionManagerDialog
        open={showManageModal}
        onOpenChange={setShowManageModal}
        onAddNewConnection={() => setShowConnectModal(true)}
      />
    </>
  );
}

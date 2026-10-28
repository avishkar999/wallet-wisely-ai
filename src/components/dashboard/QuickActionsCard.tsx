import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, RefreshCw, Target, Download, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { FinancialConnectionModal } from "@/components/connection/FinancialConnectionModal";
import { ConnectionManagerDialog } from "@/components/connection/ConnectionManagerDialog";
import { useCoinKeeper } from "@/contexts/CoinKeeperContext";

export function QuickActionsCard() {
  const { openBankImport, openExportModal } = useCoinKeeper();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const actions = [
    {
      label: "Connect Bank",
      icon: Building2,
      color: "hsl(var(--primary))",
      onClick: () => setShowConnectModal(true),
    },
    {
      label: "Connections",
      icon: Lock,
      color: "hsl(var(--accent))",
      onClick: () => setShowManageModal(true),
    },
    {
      label: "Import Statement",
      icon: RefreshCw,
      color: "hsl(var(--success))",
      onClick: openBankImport,
    },
    {
      label: "Export CSV",
      icon: Download,
      color: "hsl(var(--warning))",
      onClick: () => openExportModal("transactions"),
    },
  ];

  return (
    <>
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Automated Feeds</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:shadow-lg"
                    style={{
                      backgroundColor: `${action.color}20`,
                    }}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

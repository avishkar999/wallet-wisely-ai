import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Home, 
  Store, 
  Building2, 
  Plus, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  Bell,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3
} from "lucide-react";
import { useRentalSummary, useDeleteRental, Rental } from "@/hooks/useRentals";
import { EmptyState } from "@/components/ui/empty-state";
import { AddRentalDialog } from "@/components/forms/AddRentalDialog";
import { RecordPaymentDialog } from "@/components/forms/RecordPaymentDialog";
import { RecordExpenseDialog } from "@/components/forms/RecordExpenseDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const typeConfig = {
  shop: { icon: Store, color: "hsl(var(--warning))", label: "Shop", bg: "bg-warning/10" },
  home: { icon: Home, color: "hsl(var(--primary))", label: "Home", bg: "bg-primary/10" },
  other: { icon: Building2, color: "hsl(var(--accent))", label: "Other", bg: "bg-accent/10" },
};

const statusConfig = {
  active: { color: "bg-success text-success-foreground", label: "Active" },
  vacant: { color: "bg-warning text-warning-foreground", label: "Vacant" },
  pending: { color: "bg-accent text-accent-foreground", label: "Pending" },
  terminated: { color: "bg-destructive text-destructive-foreground", label: "Terminated" },
};

export function RentalManager() {
  const { rentals, totalMonthlyRent, totalCollected, netIncome, byStatus, isLoading } = useRentalSummary();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [rentalToDelete, setRentalToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "shop" | "home" | "other">("all");

  const deleteRental = useDeleteRental();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredRentals = activeTab === "all" 
    ? rentals 
    : rentals.filter(r => r.type === activeTab);

  const handleDelete = async () => {
    if (!rentalToDelete) return;
    try {
      await deleteRental.mutateAsync(rentalToDelete);
      toast({ title: "Property deleted successfully" });
      setRentalToDelete(null);
    } catch {
      toast({ title: "Failed to delete property", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rental Properties</h1>
          <p className="text-sm text-muted-foreground">Manage your rental income and properties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExpenseDialog(true)}>
            <ArrowDownRight className="w-4 h-4 mr-2" />
            Record Expense
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="card-hero">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMonthlyRent)}</p>
              <p className="text-xs text-muted-foreground mt-1">Expected income</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-premium">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Collected</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCollected)}</p>
              <p className="text-xs text-success mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                This period
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-premium">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">Net Income</span>
              </div>
              <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(netIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">After expenses</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-premium">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-warning" />
                </div>
                <span className="text-sm text-muted-foreground">Properties</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{rentals.length}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-success">{byStatus.active} active</span>
                <span className="text-xs text-warning">{byStatus.vacant} vacant</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="all" className="gap-2">
            <Building2 className="w-4 h-4" />
            All ({rentals.length})
          </TabsTrigger>
          <TabsTrigger value="shop" className="gap-2">
            <Store className="w-4 h-4" />
            Shops ({rentals.filter(r => r.type === "shop").length})
          </TabsTrigger>
          <TabsTrigger value="home" className="gap-2">
            <Home className="w-4 h-4" />
            Homes ({rentals.filter(r => r.type === "home").length})
          </TabsTrigger>
          <TabsTrigger value="other" className="gap-2">
            <Building2 className="w-4 h-4" />
            Other ({rentals.filter(r => r.type === "other").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredRentals.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={activeTab === "all" ? "No properties yet" : `No ${activeTab} rentals`}
              description="Add your first property to start tracking rental income"
              action={
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredRentals.map((rental, index) => {
                  const config = typeConfig[rental.type];
                  const Icon = config.icon;
                  const status = statusConfig[rental.status];
                  
                  return (
                    <motion.div
                      key={rental.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass-hover group cursor-pointer h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg}`}
                              >
                                <Icon className="w-6 h-6" style={{ color: config.color }} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{rental.name}</h3>
                                <Badge className={status.color} variant="secondary">
                                  {status.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRental(rental);
                                  setShowAddDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRentalToDelete(rental.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {rental.address && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{rental.address}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between py-3 border-t border-b border-border/50 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Monthly Rent</p>
                              <p className="text-lg font-bold text-foreground">
                                {formatCurrency(rental.monthly_rent)}
                              </p>
                            </div>
                            {rental.rent_due_day && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Due Date</p>
                                <p className="text-sm font-medium text-foreground">
                                  Day {rental.rent_due_day}
                                </p>
                              </div>
                            )}
                          </div>

                          {rental.tenant_name && rental.status === "active" && (
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{rental.tenant_name}</span>
                              </div>
                              {rental.tenant_phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">{rental.tenant_phone}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {rental.lease_end_date && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>Lease ends: {new Date(rental.lease_end_date).toLocaleDateString()}</span>
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRental(rental);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Record Payment
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddRentalDialog 
        open={showAddDialog} 
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setSelectedRental(null);
        }}
        rental={selectedRental}
      />
      
      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        rental={selectedRental}
        rentals={rentals}
      />

      <RecordExpenseDialog
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        rentals={rentals}
      />

      <AlertDialog open={!!rentalToDelete} onOpenChange={() => setRentalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this property and all associated payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

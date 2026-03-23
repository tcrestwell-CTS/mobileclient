import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SupplierManagement } from "@/components/suppliers/SupplierManagement";

export default function Suppliers() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage supplier commission rules and vendor relationships</p>
        </div>

        {/* Supplier Management */}
        <SupplierManagement />
      </div>
    </DashboardLayout>
  );
}

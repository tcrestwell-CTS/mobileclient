import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LoanApplicationsManager from "@/components/LoanApplicationsManager";

export default function LoanApplications() {
  return (
    <DashboardLayout>
      <LoanApplicationsManager />
    </DashboardLayout>
  );
}

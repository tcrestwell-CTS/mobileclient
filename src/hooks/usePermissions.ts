import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";

export interface Permissions {
  isAdmin: boolean;
  isOfficeAdmin: boolean;
  canApproveBookings: boolean;
  canEditSettings: boolean;
  canViewFinancials: boolean;
  canManageTeam: boolean;
  canViewTeam: boolean;
  isLoading: boolean;
}

export function usePermissions(): Permissions {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: isOfficeAdmin, isLoading: officeAdminLoading } = useIsOfficeAdmin();

  const isLoading = adminLoading || officeAdminLoading;

  return {
    isAdmin: !!isAdmin,
    isOfficeAdmin: !!isOfficeAdmin,
    canApproveBookings: !!isAdmin,
    canEditSettings: !!isAdmin,
    canViewFinancials: !!isAdmin || !!isOfficeAdmin,
    canManageTeam: !!isAdmin,
    canViewTeam: !!isAdmin || !!isOfficeAdmin,
    isLoading,
  };
}

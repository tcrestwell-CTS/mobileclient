import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// NOTE: Portal data hooks support DUAL auth:
// 1. Supabase Auth JWT (persistent accounts) — sent via Authorization header
// 2. Legacy portal token — sent via x-portal-token header
// The edge function accepts both.

function getLegacyToken(): string | null {
  try {
    const stored = localStorage.getItem("portal_session");
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  // Prefer Supabase Auth JWT
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["authorization"] = `Bearer ${session.access_token}`;
    return headers;
  }

  // Fall back to legacy portal token
  const legacyToken = getLegacyToken();
  if (legacyToken) {
    headers["x-portal-token"] = legacyToken;
  }

  return headers;
}

function hasAnyAuth(): boolean {
  // Quick synchronous check — real validation happens in the fetch
  try {
    const stored = localStorage.getItem("portal_session");
    if (stored) return true;
  } catch {}
  // Can't synchronously check Supabase session, so optimistically return true
  // and let the fetch handle auth errors
  return true;
}

async function portalFetch(resource: string, params?: Record<string, string>) {
  const headers = await getAuthHeaders();
  if (!headers["authorization"] && !headers["x-portal-token"]) {
    throw new Error("Not authenticated");
  }

  const searchParams = new URLSearchParams({ resource, ...params });
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-data?${searchParams.toString()}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

async function portalPost(resource: string, body: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  if (!headers["authorization"] && !headers["x-portal-token"]) {
    throw new Error("Not authenticated");
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-data?resource=${resource}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

export function usePortalDashboard() {
  return useQuery({
    queryKey: ["portal", "dashboard"],
    queryFn: () => portalFetch("dashboard"),
    enabled: hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalTrips() {
  return useQuery({
    queryKey: ["portal", "trips"],
    queryFn: () => portalFetch("trips"),
    enabled: hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalTripDetail(tripId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "trip-detail", tripId],
    queryFn: () => portalFetch("trip-detail", { tripId: tripId! }),
    enabled: !!tripId && hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: ["portal", "invoices"],
    queryFn: () => portalFetch("invoices"),
    enabled: hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalPayments() {
  return useQuery({
    queryKey: ["portal", "payments"],
    queryFn: () => portalFetch("payments"),
    enabled: hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalInvoiceDetail(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "invoice-detail", invoiceId],
    queryFn: () => portalFetch("invoice-detail", { invoiceId: invoiceId! }),
    enabled: !!invoiceId && hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalMessages() {
  return useQuery({
    queryKey: ["portal", "messages"],
    queryFn: () => portalFetch("messages"),
    enabled: hasAnyAuth(),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useSendPortalMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => portalPost("messages", { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "dashboard"] });
    },
  });
}

export function useApproveItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, itineraryId }: { tripId: string; itineraryId: string }) =>
      portalPost("approve-itinerary", { tripId, itineraryId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal", "trip-detail", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["portal", "dashboard"] });
    },
  });
}

export function usePortalCCAuthorizations(tripId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "cc-authorizations", tripId],
    queryFn: () => portalFetch("cc-authorizations", { tripId: tripId! }),
    enabled: !!tripId && hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalDocChecklist(tripId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "doc-checklist", tripId],
    queryFn: () => portalFetch("doc-checklist", { tripId: tripId! }),
    enabled: !!tripId && hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function usePortalOptionSelections(tripId: string | undefined) {
  return useQuery({
    queryKey: ["portal", "option-selections", tripId],
    queryFn: () => portalFetch("option-selections", { tripId: tripId! }),
    enabled: !!tripId && hasAnyAuth(),
    staleTime: 30_000,
  });
}

export function useSelectOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, optionBlockId, selectedItemId }: {
      tripId: string;
      optionBlockId: string;
      selectedItemId: string;
    }) => portalPost("select-option", { tripId, optionBlockId, selectedItemId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal", "option-selections", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["portal", "trip-detail", variables.tripId] });
    },
  });
}

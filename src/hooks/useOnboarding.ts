import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnboardingProgress {
  id: string;
  user_id: string;
  profile_completed: boolean;
  first_client_added: boolean;
  first_trip_created: boolean;
  first_booking_added: boolean;
  branding_configured: boolean;
  training_started: boolean;
  onboarding_completed_at: string | null;
}

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ["onboarding-progress", user?.id],
    queryFn: async () => {
      // Get or create progress record
      let { data, error } = await supabase
        .from("agent_onboarding_progress")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newProgress, error: insertError } = await supabase
          .from("agent_onboarding_progress")
          .insert({ user_id: user!.id })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newProgress;
      }

      // Auto-detect completed steps from real data
      const [profileRes, clientRes, tripRes, bookingRes, brandingRes, trainingRes] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", user!.id).maybeSingle(),
          supabase.from("clients").select("id").eq("user_id", user!.id).limit(1),
          supabase.from("trips").select("id").eq("user_id", user!.id).limit(1),
          supabase.from("bookings").select("id").eq("user_id", user!.id).limit(1),
          supabase.from("branding_settings").select("logo_url, agency_name").eq("user_id", user!.id).maybeSingle(),
          supabase.from("agent_training_progress").select("id").eq("user_id", user!.id).limit(1),
        ]);

      const detected = {
        profile_completed: !!(profileRes.data?.full_name),
        first_client_added: !!(clientRes.data && clientRes.data.length > 0),
        first_trip_created: !!(tripRes.data && tripRes.data.length > 0),
        first_booking_added: !!(bookingRes.data && bookingRes.data.length > 0),
        branding_configured: !!(brandingRes.data?.logo_url || brandingRes.data?.agency_name),
        training_started: !!(trainingRes.data && trainingRes.data.length > 0),
      };

      // Check if any flags need updating
      const updates: Partial<OnboardingProgress> = {};
      let needsUpdate = false;
      for (const key of Object.keys(detected) as (keyof typeof detected)[]) {
        if (detected[key] && !data[key]) {
          (updates as any)[key] = true;
          needsUpdate = true;
        }
      }

      // Check if all steps are now complete and mark onboarding done
      const allComplete = Object.keys(detected).every(
        (k) => detected[k as keyof typeof detected] || data[k as keyof typeof detected]
      );
      if (allComplete && !data.onboarding_completed_at) {
        updates.onboarding_completed_at = new Date().toISOString();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await supabase
          .from("agent_onboarding_progress")
          .update(updates)
          .eq("user_id", user!.id);

        return { ...data, ...updates } as OnboardingProgress;
      }

      return data as OnboardingProgress;
    },
    enabled: !!user,
  });

  const updateStep = useMutation({
    mutationFn: async (step: Partial<OnboardingProgress>) => {
      const { error } = await supabase
        .from("agent_onboarding_progress")
        .update(step)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
    },
  });

  const completedSteps = progress
    ? [
        progress.profile_completed,
        progress.first_client_added,
        progress.first_trip_created,
        progress.first_booking_added,
        progress.branding_configured,
        progress.training_started,
      ].filter(Boolean).length
    : 0;

  const totalSteps = 6;
  const isComplete = progress?.onboarding_completed_at !== null;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return {
    progress,
    isLoading,
    updateStep,
    completedSteps,
    totalSteps,
    isComplete,
    progressPercent,
  };
}

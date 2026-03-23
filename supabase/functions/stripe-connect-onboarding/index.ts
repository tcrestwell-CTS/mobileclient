import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * stripe-connect-onboarding
 *
 * Manages Stripe Connect onboarding for agents:
 *   action=create   → Create a connected account + save mapping
 *   action=status   → Check onboarding & capability status
 *   action=fund     → Transfer funds from platform to connected account Issuing balance
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Authenticate the agent
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Not authenticated");

    const userId = authData.user.id;
    const userEmail = authData.user.email;

    // Service role client for DB writes
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── CREATE CONNECTED ACCOUNT ─────────────────────────────────────
    if (action === "create") {
      // Check if already exists
      const { data: existing } = await adminClient
        .from("stripe_connected_accounts")
        .select("id, stripe_account_id, onboarding_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            alreadyExists: true,
            stripeAccountId: existing.stripe_account_id,
            onboardingStatus: existing.onboarding_status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }

      // Get agent profile for business details
      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name, agency_name, phone")
        .eq("user_id", userId)
        .maybeSingle();

      const body = req.method === "POST" ? await req.json() : {};
      const {
        business_name,
        business_type = "company",
        tax_id,
        address_line1,
        address_city,
        address_state,
        address_postal_code,
        address_country = "US",
        business_url,
        mcc = "4722", // Travel agencies
        representative_first_name,
        representative_last_name,
        representative_dob_day,
        representative_dob_month,
        representative_dob_year,
        representative_ssn_last_4,
        representative_address_line1,
        representative_address_city,
        representative_address_state,
        representative_address_postal_code,
        representative_address_country = "US",
        tos_ip,
      } = body;

      const companyName = business_name || profile?.agency_name || "Travel Agency";

      // Create Custom connected account with card_issuing + transfers capabilities
      const accountParams: any = {
        country: address_country,
        type: "custom",
        business_type,
        capabilities: {
          transfers: { requested: true },
          card_issuing: { requested: true },
        },
        business_profile: {
          mcc,
          url: business_url || undefined,
          name: companyName,
        },
        controller: {
          stripe_dashboard: { type: "none" },
          fees: { payer: "application" },
          losses: { payments: "application" },
          requirement_collection: "application",
        },
      };

      // Add company details if provided
      if (business_type === "company") {
        accountParams.company = {
          name: companyName,
          phone: profile?.phone || undefined,
          ...(tax_id && { tax_id }),
          ...(address_line1 && {
            address: {
              line1: address_line1,
              city: address_city,
              state: address_state,
              postal_code: address_postal_code,
              country: address_country,
            },
          }),
        };
      } else if (business_type === "individual") {
        const nameParts = (profile?.full_name || "").split(" ");
        accountParams.individual = {
          first_name: representative_first_name || nameParts[0] || "Agent",
          last_name: representative_last_name || nameParts.slice(1).join(" ") || "User",
          email: userEmail,
          ...(representative_ssn_last_4 && { ssn_last_4: representative_ssn_last_4 }),
          ...(representative_dob_day && {
            dob: {
              day: representative_dob_day,
              month: representative_dob_month,
              year: representative_dob_year,
            },
          }),
          ...(representative_address_line1 && {
            address: {
              line1: representative_address_line1,
              city: representative_address_city,
              state: representative_address_state,
              postal_code: representative_address_postal_code,
              country: representative_address_country,
            },
          }),
        };
      }

      // Add TOS acceptance if IP provided
      if (tos_ip) {
        accountParams.settings = {
          card_issuing: {
            tos_acceptance: {
              ip: tos_ip,
              date: Math.floor(Date.now() / 1000),
            },
          },
        };
      }

      // Add representative for company
      if (business_type === "company" && representative_first_name) {
        accountParams.metadata = { pending_representative: "true" };
      }

      const account = await stripe.accounts.create(accountParams);

      // Create representative person for company accounts
      if (business_type === "company" && representative_first_name) {
        await stripe.accounts.createPerson(account.id, {
          first_name: representative_first_name,
          last_name: representative_last_name,
          email: userEmail || undefined,
          ...(representative_dob_day && {
            dob: {
              day: representative_dob_day,
              month: representative_dob_month,
              year: representative_dob_year,
            },
          }),
          ...(representative_ssn_last_4 && { ssn_last_4: representative_ssn_last_4 }),
          ...(representative_address_line1 && {
            address: {
              line1: representative_address_line1,
              city: representative_address_city,
              state: representative_address_state,
              postal_code: representative_address_postal_code,
              country: representative_address_country,
            },
          }),
          relationship: {
            representative: true,
            owner: true,
            percent_ownership: 100,
            title: "Owner",
          },
        });
      }

      // Save to DB
      await adminClient.from("stripe_connected_accounts").insert({
        user_id: userId,
        stripe_account_id: account.id,
        business_name: companyName,
        onboarding_status: "pending",
        card_issuing_status: (account.capabilities as any)?.card_issuing || "inactive",
        transfers_status: (account.capabilities as any)?.transfers || "inactive",
      });

      return new Response(
        JSON.stringify({
          success: true,
          stripeAccountId: account.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ── CHECK STATUS ─────────────────────────────────────────────────
    if (action === "status") {
      const { data: connectedAccount } = await adminClient
        .from("stripe_connected_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!connectedAccount) {
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }

      // Fetch latest from Stripe
      const account = await stripe.accounts.retrieve(connectedAccount.stripe_account_id);
      const cardIssuingStatus = (account.capabilities as any)?.card_issuing || "inactive";
      const transfersStatus = (account.capabilities as any)?.transfers || "inactive";
      
      // Get requirements
      const requirements = account.requirements?.currently_due || [];
      const pastDue = account.requirements?.past_due || [];
      const eventuallyDue = account.requirements?.eventually_due || [];

      // Determine onboarding status
      let onboardingStatus = "pending";
      if (cardIssuingStatus === "active" && transfersStatus === "active") {
        onboardingStatus = "complete";
      } else if (pastDue.length > 0) {
        onboardingStatus = "action_required";
      } else if (requirements.length > 0) {
        onboardingStatus = "in_progress";
      }

      // Update DB
      await adminClient
        .from("stripe_connected_accounts")
        .update({
          onboarding_status: onboardingStatus,
          card_issuing_status: cardIssuingStatus,
          transfers_status: transfersStatus,
          requirements_due: [...pastDue, ...requirements],
        })
        .eq("id", connectedAccount.id);

      return new Response(
        JSON.stringify({
          exists: true,
          stripeAccountId: connectedAccount.stripe_account_id,
          businessName: connectedAccount.business_name,
          onboardingStatus,
          cardIssuingStatus,
          transfersStatus,
          requirementsDue: requirements,
          requirementsPastDue: pastDue,
          requirementsEventuallyDue: eventuallyDue,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ── FUND CONNECTED ACCOUNT ISSUING BALANCE ───────────────────────
    if (action === "fund") {
      const { amount, paymentId } = await req.json();
      if (!amount || amount <= 0) throw new Error("Valid amount is required");

      const { data: connectedAccount } = await adminClient
        .from("stripe_connected_accounts")
        .select("stripe_account_id, card_issuing_status")
        .eq("user_id", userId)
        .single();

      if (!connectedAccount) throw new Error("No connected account found");
      if (connectedAccount.card_issuing_status !== "active") {
        throw new Error("Card issuing is not active on this account");
      }

      // Create a top-up / transfer to the connected account's Issuing balance
      // Using Stripe's funding instructions for Issuing
      const amountCents = Math.round(amount * 100);

      // Transfer from platform to connected account
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: "usd",
        destination: connectedAccount.stripe_account_id,
        metadata: {
          purpose: "issuing_balance_funding",
          payment_id: paymentId || "",
          funded_by: userId,
        },
      });

      // Top up the Issuing balance on the connected account
      await stripe.testHelpers.issuing.fund(
        connectedAccount.stripe_account_id,
        { amount: amountCents, currency: "usd" },
      );

      return new Response(
        JSON.stringify({
          success: true,
          transferId: transfer.id,
          amountFunded: amount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-connect-onboarding error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

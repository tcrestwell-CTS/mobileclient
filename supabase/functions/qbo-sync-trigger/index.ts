import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Automated QBO sync triggered by database webhooks (pg_net).
 * Called with service-role key — no user auth required.
 *
 * Supported trigger_type values:
 *   - booking_confirmed
 *   - commission_received
 *   - payout_approved
 *   - deposit_posted
 *   - supplier_paid
 *   - trip_completed
 */

const QBO_BASE = "https://quickbooks.api.intuit.com/v3/company";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { trigger_type, record, old_record } = body;
  if (!trigger_type || !record) {
    return new Response(JSON.stringify({ error: "Missing trigger_type or record" }), { status: 400 });
  }

  const userId = record.user_id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "No user_id on record" }), { status: 400 });
  }

  // ── Get active QBO connection for this user ──
  const { data: connection } = await supabase
    .from("qbo_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (!connection) {
    // No QBO connection — silently skip (not an error)
    return new Response(JSON.stringify({ skipped: true, reason: "No active QBO connection" }), { status: 200 });
  }

  // ── Auto-refresh token if near expiry ──
  const tokenExpiry = new Date(connection.token_expires_at);
  if (tokenExpiry <= new Date(Date.now() + 60_000)) {
    const QBO_CLIENT_ID = Deno.env.get("QBO_CLIENT_ID")!;
    const QBO_CLIENT_SECRET = Deno.env.get("QBO_CLIENT_SECRET")!;
    const basicAuth = btoa(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`);

    const tokenResp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token,
      }),
    });

    if (!tokenResp.ok) {
      await supabase.from("qbo_connections").update({ is_active: false }).eq("id", connection.id);
      await logSync(supabase, userId, trigger_type, "error", 0, "Token refresh failed during auto-sync");
      return new Response(JSON.stringify({ error: "Token refresh failed" }), { status: 500 });
    }

    const tokens = await tokenResp.json();
    connection.access_token = tokens.access_token;
    connection.refresh_token = tokens.refresh_token;
    await supabase.from("qbo_connections").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }).eq("id", connection.id);
  }

  const qboBase = `${QBO_BASE}/${connection.realm_id}`;
  const qboHeaders = {
    Authorization: `Bearer ${connection.access_token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  try {
    switch (trigger_type) {
      case "booking_confirmed":
        await handleBookingConfirmed(supabase, qboBase, qboHeaders, userId, record);
        break;
      case "commission_received":
        await handleCommissionReceived(supabase, qboBase, qboHeaders, userId, record);
        break;
      case "payout_approved":
        await handlePayoutApproved(supabase, qboBase, qboHeaders, userId, record);
        break;
      case "deposit_posted":
        await handleDepositPosted(supabase, qboBase, qboHeaders, userId, record);
        break;
      case "supplier_paid":
        await handleSupplierPaid(supabase, qboBase, qboHeaders, userId, record);
        break;
      case "trip_completed":
        await handleTripCompleted(supabase, qboBase, qboHeaders, userId, record);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown trigger_type: ${trigger_type}` }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, trigger_type }), { status: 200 });
  } catch (err: any) {
    console.error(`[qbo-sync-trigger] ${trigger_type} error:`, err);
    await logSync(supabase, userId, `auto-${trigger_type}`, "error", 0, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// HANDLERS
// ────────────────────────────────────────────────────────────────────────────

/** Booking confirmed → sync client as QBO Customer + create QBO Invoice */
async function handleBookingConfirmed(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, booking: any
) {
  // 1. Ensure client is synced as a QBO Customer
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", booking.client_id)
    .single();

  if (!client) throw new Error("Client not found for booking");

  const qboCustomerId = await ensureQBOCustomer(supabase, qboBase, qboHeaders, userId, client);

  // 2. Create an Invoice in QBO for this booking
  const invoiceData = {
    CustomerRef: { value: qboCustomerId },
    Line: [
      {
        Amount: booking.total_amount || 0,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" },
        },
        Description: `Booking ${booking.booking_reference} – ${booking.destination || "Travel"}`,
      },
    ],
    DocNumber: booking.booking_reference?.substring(0, 21),
    TxnDate: booking.created_at?.split("T")[0],
  };

  const resp = await fetch(`${qboBase}/invoice`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify(invoiceData),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`QBO Invoice creation failed: ${errBody}`);
  }

  await logSync(supabase, userId, "auto-booking-confirmed", "success", 1);
}

/** Commission received (status → paid) → create QBO Journal Entry */
async function handleCommissionReceived(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, commission: any
) {
  const journalEntry = {
    Line: [
      {
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: "1", name: "Checking" },
        },
        DetailType: "JournalEntryLineDetail",
        Amount: commission.amount,
        Description: `Commission received – Booking ${commission.booking_id}`,
      },
      {
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: "1", name: "Commission Income" },
        },
        DetailType: "JournalEntryLineDetail",
        Amount: commission.amount,
        Description: `Commission received – Booking ${commission.booking_id}`,
      },
    ],
    TxnDate: commission.paid_date || new Date().toISOString().split("T")[0],
  };

  const resp = await fetch(`${qboBase}/journalentry`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify(journalEntry),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`QBO JournalEntry failed: ${errBody}`);
  }

  await logSync(supabase, userId, "auto-commission-received", "success", 1);
}

/** Advisor payout approved → create QBO Expense (payout to advisor) */
async function handlePayoutApproved(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, booking: any
) {
  const payoutAmount = booking.commission_override_amount || booking.commission_revenue || 0;

  const expense = {
    PaymentType: "Check",
    TotalAmt: payoutAmount,
    Line: [
      {
        Amount: payoutAmount,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "1", name: "Commission Expense" },
        },
        Description: `Advisor payout – Booking ${booking.booking_reference}`,
      },
    ],
    TxnDate: booking.override_approved_at?.split("T")[0] || new Date().toISOString().split("T")[0],
  };

  const resp = await fetch(`${qboBase}/purchase`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify(expense),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`QBO Expense (payout) failed: ${errBody}`);
  }

  await logSync(supabase, userId, "auto-payout-approved", "success", 1);
}

/**
 * Deposit posted (trip_payment with type 'deposit' and status 'completed')
 * → Stripe Clearing Account flow:
 *   1. Payment received into Stripe Clearing account
 *   2. Stripe processing fees recorded as expense
 *   3. Net transfer from Stripe Clearing → Bank account
 *   Result: Clearing account zeroes out, fees tracked, bank reflects net deposit
 */
async function handleDepositPosted(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, payment: any
) {
  // Try to find the client via the trip
  let qboCustomerId = "1"; // fallback
  if (payment.trip_id) {
    const { data: trip } = await supabase
      .from("trips")
      .select("client_id")
      .eq("id", payment.trip_id)
      .single();

    if (trip?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", trip.client_id)
        .single();

      if (client) {
        qboCustomerId = await ensureQBOCustomer(supabase, qboBase, qboHeaders, userId, client);
      }
    }
  }

  // Auto-provision required QBO accounts
  const stripeClearingId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Clearing", "Other Current Asset", "OtherCurrentAsset");
  const stripeFeesId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Processing Fees", "Expense", "Expense");

  const grossAmount = payment.amount || 0;
  const stripeFeeRate = 0.029;
  const stripeFixedFee = 0.30;
  const stripeFee = Math.round((grossAmount * stripeFeeRate + stripeFixedFee) * 100) / 100;
  const netAmount = Math.round((grossAmount - stripeFee) * 100) / 100;
  const txnDate = payment.payment_date || new Date().toISOString().split("T")[0];
  const memo = `Stripe/Affirm deposit – ${payment.details || payment.notes || "Trip payment"}`;

  // ── Step 1: Gross → Stripe Clearing ──
  const step1 = {
    TxnDate: txnDate,
    PrivateNote: `${memo} – Gross payment received`,
    Line: [
      {
        Amount: grossAmount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: stripeClearingId, name: "Stripe Clearing" },
        },
        Description: `Gross payment received – ${payment.details || "Deposit"}`,
      },
      {
        Amount: grossAmount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { name: "Accounts Receivable (A/R)" },
          EntityRef: { value: qboCustomerId, type: "Customer" },
        },
        Description: `Gross payment received – ${payment.details || "Deposit"}`,
      },
    ],
  };

  const resp1 = await fetch(`${qboBase}/journalentry`, {
    method: "POST", headers: qboHeaders, body: JSON.stringify(step1),
  });
  if (!resp1.ok) {
    const err = await resp1.text();
    throw new Error(`Stripe Clearing step 1 failed: ${err}`);
  }

  // ── Step 2: Fees ──
  const step2 = {
    TxnDate: txnDate,
    PrivateNote: `${memo} – Processing fees`,
    Line: [
      {
        Amount: stripeFee,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: stripeFeesId, name: "Stripe Processing Fees" },
        },
        Description: `Stripe/Affirm processing fee`,
      },
      {
        Amount: stripeFee,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: stripeClearingId, name: "Stripe Clearing" },
        },
        Description: `Stripe/Affirm processing fee`,
      },
    ],
  };

  const resp2 = await fetch(`${qboBase}/journalentry`, {
    method: "POST", headers: qboHeaders, body: JSON.stringify(step2),
  });
  if (!resp2.ok) {
    const err = await resp2.text();
    throw new Error(`Stripe Clearing step 2 (fees) failed: ${err}`);
  }

  // ── Step 3: Net → Bank ──
  const step3 = {
    TxnDate: txnDate,
    PrivateNote: `${memo} – Net payout to bank`,
    Line: [
      {
        Amount: netAmount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { name: "Checking" },
        },
        Description: `Net Stripe payout to bank`,
      },
      {
        Amount: netAmount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: stripeClearingId, name: "Stripe Clearing" },
        },
        Description: `Net Stripe payout to bank`,
      },
    ],
  };

  const resp3 = await fetch(`${qboBase}/journalentry`, {
    method: "POST", headers: qboHeaders, body: JSON.stringify(step3),
  });
  if (!resp3.ok) {
    const err = await resp3.text();
    throw new Error(`Stripe Clearing step 3 (net transfer) failed: ${err}`);
  }

  await logSync(supabase, userId, "auto-deposit-posted", "success", 3, undefined, {
    gross: grossAmount, stripe_fee: stripeFee, net: netAmount,
    accounts_provisioned: { stripe_clearing: stripeClearingId, stripe_fees: stripeFeesId },
  });
}

/**
 * Supplier paid (virtual card transaction completed)
 * → Debit "Supplier Expense", Credit "Stripe Clearing"
 */
async function handleSupplierPaid(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, record: any
) {
  const supplierExpenseId = await ensureQBOAccount(qboBase, qboHeaders, "Supplier Expense", "Expense", "Expense");
  const stripeClearingId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Clearing", "Other Current Asset", "OtherCurrentAsset");

  const amount = record.amount || 0;
  const txnDate = record.payment_date || new Date().toISOString().split("T")[0];
  const memo = `Supplier payment via virtual card – ${record.details || record.notes || "Trip payment"}`;

  const journalEntry = {
    TxnDate: txnDate,
    PrivateNote: memo,
    Line: [
      {
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: supplierExpenseId, name: "Supplier Expense" },
        },
        Description: memo,
      },
      {
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: stripeClearingId, name: "Stripe Clearing" },
        },
        Description: memo,
      },
    ],
  };

  const resp = await fetch(`${qboBase}/journalentry`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify(journalEntry),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`QBO Supplier Paid journal entry failed: ${errBody}`);
  }

  await logSync(supabase, userId, "auto-supplier-paid", "success", 1, undefined, {
    amount,
    trip_payment_id: record.id,
    accounts: { supplier_expense: supplierExpenseId, stripe_clearing: stripeClearingId },
  });
}

/**
 * Trip completed (revenue recognition)
 * → Debit "Client Deposit" (liability), Credit "Commission Revenue"
 */
async function handleTripCompleted(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, trip: any
) {
  const clientDepositId = await ensureQBOAccount(qboBase, qboHeaders, "Client Deposit", "Other Current Liability", "OtherCurrentLiability");
  const commissionRevenueId = await ensureQBOAccount(qboBase, qboHeaders, "Commission Revenue", "Income", "ServiceFeeIncome");

  const amount = trip.total_commission_revenue || 0;
  const txnDate = new Date().toISOString().split("T")[0];
  const memo = `Revenue recognition – Trip "${trip.trip_name}" completed`;

  const journalEntry = {
    TxnDate: txnDate,
    PrivateNote: memo,
    Line: [
      {
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: clientDepositId, name: "Client Deposit" },
        },
        Description: memo,
      },
      {
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: commissionRevenueId, name: "Commission Revenue" },
        },
        Description: memo,
      },
    ],
  };

  const resp = await fetch(`${qboBase}/journalentry`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify(journalEntry),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`QBO Trip Completed journal entry failed: ${errBody}`);
  }

  await logSync(supabase, userId, "auto-trip-completed", "success", 1, undefined, {
    amount,
    trip_id: trip.id,
    trip_name: trip.trip_name,
    accounts: { client_deposit: clientDepositId, commission_revenue: commissionRevenueId },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

// In-memory cache for account IDs within a single function invocation
const _accountCache = new Map<string, string>();

/**
 * Ensure a QBO Account exists by name. Creates it if missing.
 * Returns the QBO Account Id.
 *
 * @param accountType - QBO AccountType (e.g. "Other Current Asset", "Expense", "Bank")
 * @param accountSubType - QBO AccountSubType (e.g. "OtherCurrentAsset", "Expense")
 */
async function ensureQBOAccount(
  qboBase: string, qboHeaders: any,
  accountName: string, accountType: string, accountSubType: string
): Promise<string> {
  // Check cache first
  if (_accountCache.has(accountName)) {
    return _accountCache.get(accountName)!;
  }

  // Query QBO for existing account
  const nameEscaped = accountName.replace(/'/g, "\\'");
  const searchResp = await fetch(
    `${qboBase}/query?query=${encodeURIComponent(`SELECT * FROM Account WHERE Name = '${nameEscaped}'`)}`,
    { headers: qboHeaders }
  );

  if (searchResp.ok) {
    const data = await searchResp.json();
    const existing = data?.QueryResponse?.Account?.[0];
    if (existing) {
      _accountCache.set(accountName, existing.Id);
      return existing.Id;
    }
  }

  // Create the account
  const createResp = await fetch(`${qboBase}/account`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify({
      Name: accountName,
      AccountType: accountType,
      AccountSubType: accountSubType,
    }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`Failed to create QBO Account "${accountName}": ${errText}`);
  }

  const result = await createResp.json();
  const id = result.Account.Id;
  _accountCache.set(accountName, id);
  console.log(`[QBO] Auto-provisioned account "${accountName}" (ID: ${id})`);
  return id;
}

/** Ensure a client exists as a QBO Customer; return QBO customer ID */
async function ensureQBOCustomer(
  supabase: any, qboBase: string, qboHeaders: any, userId: string, client: any
): Promise<string> {
  // Check existing mapping
  const { data: mapping } = await supabase
    .from("qbo_client_mappings")
    .select("qbo_customer_id")
    .eq("user_id", userId)
    .eq("client_id", client.id)
    .single();

  if (mapping) return mapping.qbo_customer_id;

  // Check QBO by DisplayName to avoid duplicates
  const displayName = client.name || `${client.first_name || ""} ${client.last_name || ""}`.trim();
  const queryResp = await fetch(
    `${qboBase}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`)}`,
    { headers: qboHeaders }
  );

  if (queryResp.ok) {
    const queryResult = await queryResp.json();
    const existing = queryResult?.QueryResponse?.Customer?.[0];
    if (existing) {
      await supabase.from("qbo_client_mappings").insert({
        user_id: userId,
        client_id: client.id,
        qbo_customer_id: existing.Id,
      });
      return existing.Id;
    }
  }

  // Create new customer
  const customerData: any = {
    DisplayName: displayName.substring(0, 100),
    GivenName: (client.first_name || displayName.split(" ")[0] || "").substring(0, 25),
    FamilyName: (client.last_name || "").substring(0, 25),
  };
  if (client.email) customerData.PrimaryEmailAddr = { Address: client.email };
  if (client.phone) customerData.PrimaryPhone = { FreeFormNumber: client.phone };

  const createResp = await fetch(`${qboBase}/customer`, {
    method: "POST",
    headers: qboHeaders,
    body: JSON.stringify(customerData),
  });

  if (!createResp.ok) {
    const errBody = await createResp.text();
    throw new Error(`Failed to create QBO Customer: ${errBody}`);
  }

  const created = await createResp.json();
  const qboId = created.Customer.Id;

  await supabase.from("qbo_client_mappings").insert({
    user_id: userId,
    client_id: client.id,
    qbo_customer_id: qboId,
  });

  return qboId;
}

async function logSync(
  supabase: any, userId: string, syncType: string, status: string, recordsProcessed: number, errorMessage?: string, details?: any
) {
  await supabase.from("qbo_sync_logs").insert({
    user_id: userId,
    sync_type: syncType,
    direction: "push",
    status,
    records_processed: recordsProcessed,
    error_message: errorMessage || null,
    details: details || null,
  });
}

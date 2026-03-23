import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QBO_BASE = "https://quickbooks.api.intuit.com/v3/company";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Authenticate caller via getClaims ──────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized – invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;

  // ── Get QBO connection ─────────────────────────────────────────────
  const { data: connection, error: connError } = await supabaseAdmin
    .from("qbo_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (connError || !connection) {
    return new Response(
      JSON.stringify({ error: "No active QBO connection. Please connect first." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Auto-refresh token if expired ──────────────────────────────────
  const tokenExpiry = new Date(connection.token_expires_at);
  if (tokenExpiry <= new Date(Date.now() + 60000)) {
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
      await supabaseAdmin.from("qbo_connections").update({ is_active: false }).eq("id", connection.id);
      return new Response(
        JSON.stringify({ error: "QBO token expired. Please reconnect." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens = await tokenResp.json();
    connection.access_token = tokens.access_token;
    connection.refresh_token = tokens.refresh_token;
    await supabaseAdmin.from("qbo_connections").update({
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

  const syncUrl = new URL(req.url);
  const urlPath = syncUrl.searchParams.get("action") || syncUrl.pathname.split("/").filter(Boolean).pop();

  try {
    // ── POST ?action=sync-clients ────────────────────────────────────
    if (urlPath === "sync-clients" && req.method === "POST") {
      const { client_ids } = await req.json();

      let query = supabaseAdmin.from("clients").select("*").eq("user_id", userId);
      if (client_ids?.length) {
        query = query.in("id", client_ids);
      }
      const { data: clients, error: clientsError } = await query;
      if (clientsError) throw clientsError;

      const { data: mappings } = await supabaseAdmin
        .from("qbo_client_mappings")
        .select("client_id, qbo_customer_id")
        .eq("user_id", userId);
      const mappingMap = new Map((mappings || []).map((m: any) => [m.client_id, m.qbo_customer_id]));

      let created = 0, updated = 0, errors = 0;

      for (const client of clients || []) {
        try {
          const displayName = client.name || `${client.first_name || ""} ${client.last_name || ""}`.trim();
          const customerData: any = {
            DisplayName: displayName.substring(0, 100),
            GivenName: (client.first_name || displayName.split(" ")[0] || "").substring(0, 25),
            FamilyName: (client.last_name || displayName.split(" ").slice(1).join(" ") || "").substring(0, 25),
          };
          if (client.email) customerData.PrimaryEmailAddr = { Address: client.email.substring(0, 100) };
          if (client.phone) customerData.PrimaryPhone = { FreeFormNumber: client.phone.substring(0, 30) };

          const existingQboId = mappingMap.get(client.id);

          if (existingQboId) {
            const getResp = await fetch(`${qboBase}/customer/${existingQboId}`, { headers: qboHeaders });
            if (getResp.ok) {
              const existing = await getResp.json();
              customerData.Id = existingQboId;
              customerData.SyncToken = existing.Customer.SyncToken;
              const updateResp = await fetch(`${qboBase}/customer`, {
                method: "POST",
                headers: qboHeaders,
                body: JSON.stringify(customerData),
              });
              if (updateResp.ok) updated++;
              else errors++;
            }
          } else {
            // First, check if a customer with this DisplayName already exists in QBO
            const displayNameEscaped = customerData.DisplayName.replace(/'/g, "\\'");
            const searchResp = await fetch(
              `${qboBase}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${displayNameEscaped}'`)}`,
              { headers: qboHeaders }
            );
            let existingCustomer: any = null;
            if (searchResp.ok) {
              const searchData = await searchResp.json();
              const matches = searchData.QueryResponse?.Customer || [];
              if (matches.length > 0) {
                existingCustomer = matches[0];
              }
            }

            if (existingCustomer) {
              // Customer already exists in QBO — just create the mapping
              await supabaseAdmin.from("qbo_client_mappings").insert({
                user_id: userId,
                client_id: client.id,
                qbo_customer_id: existingCustomer.Id,
              });
              created++;
            } else {
              const createResp = await fetch(`${qboBase}/customer`, {
                method: "POST",
                headers: qboHeaders,
                body: JSON.stringify(customerData),
              });
              if (createResp.ok) {
                const result = await createResp.json();
                await supabaseAdmin.from("qbo_client_mappings").insert({
                  user_id: userId,
                  client_id: client.id,
                  qbo_customer_id: result.Customer.Id,
                });
                created++;
              } else {
                const errText = await createResp.text();
                console.error(`Failed to create QBO customer for ${client.id}:`, errText);
                errors++;
              }
            }
          }
        } catch (e) {
          console.error(`Error syncing client ${client.id}:`, e);
          errors++;
        }
      }

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId,
        sync_type: "clients",
        direction: "push",
        status: errors > 0 ? "partial" : "success",
        records_processed: created + updated,
        details: { created, updated, errors },
      });

      return new Response(
        JSON.stringify({ success: true, created, updated, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=sync-invoice ────────────────────────────────────
    if (urlPath === "sync-invoice" && req.method === "POST") {
      const { invoice_id } = await req.json();
      if (!invoice_id) {
        return new Response(JSON.stringify({ error: "invoice_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invoice, error: invError } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("user_id", userId)
        .single();
      if (invError || !invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let qboCustomerId: string | null = null;
      if (invoice.client_id) {
        const { data: mapping } = await supabaseAdmin
          .from("qbo_client_mappings")
          .select("qbo_customer_id")
          .eq("user_id", userId)
          .eq("client_id", invoice.client_id)
          .single();
        qboCustomerId = mapping?.qbo_customer_id || null;
      }

      if (!qboCustomerId && invoice.client_id) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("*")
          .eq("id", invoice.client_id)
          .single();

        if (client) {
          const displayName = client.name || `${client.first_name || ""} ${client.last_name || ""}`.trim();
          const displayNameEscaped = displayName.replace(/'/g, "\\'");
          
          // Check if customer already exists in QBO
          const searchResp = await fetch(
            `${qboBase}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${displayNameEscaped}'`)}`,
            { headers: qboHeaders }
          );
          let existingCustomer: any = null;
          if (searchResp.ok) {
            const searchData = await searchResp.json();
            const matches = searchData.QueryResponse?.Customer || [];
            if (matches.length > 0) existingCustomer = matches[0];
          }

          if (existingCustomer) {
            qboCustomerId = existingCustomer.Id;
            await supabaseAdmin.from("qbo_client_mappings").insert({
              user_id: userId,
              client_id: invoice.client_id,
              qbo_customer_id: qboCustomerId!,
            });
          } else {
            const createResp = await fetch(`${qboBase}/customer`, {
              method: "POST",
              headers: qboHeaders,
              body: JSON.stringify({
                DisplayName: displayName.substring(0, 100),
                GivenName: (client.first_name || displayName.split(" ")[0] || "").substring(0, 25),
                FamilyName: (client.last_name || "").substring(0, 25),
                ...(client.email ? { PrimaryEmailAddr: { Address: client.email.substring(0, 100) } } : {}),
              }),
            });
            if (createResp.ok) {
              const result = await createResp.json();
              qboCustomerId = result.Customer.Id;
              await supabaseAdmin.from("qbo_client_mappings").insert({
                user_id: userId,
                client_id: invoice.client_id,
                qbo_customer_id: qboCustomerId!,
              });
            }
          }
        }
      }

      const qboInvoice: any = {
        DocNumber: invoice.invoice_number?.substring(0, 21),
        TxnDate: invoice.invoice_date,
        Line: [
          {
            Amount: invoice.total_amount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: { value: "1", name: "Services" },
            },
            Description: invoice.trip_name || "Travel Services",
          },
        ],
      };

      if (qboCustomerId) {
        qboInvoice.CustomerRef = { value: qboCustomerId };
      }

      const createResp = await fetch(`${qboBase}/invoice`, {
        method: "POST",
        headers: qboHeaders,
        body: JSON.stringify(qboInvoice),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error("QBO invoice creation failed:", errText);
        await supabaseAdmin.from("qbo_sync_logs").insert({
          user_id: userId,
          sync_type: "invoice",
          direction: "push",
          status: "error",
          error_message: errText.substring(0, 500),
        });
        return new Response(
          JSON.stringify({ error: "Failed to create QBO invoice", details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await createResp.json();
      await supabaseAdmin.from("qbo_invoice_mappings").insert({
        user_id: userId,
        invoice_id: invoice.id,
        qbo_invoice_id: result.Invoice.Id,
      });

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId,
        sync_type: "invoice",
        direction: "push",
        status: "success",
        records_processed: 1,
      });

      return new Response(
        JSON.stringify({ success: true, qbo_invoice_id: result.Invoice.Id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET ?action=financial-summary ─────────────────────────────────
    if (urlPath === "financial-summary" && req.method === "GET") {
      const plResp = await fetch(
        `${qboBase}/reports/ProfitAndLoss?date_macro=This Month`,
        { headers: qboHeaders }
      );

      const bsResp = await fetch(
        `${qboBase}/reports/BalanceSheet`,
        { headers: qboHeaders }
      );

      const summary: any = { profit_and_loss: null, balance_sheet: null };

      if (plResp.ok) {
        const plData = await plResp.json();
        const rows = plData.Rows?.Row || [];
        const income = rows.find((r: any) => r.group === "Income");
        const expenses = rows.find((r: any) => r.group === "Expenses");
        summary.profit_and_loss = {
          period: plData.Header?.ReportName,
          total_income: parseFloat(income?.Summary?.ColData?.[1]?.value || "0"),
          total_expenses: parseFloat(expenses?.Summary?.ColData?.[1]?.value || "0"),
          net_income: parseFloat(
            rows.find((r: any) => r.group === "NetIncome")?.Summary?.ColData?.[1]?.value || "0"
          ),
        };
      }

      if (bsResp.ok) {
        const bsData = await bsResp.json();
        const rows = bsData.Rows?.Row || [];
        const assets = rows.find((r: any) => r.group === "TotalAssets" || r.Header?.ColData?.[0]?.value === "TOTAL ASSETS");
        summary.balance_sheet = {
          total_assets: parseFloat(assets?.Summary?.ColData?.[1]?.value || "0"),
        };
      }

      return new Response(JSON.stringify(summary), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST ?action=sync-payments ───────────────────────────────────
    if (urlPath === "sync-payments" && req.method === "POST") {
      const queryResp = await fetch(
        `${qboBase}/query?query=${encodeURIComponent("SELECT * FROM Payment WHERE MetaData.LastUpdatedTime > '2020-01-01' MAXRESULTS 100")}`,
        { headers: qboHeaders }
      );

      if (!queryResp.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to query QBO payments" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const queryData = await queryResp.json();
      const payments = queryData.QueryResponse?.Payment || [];

      const { data: invoiceMappings } = await supabaseAdmin
        .from("qbo_invoice_mappings")
        .select("invoice_id, qbo_invoice_id")
        .eq("user_id", userId);

      const qboToLocalMap = new Map(
        (invoiceMappings || []).map((m: any) => [m.qbo_invoice_id, m.invoice_id])
      );

      let matchedPayments = 0;
      for (const payment of payments) {
        const lines = payment.Line || [];
        for (const line of lines) {
          const linkedTxns = line.LinkedTxn || [];
          for (const txn of linkedTxns) {
            if (txn.TxnType === "Invoice") {
              const localInvoiceId = qboToLocalMap.get(txn.TxnId);
              if (localInvoiceId) {
                const paidAmount = parseFloat(payment.TotalAmt || "0");
                await supabaseAdmin
                  .from("invoices")
                  .update({
                    amount_paid: paidAmount,
                    amount_remaining: Math.max(0, paidAmount),
                    status: "paid",
                  })
                  .eq("id", localInvoiceId)
                  .eq("user_id", userId);
                matchedPayments++;
              }
            }
          }
        }
      }

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId,
        sync_type: "payments",
        direction: "pull",
        status: "success",
        records_processed: matchedPayments,
        details: { total_qbo_payments: payments.length, matched: matchedPayments },
      });

      return new Response(
        JSON.stringify({ success: true, total_payments: payments.length, matched: matchedPayments }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=create-vendor ──────────────────────────────────
    if (urlPath === "create-vendor" && req.method === "POST") {
      const { supplier_id } = await req.json();
      if (!supplier_id) {
        return new Response(JSON.stringify({ error: "supplier_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: supplier, error: supError } = await supabaseAdmin
        .from("suppliers")
        .select("*")
        .eq("id", supplier_id)
        .eq("user_id", userId)
        .single();
      if (supError || !supplier) {
        return new Response(JSON.stringify({ error: "Supplier not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const displayName = supplier.name.substring(0, 100);
      const displayNameEscaped = displayName.replace(/'/g, "\\'");

      // Check if vendor already exists in QBO
      const searchResp = await fetch(
        `${qboBase}/query?query=${encodeURIComponent(`SELECT * FROM Vendor WHERE DisplayName = '${displayNameEscaped}'`)}`,
        { headers: qboHeaders }
      );
      let existingVendor: any = null;
      if (searchResp.ok) {
        const searchData = await searchResp.json();
        const matches = searchData.QueryResponse?.Vendor || [];
        if (matches.length > 0) existingVendor = matches[0];
      }

      let qboVendorId: string;
      if (existingVendor) {
        qboVendorId = existingVendor.Id;
      } else {
        const vendorData: any = {
          DisplayName: displayName,
          CompanyName: displayName,
        };
        if (supplier.contact_email) vendorData.PrimaryEmailAddr = { Address: supplier.contact_email.substring(0, 100) };
        if (supplier.contact_phone) vendorData.PrimaryPhone = { FreeFormNumber: supplier.contact_phone.substring(0, 30) };
        if (supplier.website) vendorData.WebAddr = { URI: supplier.website.substring(0, 1000) };

        const createResp = await fetch(`${qboBase}/vendor`, {
          method: "POST", headers: qboHeaders, body: JSON.stringify(vendorData),
        });
        if (!createResp.ok) {
          const errText = await createResp.text();
          console.error("QBO vendor creation failed:", errText);
          await supabaseAdmin.from("qbo_sync_logs").insert({
            user_id: userId, sync_type: "vendor", direction: "push", status: "error",
            error_message: errText.substring(0, 500),
          });
          return new Response(
            JSON.stringify({ error: "Failed to create QBO vendor", details: errText }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const result = await createResp.json();
        qboVendorId = result.Vendor.Id;
      }

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId, sync_type: "vendor", direction: "push", status: "success", records_processed: 1,
        details: { supplier_id, qbo_vendor_id: qboVendorId, existed: !!existingVendor },
      });

      return new Response(
        JSON.stringify({ success: true, qbo_vendor_id: qboVendorId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=create-bill ────────────────────────────────────
    if (urlPath === "create-bill" && req.method === "POST") {
      const { vendor_ref, line_items, txn_date, due_date } = await req.json();
      if (!vendor_ref || !line_items?.length) {
        return new Response(JSON.stringify({ error: "vendor_ref and line_items required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const billData: any = {
        VendorRef: { value: vendor_ref },
        TxnDate: txn_date || new Date().toISOString().split("T")[0],
        Line: line_items.map((item: any) => ({
          Amount: item.amount,
          DetailType: "AccountBasedExpenseLineDetail",
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: item.account_ref || "1" },
          },
          Description: item.description || "Travel service",
        })),
      };
      if (due_date) billData.DueDate = due_date;

      const createResp = await fetch(`${qboBase}/bill`, {
        method: "POST", headers: qboHeaders, body: JSON.stringify(billData),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error("QBO bill creation failed:", errText);
        await supabaseAdmin.from("qbo_sync_logs").insert({
          user_id: userId, sync_type: "bill", direction: "push", status: "error",
          error_message: errText.substring(0, 500),
        });
        return new Response(
          JSON.stringify({ error: "Failed to create QBO bill", details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await createResp.json();
      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId, sync_type: "bill", direction: "push", status: "success", records_processed: 1,
        details: { qbo_bill_id: result.Bill.Id },
      });

      return new Response(
        JSON.stringify({ success: true, qbo_bill_id: result.Bill.Id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=create-journal-entry ────────────────────────────
    if (urlPath === "create-journal-entry" && req.method === "POST") {
      const { lines, txn_date, memo } = await req.json();
      if (!lines?.length) {
        return new Response(JSON.stringify({ error: "lines required (array of debit/credit entries)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const journalEntry: any = {
        TxnDate: txn_date || new Date().toISOString().split("T")[0],
        Line: lines.map((line: any) => ({
          Amount: line.amount,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: {
            PostingType: line.posting_type, // "Debit" or "Credit"
            AccountRef: { value: line.account_ref },
          },
          Description: line.description || "",
        })),
      };
      if (memo) journalEntry.PrivateNote = memo;

      const createResp = await fetch(`${qboBase}/journalentry`, {
        method: "POST", headers: qboHeaders, body: JSON.stringify(journalEntry),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error("QBO journal entry creation failed:", errText);
        await supabaseAdmin.from("qbo_sync_logs").insert({
          user_id: userId, sync_type: "journal_entry", direction: "push", status: "error",
          error_message: errText.substring(0, 500),
        });
        return new Response(
          JSON.stringify({ error: "Failed to create QBO journal entry", details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await createResp.json();
      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId, sync_type: "journal_entry", direction: "push", status: "success", records_processed: 1,
        details: { qbo_journal_entry_id: result.JournalEntry.Id },
      });

      return new Response(
        JSON.stringify({ success: true, qbo_journal_entry_id: result.JournalEntry.Id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=create-expense ─────────────────────────────────
    if (urlPath === "create-expense" && req.method === "POST") {
      const { account_ref, payment_type, line_items, txn_date, entity_ref, memo } = await req.json();
      if (!account_ref || !line_items?.length) {
        return new Response(JSON.stringify({ error: "account_ref and line_items required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const purchaseData: any = {
        AccountRef: { value: account_ref },
        PaymentType: payment_type || "Cash", // Cash, Check, CreditCard
        TxnDate: txn_date || new Date().toISOString().split("T")[0],
        Line: line_items.map((item: any) => ({
          Amount: item.amount,
          DetailType: "AccountBasedExpenseLineDetail",
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: item.expense_account_ref || "1" },
          },
          Description: item.description || "Expense",
        })),
      };
      if (entity_ref) purchaseData.EntityRef = { value: entity_ref.id, type: entity_ref.type || "Vendor" };
      if (memo) purchaseData.PrivateNote = memo;

      const createResp = await fetch(`${qboBase}/purchase`, {
        method: "POST", headers: qboHeaders, body: JSON.stringify(purchaseData),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error("QBO expense creation failed:", errText);
        await supabaseAdmin.from("qbo_sync_logs").insert({
          user_id: userId, sync_type: "expense", direction: "push", status: "error",
          error_message: errText.substring(0, 500),
        });
        return new Response(
          JSON.stringify({ error: "Failed to create QBO expense", details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await createResp.json();
      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId, sync_type: "expense", direction: "push", status: "success", records_processed: 1,
        details: { qbo_purchase_id: result.Purchase.Id },
      });

      return new Response(
        JSON.stringify({ success: true, qbo_purchase_id: result.Purchase.Id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=stripe-clearing-flow ──────────────────────────
    // Manual Stripe Clearing account reconciliation:
    // 1. Gross payment → Stripe Clearing
    // 2. Stripe fees deducted from Clearing
    // 3. Net payout from Clearing → Bank
    if (urlPath === "stripe-clearing-flow" && req.method === "POST") {
      const { gross_amount, stripe_fee, net_amount, customer_ref, txn_date, memo } = await req.json();
      if (!gross_amount || stripe_fee == null || !net_amount) {
        return new Response(JSON.stringify({ error: "gross_amount, stripe_fee, and net_amount required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Auto-provision required QBO accounts
      const stripeClearingId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Clearing", "Other Current Asset", "OtherCurrentAsset");
      const stripeFeesId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Processing Fees", "Expense", "Expense");

      const date = txn_date || new Date().toISOString().split("T")[0];
      const note = memo || "Stripe/Affirm deposit";
      const results: string[] = [];

      // Step 1: Gross → Stripe Clearing
      const step1 = {
        TxnDate: date,
        PrivateNote: `${note} – Gross received`,
        Line: [
          {
            Amount: gross_amount, DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: stripeClearingId, name: "Stripe Clearing" } },
            Description: `Gross payment received`,
          },
          {
            Amount: gross_amount, DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: {
              PostingType: "Credit",
              AccountRef: { name: "Accounts Receivable (A/R)" },
              ...(customer_ref ? { EntityRef: { value: customer_ref, type: "Customer" } } : {}),
            },
            Description: `Gross payment received`,
          },
        ],
      };
      const r1 = await fetch(`${qboBase}/journalentry`, { method: "POST", headers: qboHeaders, body: JSON.stringify(step1) });
      if (!r1.ok) {
        const err = await r1.text();
        throw new Error(`Stripe Clearing step 1 failed: ${err}`);
      }
      results.push((await r1.json()).JournalEntry.Id);

      // Step 2: Fees
      const step2 = {
        TxnDate: date,
        PrivateNote: `${note} – Processing fees`,
        Line: [
          {
            Amount: stripe_fee, DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: stripeFeesId, name: "Stripe Processing Fees" } },
            Description: `Stripe/Affirm processing fee`,
          },
          {
            Amount: stripe_fee, DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: stripeClearingId, name: "Stripe Clearing" } },
            Description: `Stripe/Affirm processing fee`,
          },
        ],
      };
      const r2 = await fetch(`${qboBase}/journalentry`, { method: "POST", headers: qboHeaders, body: JSON.stringify(step2) });
      if (!r2.ok) {
        const err = await r2.text();
        throw new Error(`Stripe Clearing step 2 failed: ${err}`);
      }
      results.push((await r2.json()).JournalEntry.Id);

      // Step 3: Net → Bank
      const step3 = {
        TxnDate: date,
        PrivateNote: `${note} – Net payout to bank`,
        Line: [
          {
            Amount: net_amount, DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { name: "Checking" } },
            Description: `Net Stripe payout to bank`,
          },
          {
            Amount: net_amount, DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: stripeClearingId, name: "Stripe Clearing" } },
            Description: `Net Stripe payout to bank`,
          },
        ],
      };
      const r3 = await fetch(`${qboBase}/journalentry`, { method: "POST", headers: qboHeaders, body: JSON.stringify(step3) });
      if (!r3.ok) {
        const err = await r3.text();
        throw new Error(`Stripe Clearing step 3 failed: ${err}`);
      }
      results.push((await r3.json()).JournalEntry.Id);

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId, sync_type: "stripe_clearing", direction: "push", status: "success",
        records_processed: 3,
        details: { gross_amount, stripe_fee, net_amount, journal_entry_ids: results,
          accounts_provisioned: { stripe_clearing: stripeClearingId, stripe_fees: stripeFeesId } },
      });

      return new Response(
        JSON.stringify({ success: true, journal_entry_ids: results, gross_amount, stripe_fee, net_amount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=sync-stripe-deposits ──────────────────────────
    // Batch-sync all completed Stripe deposits that haven't been pushed to QBO yet.
    // Looks for trip_payments where: payment_method = 'stripe', status = 'completed',
    // and no matching qbo_sync_log entry with sync_type = 'auto-deposit-posted'.
    if (urlPath === "sync-stripe-deposits" && req.method === "POST") {
      // Fetch all completed Stripe/payment-related deposits for this user
      // Broadened filter: match any completed payment that came through Stripe
      // (stripe_session_id set, or payment_method/payment_method_choice indicates stripe)
      const { data: allCompleted, error: depErr } = await supabaseAdmin
        .from("trip_payments")
        .select("*, trips(client_id, trip_name)")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (depErr) throw new Error(`Failed to fetch deposits: ${depErr.message}`);
      
      // Filter to Stripe-related payments (has stripe_session_id, or payment method is stripe)
      const deposits = (allCompleted || []).filter((p: any) =>
        p.stripe_session_id ||
        p.payment_method_choice === "stripe" ||
        p.payment_method === "stripe" ||
        p.payment_method === "credit_card" ||
        p.payment_type === "deposit"
      );

      if (depErr) throw new Error(`Failed to fetch deposits: ${depErr.message}`);
      if (!deposits || deposits.length === 0) {
        return new Response(
          JSON.stringify({ success: true, synced: 0, skipped: 0, message: "No completed Stripe deposits found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch already-synced deposit IDs from qbo_sync_logs
      const { data: existingLogs } = await supabaseAdmin
        .from("qbo_sync_logs")
        .select("details")
        .eq("user_id", userId)
        .eq("sync_type", "auto-deposit-posted")
        .eq("status", "success");

      const syncedIds = new Set<string>(
        (existingLogs || [])
          .map((l: any) => l.details?.payment_id)
          .filter(Boolean)
      );

      // Auto-provision accounts once
      const stripeClearingId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Clearing", "Other Current Asset", "OtherCurrentAsset");
      const stripeFeesId = await ensureQBOAccount(qboBase, qboHeaders, "Stripe Processing Fees", "Expense", "Expense");

      let synced = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const payment of deposits) {
        if (syncedIds.has(payment.id)) { skipped++; continue; }

        try {
          // Resolve client → QBO customer
          let qboCustomerId: string | undefined;
          const clientId = (payment as any).trips?.client_id;
          if (clientId) {
            const { data: client } = await supabaseAdmin.from("clients").select("*").eq("id", clientId).single();
            if (client) {
              const { data: mapping } = await supabaseAdmin
                .from("qbo_client_mappings").select("qbo_customer_id")
                .eq("user_id", userId).eq("client_id", client.id).single();
              qboCustomerId = mapping?.qbo_customer_id;
            }
          }

          const gross = payment.amount || 0;
          const fee = Math.round((gross * 0.029 + 0.30) * 100) / 100;
          const net = Math.round((gross - fee) * 100) / 100;
          const txnDate = payment.payment_date || new Date().toISOString().split("T")[0];
          const memo = `Stripe deposit – ${(payment as any).trips?.trip_name || payment.details || "Trip payment"}`;

          // Step 1: Gross → Stripe Clearing
          const s1 = await fetch(`${qboBase}/journalentry`, {
            method: "POST", headers: qboHeaders,
            body: JSON.stringify({
              TxnDate: txnDate, PrivateNote: `${memo} – Gross received`,
              Line: [
                { Amount: gross, DetailType: "JournalEntryLineDetail",
                  JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: stripeClearingId } },
                  Description: "Gross payment received" },
                { Amount: gross, DetailType: "JournalEntryLineDetail",
                  JournalEntryLineDetail: {
                    PostingType: "Credit", AccountRef: { name: "Accounts Receivable (A/R)" },
                    ...(qboCustomerId ? { EntityRef: { value: qboCustomerId, type: "Customer" } } : {}),
                  }, Description: "Gross payment received" },
              ],
            }),
          });
          if (!s1.ok) throw new Error(`Step 1 failed: ${await s1.text()}`);

          // Step 2: Fees
          const s2 = await fetch(`${qboBase}/journalentry`, {
            method: "POST", headers: qboHeaders,
            body: JSON.stringify({
              TxnDate: txnDate, PrivateNote: `${memo} – Processing fees`,
              Line: [
                { Amount: fee, DetailType: "JournalEntryLineDetail",
                  JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: stripeFeesId } },
                  Description: "Stripe processing fee" },
                { Amount: fee, DetailType: "JournalEntryLineDetail",
                  JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: stripeClearingId } },
                  Description: "Stripe processing fee" },
              ],
            }),
          });
          if (!s2.ok) throw new Error(`Step 2 failed: ${await s2.text()}`);

          // Step 3: Net → Bank
          const s3 = await fetch(`${qboBase}/journalentry`, {
            method: "POST", headers: qboHeaders,
            body: JSON.stringify({
              TxnDate: txnDate, PrivateNote: `${memo} – Net payout`,
              Line: [
                { Amount: net, DetailType: "JournalEntryLineDetail",
                  JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { name: "Checking" } },
                  Description: "Net Stripe payout to bank" },
                { Amount: net, DetailType: "JournalEntryLineDetail",
                  JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: stripeClearingId } },
                  Description: "Net Stripe payout to bank" },
              ],
            }),
          });
          if (!s3.ok) throw new Error(`Step 3 failed: ${await s3.text()}`);

          await supabaseAdmin.from("qbo_sync_logs").insert({
            user_id: userId, sync_type: "auto-deposit-posted", direction: "push", status: "success",
            records_processed: 3,
            details: { payment_id: payment.id, gross, stripe_fee: fee, net },
          });
          synced++;
        } catch (e: any) {
          errors.push(`Payment ${payment.id}: ${e.message}`);
          await supabaseAdmin.from("qbo_sync_logs").insert({
            user_id: userId, sync_type: "auto-deposit-posted", direction: "push", status: "error",
            records_processed: 0, error_message: e.message,
            details: { payment_id: payment.id },
          });
        }
      }

      return new Response(
        JSON.stringify({ success: errors.length === 0, synced, skipped, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET ?action=stripe-recon-report ────────────────────────────
    // Query QBO for Stripe Clearing account transactions to verify zero balance
    if (urlPath === "stripe-recon-report" && req.method === "GET") {
      // Find the Stripe Clearing account
      const clearingResp = await fetch(
        `${qboBase}/query?query=${encodeURIComponent("SELECT * FROM Account WHERE Name = 'Stripe Clearing'")}`,
        { headers: qboHeaders }
      );

      if (!clearingResp.ok) {
        throw new Error("Failed to query Stripe Clearing account");
      }

      const clearingData = await clearingResp.json();
      const clearingAccount = clearingData?.QueryResponse?.Account?.[0];

      if (!clearingAccount) {
        return new Response(
          JSON.stringify({
            success: true,
            account_exists: false,
            message: "Stripe Clearing account not found in QBO. It will be auto-created on first Stripe deposit.",
            entries: [],
            summary: { current_balance: 0, total_debits: 0, total_credits: 0, entry_count: 0 },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also find Stripe Processing Fees account
      const feesResp = await fetch(
        `${qboBase}/query?query=${encodeURIComponent("SELECT * FROM Account WHERE Name = 'Stripe Processing Fees'")}`,
        { headers: qboHeaders }
      );
      const feesData = feesResp.ok ? await feesResp.json() : null;
      const feesAccount = feesData?.QueryResponse?.Account?.[0];

      // Get the current balance of the Stripe Clearing account
      const currentBalance = parseFloat(clearingAccount.CurrentBalance || "0");
      const feesBalance = feesAccount ? parseFloat(feesAccount.CurrentBalance || "0") : null;

      // Query recent journal entries that reference Stripe Clearing
      const jeResp = await fetch(
        `${qboBase}/query?query=${encodeURIComponent(
          `SELECT * FROM JournalEntry WHERE MetaData.LastUpdatedTime > '2020-01-01' ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 200`
        )}`,
        { headers: qboHeaders }
      );

      const entries: any[] = [];
      if (jeResp.ok) {
        const jeData = await jeResp.json();
        const allEntries = jeData?.QueryResponse?.JournalEntry || [];

        for (const je of allEntries) {
          const lines = je.Line || [];
          const touchesClearing = lines.some((l: any) =>
            l.JournalEntryLineDetail?.AccountRef?.value === clearingAccount.Id ||
            l.JournalEntryLineDetail?.AccountRef?.name === "Stripe Clearing"
          );
          if (!touchesClearing) continue;

          let totalDebit = 0;
          let totalCredit = 0;
          const lineDetails: any[] = [];

          for (const line of lines) {
            const detail = line.JournalEntryLineDetail;
            if (!detail) continue;
            const amount = parseFloat(line.Amount || "0");
            const accountName = detail.AccountRef?.name || detail.AccountRef?.value || "Unknown";

            if (detail.PostingType === "Debit") totalDebit += amount;
            else totalCredit += amount;

            lineDetails.push({
              account: accountName,
              posting_type: detail.PostingType,
              amount,
              description: line.Description || "",
            });
          }

          entries.push({
            id: je.Id,
            txn_date: je.TxnDate,
            memo: je.PrivateNote || "",
            total_debit: totalDebit,
            total_credit: totalCredit,
            lines: lineDetails,
          });
        }
      }

      // Group by payout date for reconciliation
      const byDate: Record<string, { debits: number; credits: number; count: number; balanced: boolean }> = {};
      for (const entry of entries) {
        const date = entry.txn_date;
        if (!byDate[date]) byDate[date] = { debits: 0, credits: 0, count: 0, balanced: false };
        // Only count lines that touch Stripe Clearing
        for (const line of entry.lines) {
          if (line.account === "Stripe Clearing" || line.account === clearingAccount.Id) {
            if (line.posting_type === "Debit") byDate[date].debits += line.amount;
            else byDate[date].credits += line.amount;
          }
        }
        byDate[date].count++;
      }
      for (const date of Object.keys(byDate)) {
        byDate[date].balanced = Math.abs(byDate[date].debits - byDate[date].credits) < 0.01;
      }

      const totalDebits = entries.reduce((sum, e) => sum + e.total_debit, 0);
      const totalCredits = entries.reduce((sum, e) => sum + e.total_credit, 0);

      return new Response(
        JSON.stringify({
          success: true,
          account_exists: true,
          clearing_account: {
            id: clearingAccount.Id,
            name: clearingAccount.Name,
            current_balance: currentBalance,
            account_type: clearingAccount.AccountType,
          },
          fees_account: feesAccount ? {
            id: feesAccount.Id,
            name: feesAccount.Name,
            current_balance: feesBalance,
          } : null,
          summary: {
            current_balance: currentBalance,
            total_debits: Math.round(totalDebits * 100) / 100,
            total_credits: Math.round(totalCredits * 100) / 100,
            entry_count: entries.length,
            is_balanced: Math.abs(currentBalance) < 0.01,
          },
          by_date: byDate,
          entries: entries.slice(0, 50), // Latest 50
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET ?action=stripe-payouts ────────────────────────────────────
    // Fetch real Stripe payouts from the Stripe API
    if (urlPath === "stripe-payouts" && req.method === "GET") {
      const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
      if (!STRIPE_SECRET_KEY) {
        return new Response(
          JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch recent payouts from Stripe
      const payoutsResp = await fetch("https://api.stripe.com/v1/payouts?limit=25", {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });

      if (!payoutsResp.ok) {
        const errText = await payoutsResp.text();
        return new Response(
          JSON.stringify({ error: "Failed to fetch Stripe payouts", details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payoutsData = await payoutsResp.json();
      const payouts = (payoutsData.data || []).map((p: any) => ({
        id: p.id,
        amount: p.amount / 100, // Convert from cents
        currency: p.currency,
        status: p.status,
        arrival_date: new Date(p.arrival_date * 1000).toISOString().split("T")[0],
        created: new Date(p.created * 1000).toISOString(),
        description: p.description || "",
        destination: p.destination ? `••••${String(p.destination).slice(-4)}` : null,
        method: p.method,
      }));

      // Fetch balance
      const balanceResp = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      let balance = null;
      if (balanceResp.ok) {
        const balData = await balanceResp.json();
        const available = (balData.available || []).reduce((s: number, b: any) => s + b.amount, 0) / 100;
        const pending = (balData.pending || []).reduce((s: number, b: any) => s + b.amount, 0) / 100;
        balance = { available, pending, total: available + pending };
      }

      // Fetch balance transactions summary for incoming total
      const txnResp = await fetch("https://api.stripe.com/v1/balance_transactions?limit=100&type=charge", {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      let incomingTotal = 0;
      let totalFees = 0;
      if (txnResp.ok) {
        const txnData = await txnResp.json();
        for (const t of txnData.data || []) {
          incomingTotal += t.amount / 100;
          totalFees += t.fee / 100;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          payouts,
          balance,
          summary: {
            incoming: Math.round(incomingTotal * 100) / 100,
            fees: Math.round(totalFees * 100) / 100,
            net: Math.round((incomingTotal - totalFees) * 100) / 100,
            payout_count: payouts.length,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=sync-loan-financing ──────────────────────────
    // Creates a QBO Customer from loan applicant + generates recurring invoices
    // for the full amortization schedule with staggered due dates.
    if (urlPath === "sync-loan-financing" && req.method === "POST") {
      const { loan_application_id } = await req.json();
      if (!loan_application_id) {
        return new Response(JSON.stringify({ error: "loan_application_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the loan application
      const { data: loan, error: loanErr } = await supabaseAdmin
        .from("loan_applications")
        .select("*")
        .eq("id", loan_application_id)
        .single();

      if (loanErr || !loan) {
        return new Response(JSON.stringify({ error: "Loan application not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (loan.status !== "approved") {
        return new Response(JSON.stringify({ error: "Loan must be approved before syncing" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const approvedAmount = loan.approved_amount || 0;
      const annualRate = loan.approved_rate || 4.7;
      const termMonths = loan.approved_term_months || 12;
      const monthlyRate = annualRate / 100 / 12;

      // Calculate monthly payment using standard amortization formula
      const monthlyPayment = monthlyRate > 0
        ? (approvedAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1)
        : approvedAmount / termMonths;

      // 1. Create or find QBO Customer from loan applicant
      const displayName = `${loan.first_name} ${loan.last_name}`.trim();
      const displayNameEscaped = displayName.replace(/'/g, "\\'");

      let qboCustomerId: string | null = null;

      // Check existing
      const searchResp = await fetch(
        `${qboBase}/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${displayNameEscaped}'`)}`,
        { headers: qboHeaders }
      );
      if (searchResp.ok) {
        const searchData = await searchResp.json();
        const matches = searchData.QueryResponse?.Customer || [];
        if (matches.length > 0) qboCustomerId = matches[0].Id;
      }

      if (!qboCustomerId) {
        const customerData: any = {
          DisplayName: displayName.substring(0, 100),
          GivenName: (loan.first_name || "").substring(0, 25),
          FamilyName: (loan.last_name || "").substring(0, 25),
        };
        if (loan.email) customerData.PrimaryEmailAddr = { Address: loan.email.substring(0, 100) };
        if (loan.phone) customerData.PrimaryPhone = { FreeFormNumber: loan.phone.substring(0, 30) };
        if (loan.address_line1) {
          customerData.BillAddr = {
            Line1: loan.address_line1,
            Line2: loan.address_line2 || undefined,
            City: loan.city,
            CountrySubDivisionCode: loan.state,
            PostalCode: loan.zip_code,
          };
        }

        const createResp = await fetch(`${qboBase}/customer`, {
          method: "POST", headers: qboHeaders, body: JSON.stringify(customerData),
        });
        if (!createResp.ok) {
          const errText = await createResp.text();
          throw new Error(`Failed to create QBO Customer: ${errText}`);
        }
        const result = await createResp.json();
        qboCustomerId = result.Customer.Id;
      }

      // Save QBO customer ID back to loan application
      await supabaseAdmin.from("loan_applications").update({
        qbo_customer_id: qboCustomerId,
        qbo_synced_at: new Date().toISOString(),
      }).eq("id", loan_application_id);

      // 2. Generate amortization schedule and create QBO invoices
      let balance = approvedAmount;
      const scheduleRows: any[] = [];
      const qboInvoiceIds: string[] = [];
      const today = new Date();

      // Auto-provision a "Travel Financing" income account
      const financingIncomeId = await ensureQBOAccount(
        qboBase, qboHeaders, "Travel Financing Income", "Income", "ServiceFeeIncome"
      );
      // Auto-provision a "Loan Interest Income" account
      const interestIncomeId = await ensureQBOAccount(
        qboBase, qboHeaders, "Loan Interest Income", "Income", "OtherPrimaryIncome"
      );

      for (let i = 1; i <= termMonths; i++) {
        const interestPayment = Math.round(balance * monthlyRate * 100) / 100;
        const principalPayment = Math.round((monthlyPayment - interestPayment) * 100) / 100;
        balance = Math.max(0, Math.round((balance - principalPayment) * 100) / 100);

        // Due date: i months from today
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        const totalPmt = Math.round((principalPayment + interestPayment) * 100) / 100;

        // Create QBO Invoice for this payment
        const invoiceData: any = {
          CustomerRef: { value: qboCustomerId },
          DueDate: dueDateStr,
          TxnDate: dueDateStr,
          DocNumber: `${loan.application_number}-${String(i).padStart(2, "0")}`.substring(0, 21),
          PrivateNote: `Travel financing payment ${i}/${termMonths} — ${loan.application_number}`,
          Line: [
            {
              Amount: principalPayment,
              DetailType: "SalesItemLineDetail",
              SalesItemLineDetail: {
                ItemRef: { value: "1", name: "Services" },
              },
              Description: `Principal payment ${i}/${termMonths} — Travel Financing`,
            },
            {
              Amount: interestPayment,
              DetailType: "SalesItemLineDetail",
              SalesItemLineDetail: {
                ItemRef: { value: "1", name: "Services" },
              },
              Description: `Interest payment ${i}/${termMonths} — ${annualRate}% APR`,
            },
          ],
        };

        // Set the email for auto-send
        if (loan.email) {
          invoiceData.BillEmail = { Address: loan.email };
        }

        const invResp = await fetch(`${qboBase}/invoice`, {
          method: "POST", headers: qboHeaders, body: JSON.stringify(invoiceData),
        });

        let qboInvoiceId: string | null = null;
        if (invResp.ok) {
          const invResult = await invResp.json();
          qboInvoiceId = invResult.Invoice.Id;
          qboInvoiceIds.push(qboInvoiceId!);
        } else {
          const errText = await invResp.text();
          console.error(`Failed to create QBO invoice ${i}/${termMonths}:`, errText);
        }

        scheduleRows.push({
          loan_application_id,
          user_id: userId,
          payment_number: i,
          due_date: dueDateStr,
          principal_amount: principalPayment,
          interest_amount: interestPayment,
          total_payment: totalPmt,
          status: "pending",
          qbo_invoice_id: qboInvoiceId,
          qbo_synced_at: qboInvoiceId ? new Date().toISOString() : null,
        });
      }

      // 3. Insert payment schedule into database
      // Delete any existing schedule for this loan first
      await supabaseAdmin
        .from("loan_payment_schedules")
        .delete()
        .eq("loan_application_id", loan_application_id);

      const { error: insertErr } = await supabaseAdmin
        .from("loan_payment_schedules")
        .insert(scheduleRows);

      if (insertErr) {
        console.error("Failed to insert payment schedules:", insertErr);
      }

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId,
        sync_type: "loan_financing",
        direction: "push",
        status: "success",
        records_processed: qboInvoiceIds.length,
        details: {
          loan_application_id,
          application_number: loan.application_number,
          qbo_customer_id: qboCustomerId,
          approved_amount: approvedAmount,
          annual_rate: annualRate,
          term_months: termMonths,
          monthly_payment: Math.round(monthlyPayment * 100) / 100,
          invoices_created: qboInvoiceIds.length,
          total_interest: Math.round(
            scheduleRows.reduce((s: number, r: any) => s + r.interest_amount, 0) * 100
          ) / 100,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          qbo_customer_id: qboCustomerId,
          invoices_created: qboInvoiceIds.length,
          monthly_payment: Math.round(monthlyPayment * 100) / 100,
          schedule: scheduleRows.map((r) => ({
            payment_number: r.payment_number,
            due_date: r.due_date,
            principal: r.principal_amount,
            interest: r.interest_amount,
            total: r.total_payment,
            qbo_invoice_id: r.qbo_invoice_id,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── POST ?action=sync-loan-payment ────────────────────────────────
    // Record a payment against a loan schedule item and mark QBO invoice as paid
    if (urlPath === "sync-loan-payment" && req.method === "POST") {
      const { schedule_id, paid_date } = await req.json();
      if (!schedule_id) {
        return new Response(JSON.stringify({ error: "schedule_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: schedule, error: schedErr } = await supabaseAdmin
        .from("loan_payment_schedules")
        .select("*")
        .eq("id", schedule_id)
        .single();

      if (schedErr || !schedule) {
        return new Response(JSON.stringify({ error: "Schedule item not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payDate = paid_date || new Date().toISOString().split("T")[0];

      // Update local status
      await supabaseAdmin.from("loan_payment_schedules").update({
        status: "paid",
        paid_date: payDate,
        updated_at: new Date().toISOString(),
      }).eq("id", schedule_id);

      // If there's a QBO invoice, record payment in QBO
      if (schedule.qbo_invoice_id) {
        // Get the invoice to find SyncToken
        const invResp = await fetch(`${qboBase}/invoice/${schedule.qbo_invoice_id}`, {
          headers: qboHeaders,
        });

        if (invResp.ok) {
          const invData = await invResp.json();
          const invoice = invData.Invoice;

          // Create a QBO Payment against this invoice
          const paymentData = {
            TotalAmt: schedule.total_payment,
            TxnDate: payDate,
            Line: [{
              Amount: schedule.total_payment,
              LinkedTxn: [{
                TxnId: schedule.qbo_invoice_id,
                TxnType: "Invoice",
              }],
            }],
            CustomerRef: invoice.CustomerRef,
          };

          const payResp = await fetch(`${qboBase}/payment`, {
            method: "POST",
            headers: qboHeaders,
            body: JSON.stringify(paymentData),
          });

          if (!payResp.ok) {
            const errText = await payResp.text();
            console.error("Failed to create QBO payment:", errText);
          }
        }
      }

      await supabaseAdmin.from("qbo_sync_logs").insert({
        user_id: userId,
        sync_type: "loan_payment",
        direction: "push",
        status: "success",
        records_processed: 1,
        details: { schedule_id, paid_date: payDate, qbo_invoice_id: schedule.qbo_invoice_id },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET ?action=loan-payment-status ──────────────────────────────
    // Pull payment status from QBO for loan invoices and sync back
    if (urlPath === "loan-payment-status" && req.method === "POST") {
      const { loan_application_id } = await req.json();
      if (!loan_application_id) {
        return new Response(JSON.stringify({ error: "loan_application_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: schedules } = await supabaseAdmin
        .from("loan_payment_schedules")
        .select("*")
        .eq("loan_application_id", loan_application_id)
        .order("payment_number", { ascending: true });

      if (!schedules?.length) {
        return new Response(JSON.stringify({ success: true, updated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      for (const schedule of schedules) {
        if (!schedule.qbo_invoice_id || schedule.status === "paid") continue;

        const invResp = await fetch(`${qboBase}/invoice/${schedule.qbo_invoice_id}`, {
          headers: qboHeaders,
        });

        if (invResp.ok) {
          const invData = await invResp.json();
          const invoice = invData.Invoice;
          const balance = parseFloat(invoice.Balance || "0");

          if (balance === 0 && invoice.Balance !== undefined) {
            // Invoice is fully paid in QBO
            await supabaseAdmin.from("loan_payment_schedules").update({
              status: "paid",
              paid_date: invoice.MetaData?.LastUpdatedTime?.split("T")[0] || new Date().toISOString().split("T")[0],
              updated_at: new Date().toISOString(),
            }).eq("id", schedule.id);
            updated++;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("QBO sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

const _accountCache = new Map<string, string>();

/**
 * Ensure a QBO Account exists by name. Creates it if missing.
 * Returns the QBO Account Id.
 */
async function ensureQBOAccount(
  qboBase: string, qboHeaders: any,
  accountName: string, accountType: string, accountSubType: string
): Promise<string> {
  if (_accountCache.has(accountName)) {
    return _accountCache.get(accountName)!;
  }

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
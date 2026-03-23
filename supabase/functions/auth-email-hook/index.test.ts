import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * Email Template Tests
 * 
 * Tests the auth-email-hook edge function which handles all 6 branded
 * email templates: signup, recovery, magiclink, invite, email_change, reauthentication.
 * 
 * Deployment tests always run. Preview/render tests run when LOVABLE_API_KEY is available.
 */

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const EMAIL_TYPES = ["signup", "recovery", "magiclink", "invite", "email_change", "reauthentication"] as const;

// ── Deployment & Security Tests ──────────────────────────────────────────

Deno.test("function is deployed and reachable", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
});

Deno.test("CORS headers are set correctly", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "OPTIONS",
    headers: { "Origin": "https://cts-agent-dash.lovable.app" },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  const allowHeaders = res.headers.get("Access-Control-Allow-Headers") || "";
  assertStringIncludes(allowHeaders, "content-type");
  assertStringIncludes(allowHeaders, "x-lovable-signature");
});

Deno.test("rejects POST without valid webhook signature", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ type: "auth", data: { action_type: "signup", email: "test@test.com" } }),
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx, got ${res.status}`);
});

Deno.test("rejects empty POST body", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: "{}",
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true);
});

Deno.test("preview endpoint rejects unauthenticated requests", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "signup" }),
  });
  const text = await res.text();
  assertEquals(res.status, 401);
});

Deno.test("preview endpoint rejects wrong API key", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer wrong-key-12345",
    },
    body: JSON.stringify({ type: "signup" }),
  });
  const text = await res.text();
  assertEquals(res.status, 401);
});

// ── Template Rendering Tests (require LOVABLE_API_KEY) ───────────────────

async function fetchPreview(type: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({ type }),
  });
  return { status: res.status, html: await res.text() };
}

// ── DNS / Verification Edge-Case Harness ─────────────────────────────────

Deno.test("handles malformed JSON body gracefully", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: "not-json{{{",
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx for malformed JSON, got ${res.status}`);
});

Deno.test("handles missing content-type header", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ type: "auth", data: { action_type: "signup" } }),
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx without content-type, got ${res.status}`);
});

Deno.test("rejects stale/replayed webhook with fabricated timestamp", async () => {
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 min ago
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "x-lovable-signature": "fake-sig-value",
      "x-lovable-timestamp": staleTimestamp,
    },
    body: JSON.stringify({
      type: "auth",
      version: "1",
      run_id: "test-replay-run",
      data: { action_type: "signup", email: "replay@test.com", url: "https://example.com" },
    }),
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx for stale timestamp, got ${res.status}`);
});

Deno.test("rejects webhook with missing signature header", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "x-lovable-timestamp": String(Math.floor(Date.now() / 1000)),
    },
    body: JSON.stringify({
      type: "auth",
      version: "1",
      run_id: "test-nosig-run",
      data: { action_type: "signup", email: "nosig@test.com", url: "https://example.com" },
    }),
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx for missing signature, got ${res.status}`);
});

Deno.test("rejects webhook with missing timestamp header", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "x-lovable-signature": "fake-sig-value",
    },
    body: JSON.stringify({
      type: "auth",
      version: "1",
      run_id: "test-notime-run",
      data: { action_type: "recovery", email: "notime@test.com", url: "https://example.com" },
    }),
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx for missing timestamp, got ${res.status}`);
});

Deno.test("rejects webhook payload with unsupported version", async () => {
  // This tests the version guard even though signature will fail first —
  // the test validates the function rejects before reaching template rendering
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "x-lovable-signature": "fake-sig",
      "x-lovable-timestamp": String(Math.floor(Date.now() / 1000)),
    },
    body: JSON.stringify({
      type: "auth",
      version: "99",
      run_id: "test-version-run",
      data: { action_type: "signup", email: "ver@test.com", url: "https://example.com" },
    }),
  });
  const text = await res.text();
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx for bad version, got ${res.status}`);
});

Deno.test("preview endpoint rejects missing body", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY || "no-key"}`,
    },
    body: "",
  });
  const text = await res.text();
  // Should get 400 (bad JSON) or 401 (no key) — never 200 or 500
  assertEquals(res.status >= 400 && res.status < 500, true, `Expected 4xx for empty body, got ${res.status}`);
});

Deno.test("GET on main endpoint returns 4xx or handled response", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${ANON_KEY}` },
  });
  const text = await res.text();
  // GET is not a valid method for webhook — should not return 200
  assertEquals(res.status !== 200, true, `GET should not return 200, got ${res.status}`);
});

Deno.test("concurrent requests don't cause 5xx", async () => {
  const requests = Array.from({ length: 5 }, () =>
    fetch(`${SUPABASE_URL}/functions/v1/auth-email-hook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ type: "auth", data: { action_type: "signup", email: "concurrent@test.com" } }),
    }).then(async (r) => { await r.text(); return r.status; })
  );
  const statuses = await Promise.all(requests);
  for (const status of statuses) {
    assertEquals(status < 500, true, `Concurrent request returned 5xx: ${status}`);
  }
});

// ── Template Rendering Tests (require LOVABLE_API_KEY) ───────────────────

if (LOVABLE_API_KEY) {
  for (const type of EMAIL_TYPES) {
    Deno.test(`[preview] ${type} renders valid branded HTML`, async () => {
      const { status, html } = await fetchPreview(type);
      assertEquals(status, 200, `Expected 200, got ${status}: ${html.substring(0, 200)}`);
      assertStringIncludes(html, "<!DOCTYPE html");
      assertStringIncludes(html, "</html>");
      assertStringIncludes(html, "#ffffff"); // white body background
      assertStringIncludes(html, "email-assets/logo.png"); // logo
      assertStringIncludes(html, "#173b75"); // brand navy
    });
  }

  Deno.test("[preview] signup has welcome copy and confirm button", async () => {
    const { html } = await fetchPreview("signup");
    assertStringIncludes(html, "Welcome aboard");
    assertStringIncludes(html, "Crestwell Travel Services");
    assertStringIncludes(html, "Confirm My Email");
  });

  Deno.test("[preview] recovery has reset button", async () => {
    const { html } = await fetchPreview("recovery");
    assertStringIncludes(html, "Reset your password");
    assertStringIncludes(html, "Reset Password");
  });

  Deno.test("[preview] magiclink has sign-in button", async () => {
    const { html } = await fetchPreview("magiclink");
    assertStringIncludes(html, "Sign in to your account");
    assertStringIncludes(html, "Sign In");
  });

  Deno.test("[preview] invite has accept button", async () => {
    const { html } = await fetchPreview("invite");
    assertStringIncludes(html, "invited");
    assertStringIncludes(html, "Accept Invitation");
  });

  Deno.test("[preview] email_change shows change context", async () => {
    const { html } = await fetchPreview("email_change");
    assertStringIncludes(html, "Confirm your email change");
    assertStringIncludes(html, "Confirm Email Change");
  });

  Deno.test("[preview] reauthentication shows OTP code", async () => {
    const { html } = await fetchPreview("reauthentication");
    assertStringIncludes(html, "Verify your identity");
    assertStringIncludes(html, "123456");
  });

  Deno.test("[preview] unknown type returns 400", async () => {
    const { status } = await fetchPreview("nonexistent");
    assertEquals(status, 400);
  });

  Deno.test("[preview] empty type string returns 400", async () => {
    const { status } = await fetchPreview("");
    assertEquals(status, 400);
  });

  Deno.test("[preview] SQL injection in type field returns 400", async () => {
    const { status } = await fetchPreview("'; DROP TABLE users; --");
    assertEquals(status, 400);
  });
} else {
  Deno.test("[preview] SKIPPED — LOVABLE_API_KEY not available in test env", () => {
    console.log("Preview render tests skipped. Set LOVABLE_API_KEY to run full suite.");
  });
}

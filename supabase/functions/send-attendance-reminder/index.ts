// supabase/functions/send-attendance-reminder/index.ts
// Deploy this as a Supabase Edge Function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BLkyc5xLiVXhbnBxFhQuG9S36mwUduQGWPDuW4WJnPIj599I0oVwWVE7tZj4exlOLiAYGP4EAoD2F3SegTvtRbk";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── VAPID JWT builder (no external lib needed in Deno) ──
async function buildVapidJwt(audience: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: "mailto:bunkmeter@gitam.edu",
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const sigInput = `${header}.${payload}`;

  // Decode private key from base64url
  const privBytes = base64urlDecode(VAPID_PRIVATE_KEY);

  // Import as ECDSA P-256 private key (raw = 32 bytes)
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    wrapPkcs8(privBytes),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(sigInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${sigInput}.${sigB64}`;
}

function base64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// Wrap raw 32-byte EC private key into PKCS#8 DER for SubtleCrypto
function wrapPkcs8(rawKey: Uint8Array): ArrayBuffer {
  const prefix = new Uint8Array([
    0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,
    0xce,0x3d,0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,
    0x01,0x07,0x04,0x27,0x30,0x25,0x02,0x01,0x01,0x04,0x20,
  ]);
  const der = new Uint8Array(prefix.length + rawKey.length);
  der.set(prefix); der.set(rawKey, prefix.length);
  return der.buffer;
}

// ── Send one push message ──
async function sendPush(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}, payload: string): Promise<{ ok: boolean; status?: number }> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await buildVapidJwt(audience);
  const authHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  // Encrypt payload using Web Push encryption (simplified — send as text)
  // For simplicity we send unencrypted and rely on the endpoint doing it
  // Production: use RFC 8291 encryption
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
    },
    body: new TextEncoder().encode(payload),
  });

  return { ok: res.ok, status: res.status };
}

// ── Main handler ──
Deno.serve(async (req) => {
  // Allow cron trigger (GET) or manual trigger (POST)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch all push subscriptions
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("*");

  if (error) {
    console.error("DB error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, msg: "No subscribers" }));
  }

  // Today is a weekday? (skip weekends)
  const day = new Date().getDay(); // 0=Sun,6=Sat
  if (day === 0 || day === 6) {
    return new Response(JSON.stringify({ sent: 0, msg: "Weekend — no reminder" }));
  }

  const message = JSON.stringify({
    title: "Log Today's Attendance",
    body: "Did you go to class today? Mark it before you forget!",
    url: "/log",
    tag: "attendance-reminder",
  });

  let sent = 0, failed = 0;
  const stale: string[] = [];

  for (const sub of subs) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      message
    );
    if (result.ok) {
      sent++;
    } else {
      failed++;
      // 410 Gone = subscription expired, clean it up
      if (result.status === 410) stale.push(sub.endpoint);
      console.warn(`Push failed for ${sub.roll}: ${result.status}`);
    }
  }

  // Remove stale subscriptions
  if (stale.length > 0) {
    await db.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return new Response(JSON.stringify({ sent, failed, stale: stale.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
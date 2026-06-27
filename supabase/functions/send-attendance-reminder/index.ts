// supabase/functions/send-attendance-reminder/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = "BLkyc5xLiVXhbnBxFhQuG9S36mwUduQGWPDuW4WJnPIj599I0oVwWVE7tZj4exlOLiAYGP4EAoD2F3SegTvtRbk";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(
  "mailto:bunkmeter@gitam.edu",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Skip weekends (unless ?force=true for testing)
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const day = new Date().getDay();
    if (!force && (day === 0 || day === 6)) {
      return new Response(JSON.stringify({ sent: 0, msg: "Weekend — use ?force=true to test" }));
    }

    const { data: subs, error } = await db
      .from("push_subscriptions")
      .select("*");

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, msg: "No subscribers yet" }));
    }

    const payload = JSON.stringify({
      title: "📝 Log Today's Attendance",
      body: "Don't forget to mark your attendance before you sleep!",
      url: "/",
      tag: "attendance-reminder",
    });

    let sent = 0, failed = 0;
    const stale: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (e: any) {
        failed++;
        if (e.statusCode === 410 || e.statusCode === 404) {
          stale.push(sub.endpoint);
        }
        console.error(`Push failed for ${sub.roll}:`, e.statusCode, e.body);
      }
    }

    // Clean up expired subscriptions
    if (stale.length > 0) {
      await db.from("push_subscriptions").delete().in("endpoint", stale);
    }

    return new Response(
      JSON.stringify({ sent, failed, stale: stale.length }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
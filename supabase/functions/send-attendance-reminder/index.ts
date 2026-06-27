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

// ── VSP Campus Holidays ──
const HOLIDAYS: Record<string, string> = {
  "2026-08-15": "Independence Day",
  "2026-09-04": "Srikrishna Janmashtami",
  "2026-09-14": "Vinayaka Chaturdhi",
  "2026-10-02": "Gandhi Jayanthi",
  "2026-10-20": "Vijayadasami",
  "2026-11-08": "Deepavali",
};

// ── Exam periods (no classes, no reminder) ──
const EXAM_PERIODS = [
  { start: "2026-08-17", end: "2026-08-28", name: "Sessional-I" },
  { start: "2026-11-09", end: "2026-11-20", name: "Sessional-II" },
];

// ── Semester bounds ──
const SEM_START = "2026-06-29";
const SEM_END   = "2026-11-06";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function shouldSkip(force: boolean): { skip: boolean; reason: string } {
  // Get current IST date (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const ds = toDateStr(ist);
  const dow = ist.getUTCDay(); // 0=Sun, 6=Sat

  if (force) return { skip: false, reason: "forced" };

  // Outside semester
  if (ds < SEM_START || ds > SEM_END) {
    return { skip: true, reason: `Outside semester (${ds})` };
  }

  // Weekend
  if (dow === 0 || dow === 6) {
    return { skip: true, reason: "Weekend" };
  }

  // Public holiday
  if (HOLIDAYS[ds]) {
    return { skip: true, reason: `Holiday: ${HOLIDAYS[ds]}` };
  }

  // Exam period
  for (const period of EXAM_PERIODS) {
    if (ds >= period.start && ds <= period.end) {
      return { skip: true, reason: `${period.name} exam period` };
    }
  }

  return { skip: false, reason: "class day" };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const { skip, reason } = shouldSkip(force);
    if (skip) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: true, reason }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: subs, error } = await db
      .from("push_subscriptions")
      .select("*");

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, msg: "No subscribers yet" }));
    }

    // Pick message based on context
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const ds = toDateStr(ist);

    // Check if tomorrow is a holiday/exam/weekend — friendly heads up
    const tomorrow = new Date(ist);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tds = toDateStr(tomorrow);
    const tomorrowHol = HOLIDAYS[tds];
    const tomorrowExam = EXAM_PERIODS.find(p => tds >= p.start && tds <= p.end);
    const tomorrowDow = tomorrow.getUTCDay();
    const tomorrowOff = tomorrowHol || tomorrowExam || tomorrowDow === 0 || tomorrowDow === 6;

    const payload = JSON.stringify({
      title: "Log Today's Attendance",
      body: tomorrowOff
        ? `Mark today's classes before you forget!`
        : `Mark today's classes before you forget!`,
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
        console.error(`Push failed for ${sub.roll}:`, e.statusCode);
      }
    }

    // Remove expired subscriptions
    if (stale.length > 0) {
      await db.from("push_subscriptions").delete().in("endpoint", stale);
    }

    console.log(`[${ds}] Sent: ${sent}, Failed: ${failed}, Stale cleaned: ${stale.length}`);

    return new Response(
      JSON.stringify({ sent, failed, stale: stale.length, reason }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
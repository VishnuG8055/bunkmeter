# BunkMeter — Setup Guide

Your personal attendance tracker. Works on mobile via Netlify. Data syncs via Supabase.

---

## Step 1 — Create Supabase Project (Free)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New Project** → give it any name like `bunkmeter`
3. Wait ~2 min for it to start
4. Go to **SQL Editor** → **New Query**
5. Paste the contents of `supabase_setup.sql` → click **Run**

Now get your credentials:
- Go to **Settings → API**
- Copy your **Project URL** → looks like `https://xxxx.supabase.co`
- Copy your **anon / public** key → long string starting with `eyJ...`

---

## Step 2 — Add Your Keys to index.html

Open `index.html`, find this near the top of the `<script>` section:

```js
const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_KEY = window.SUPABASE_ANON_KEY || '';
```

**Option A (simplest):** Replace directly:
```js
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_KEY = 'YOUR-ANON-KEY-HERE';
```

**Option B (Netlify env vars — more secure):**
- Keep the code as-is
- In Netlify → Site Settings → Environment Variables, add:
  - `SUPABASE_URL` = your project URL
  - `SUPABASE_ANON_KEY` = your anon key
- Then add this snippet right before `</head>` in index.html:
```html
<script>
  window.SUPABASE_URL = 'YOUR_URL';
  window.SUPABASE_ANON_KEY = 'YOUR_KEY';
</script>
```

---

## Step 3 — Deploy to Netlify

### Option A: Drag & Drop (Easiest)
1. Go to **https://netlify.com** → Sign up (free)
2. Drag the entire `bunkmeter` folder onto the Netlify dashboard
3. Done! You get a URL like `https://your-site.netlify.app`

### Option B: GitHub (Auto-deploy on changes)
1. Push this folder to a GitHub repo
2. In Netlify → **Add new site → Import from Git**
3. Connect GitHub → select your repo → deploy

---

## Step 4 — Use on Mobile

Open your Netlify URL in Chrome/Safari on your phone.

**Add to Home Screen:**
- **Android (Chrome):** Menu (⋮) → Add to Home Screen
- **iPhone (Safari):** Share (box with arrow) → Add to Home Screen

It'll work like a native app!

---

## How the App Works

| Tab | What it does |
|-----|------|
| **Overview** | Live attendance % (with decimals) for all subjects + overall |
| **Estimator** | Add multiple bunk scenarios across any dates → see impact |
| **Log** | Mark P/A for today or any past date. Cannot log future. |
| **Calendar** | Feb + Mar view. Green = logged, red = holiday |
| **Timetable** | Full weekly schedule with room numbers |

---

## Sync Status
- **Green dot "synced"** = data saved to Supabase, accessible everywhere
- **Red dot "offline"** = saved to browser only (add Supabase keys)

---

## Notes
- Holidays already set: **Mar 20 & 27, all Saturdays & Sundays**
- Base attendance loaded from your data as of Feb 22
- Each log updates real attendance counts
- Re-logging a date replaces the old entry safely

# BunkMeter — Setup Guide
## From zero to working app on your phone in ~10 minutes

---

## WHAT YOU NEED
- A laptop/PC (just for setup)
- A GitHub account (free) → github.com
- A Supabase account (free) → supabase.com  
- A Netlify account (free) → netlify.com

---

## STEP 1 — Create Your Supabase Database

Supabase is a free cloud database that stores your attendance data so it works across all devices.

1. Go to **https://supabase.com** and click **"Start your project"**
2. Sign up with Google or GitHub (easiest)
3. Click the green **"New project"** button
4. Fill in:
   - **Name:** `bunkmeter` (anything works)
   - **Database Password:** pick any password (save it somewhere safe)
   - **Region:** pick the closest to India → `Southeast Asia (Singapore)` is best
5. Click **"Create new project"** — wait about 2 minutes for it to set up

### Create the database table:
6. In the left sidebar, click **"SQL Editor"** (looks like `>_`)
7. Click **"New query"** (top left)
8. Copy and paste this entire block into the text area:

```sql
CREATE TABLE IF NOT EXISTS bunkmeter_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  attendance JSONB NOT NULL DEFAULT '{}',
  logs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bunkmeter_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON bunkmeter_data FOR ALL USING (true) WITH CHECK (true);
```

9. Click the green **"Run"** button (or press Ctrl+Enter)
10. You should see **"Success. No rows returned"** — that means it worked ✓

### Get your API keys:
11. In the left sidebar, click **"Settings"** (gear icon at the very bottom)
12. Click **"API"** in the settings menu
13. You will see two things — copy both:
    - **Project URL** → looks like `https://abcdefgh.supabase.co`
    - **anon public** key → a very long string starting with `eyJhbGci...`
    
    💡 Keep this tab open, you'll need these in Step 3.

---

## STEP 2 — Put the Files on GitHub

GitHub is where you store the code so Netlify can deploy it.

1. Go to **https://github.com** and sign in (create account if needed)
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name:** `bunkmeter`
   - Leave everything else as default
4. Click **"Create repository"**
5. You'll see a page with instructions — look for the section **"uploading an existing file"** link, click it
6. Drag and drop these files from your computer into the upload area:
   - `index.html`
   - `netlify.toml`
7. Click **"Commit changes"** (green button at bottom)

---

## STEP 3 — Add Your Supabase Keys to the Code

Before deploying, you need to tell the app where your database is.

1. On your GitHub repo page, click on **`index.html`**
2. Click the **pencil icon** (Edit this file) in the top right
3. Press **Ctrl+F** (find) and search for: `SUPABASE_URL`
4. Find these two lines near the top of the `<script>` section:

```javascript
const SUPABASE_URL  = window.SUPABASE_URL  || '';
const SUPABASE_KEY  = window.SUPABASE_ANON_KEY || '';
```

5. Replace them with your actual values (from Step 1):

```javascript
const SUPABASE_URL  = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...YOUR-FULL-KEY-HERE...';
```

   ⚠️ **Important:** Keep the quotes `' '` around the values!

6. Scroll down, click **"Commit changes"** → **"Commit changes"** again

---

## STEP 4 — Deploy to Netlify

Netlify gives you a free website URL where you can access your app from phone.

1. Go to **https://netlify.com** and click **"Sign up"**
2. Sign up with your **GitHub account** (click "Sign up with GitHub") — this is easiest
3. After login, you're on the Netlify dashboard
4. Click **"Add new site"** → **"Import an existing project"**
5. Click **"Deploy with GitHub"**
6. Authorize Netlify to access your GitHub (click the green "Authorize" button)
7. You'll see a list of your repositories — click **"bunkmeter"**
8. On the next screen, everything should be auto-filled. Just click **"Deploy bunkmeter"**
9. Wait about 1 minute — you'll see it go from "Building" to "Published" ✓
10. You'll get a URL like **`https://magical-name-123456.netlify.app`** — that's your app!

---

## STEP 5 — Open on Your Phone & Add to Home Screen

1. On your phone, open **Chrome (Android)** or **Safari (iPhone)**
2. Go to your Netlify URL (the one from Step 4)
3. The app should load! The green dot in the header means it's connected to the database ✓

### Add to Home Screen (so it works like an app):

**Android (Chrome):**
- Tap the 3-dot menu `⋮` in the top right
- Tap **"Add to Home screen"**
- Tap **"Add"**

**iPhone (Safari):**
- Tap the Share button `⬆` (box with arrow, at bottom)
- Scroll down and tap **"Add to Home Screen"**
- Tap **"Add"**

Now BunkMeter appears on your home screen like a regular app!

---

## TROUBLESHOOTING

**Red dot in header says "offline":**
→ Your Supabase keys are missing or wrong. Go back to Step 3 and double-check the URL and key are correctly pasted with quotes.

**"Error: relation bunkmeter_data does not exist":**
→ The SQL from Step 1 wasn't run. Go back to Supabase → SQL Editor and run it again.

**App not updating after code change:**
→ Netlify auto-deploys whenever you push to GitHub. It takes ~1 min. Refresh your phone.

**Supabase free tier limits:**
→ Free tier gives 500MB storage and 50,000 API requests/month — way more than enough for attendance tracking.

---

## HOW THE APP WORKS

| Tab | What to do |
|-----|-----------|
| **Overview** | Check your live attendance % for all subjects. 4 color tiers: green (≥80%), yellow (75-79%), orange (65-74%), red (<65%) |
| **Estimator** | Two modes: "Attend full day" = pick dates and see what % will be if you attend everything. "Skip specific" = pick exact classes to bunk and see the damage |
| **Log** | At end of each day, pick today's date, mark each period P or A, hit Save. Can edit any past day anytime |
| **Calendar** | Feb + March view. Green = logged, dots show subject health |
| **Timetable** | Your full weekly schedule |

**Holidays already set:** March 20 (Ugadi/Ramzan) and March 27 (Sri Rama Navami)

---

## DAILY WORKFLOW

Every evening:
1. Open BunkMeter → **Log** tab
2. Today's date should be pre-filled → click **Load**
3. For each period, tap **P** (present) or **A** (absent)
4. Tap **Save Attendance**
5. Check **Overview** to see your updated percentages ✓

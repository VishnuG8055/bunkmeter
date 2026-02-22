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


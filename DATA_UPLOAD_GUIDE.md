# Data Upload & Dashboard Guide

## ✅ FIXED - Data is Now Available!

Your data has been successfully ingested and aggregated:
- **218 mentors** from your Excel files
- **20 teams**
- **1,625 metric records**
- **Latest date**: Oct 23, 2025

---

## 🔑 How to See Your Data

### Problem You Experienced:
You were logged in as **Kiran Patel** (a LEADER role). Leaders can only see their own team's data. After cleanup, leaders had no team assigned, so they saw **0 mentors**.

### Solution:

**Login as Super Admin** to see ALL data:

```
Email: admin@cmetrics.app
Password: Admin123!
```

After login, you will see:
- ✅ All 218 mentors across all 20 teams
- ✅ Real metrics from your uploaded CCtest.xlsx
- ✅ Team performance overview
- ✅ Top/bottom performers
- ✅ All dashboard charts with real data

**Alternative**: Login as team leaders (but you'll only see their specific team):
- Kiran: `kiran@cmetrics.app / Leader123!` (sees one team)
- Aisha: `aisha@cmetrics.app / Leader123!` (sees EGLP1 EGSS-LOBNA team)

---

## 📊 Current Data Status

### ✅ Successfully Uploaded:
1. **CCtest.xlsx** → Processed 140 mentors
   - Class Consumption (CC%): ✅ 100% coverage
   - Super Class (SC%): ✅ 100% coverage

### ❌ Not Yet Uploaded:
2. **FTtest.xlsx** (Fixed Rate) → Upload this to get Fixed% data
3. **CM teams (1).xlsx** (Referral) → Upload this to get Referral data
4. **[CM] Upgrade Rate.xlsx** (Upgrade Rate) → Upload this to get UP% data
5. **1410Leads.xlsx** ⚠️ **Cannot process - see explanation below**

---

## ⚠️ Why 1410Leads.xlsx Doesn't Work

### The Issue:
This file contains **student-level** raw data, not mentor-aggregated data:

```
Columns: Student ID | LP Group | LP | Fixed or Not | ...
Each row = 1 student (not 1 mentor)
```

### What We Expected:
Mentor-aggregated data with one row per mentor:

```
Columns: Mentor Name | Total Leads | Recovered | Unrecovered | ...
Each row = 1 mentor with their totals
```

### Solutions:

**Option 1**: Transform the file in Excel (recommended)
1. Create a pivot table grouping by "LP" (mentor name)
2. Sum up: Total students, Recovered, Unrecovered
3. Export as new sheet with mentor-level data
4. Upload the transformed file

**Option 2**: Skip this file
- The system works fine without it
- You already have referral data from "CM teams (1).xlsx"

---

## 📤 How to Upload Remaining Files

### Method 1: Upload via UI (One at a time)

1. Go to **Upload Data** page
2. Select file type (CC, Fixed, Referral, Upgrade)
3. Drop the Excel file
4. Click **Upload & Process**
5. Wait for success message
6. **Refresh the Overview page** to see updated data

### Method 2: Folder Ingestion (All at once - RECOMMENDED)

1. Make sure all Excel files are in: `./Excel Sheets of What We Will Upload/`
2. Run command:
   ```bash
   npm run ingest:folder
   ```
3. Wait for completion (processes all files simultaneously)
4. Run aggregation:
   ```bash
   npm run aggregate --workspace=server
   ```
5. **Refresh the dashboard**

---

## 🔄 Complete Workflow

### After Every Upload:

1. **Upload Excel file(s)** → Creates `MetricDaily` records
2. **Run aggregation** → Creates `MentorStats` for dashboard
   ```bash
   npm run aggregate --workspace=server
   ```
3. **Refresh browser** → Dashboard shows updated data

### Why Two Steps?

- **MetricDaily**: Raw data storage (one row per mentor per day)
- **MentorStats**: Aggregated statistics for fast dashboard queries
- The aggregation calculates weighted scores, rankings, and status (Above/Warning/Below)

---

## 🎯 Quick Commands Reference

```bash
# Ingest all Excel files from folder
npm run ingest:folder

# Aggregate latest data for dashboard
npm run aggregate --workspace=server

# Clean old seed data (already done)
cd server && npx tsx cleanup-seed-data.ts

# Check database status
cd server && npx tsx check-db.ts

# Check users and teams
cd server && npx tsx check-users.ts
```

---

## 📈 Expected Dashboard After All Uploads

Once you upload the remaining 3 files, you'll see:

### Overview Page:
- **CC%**: Real averages from CCtest.xlsx ✅
- **SC%**: Real averages from CCtest.xlsx ✅
- **UP%**: Real averages from Upgrade file (after upload)
- **Fixed%**: Real averages from FTtest.xlsx (after upload)
- **Status Distribution**: Above/Warning/Below counts
- **Weekly Pacing**: W1-W4 progress
- **Team Radar**: All 4 metrics compared to targets
- **Top/Bottom Performers**: Ranked by weighted score

### Mentors Page:
- Full list of all 218 mentors
- Filter by status, team, or search
- Real metrics for each mentor
- Click to see detailed mentor view

### Targets Page:
- Configure targets for CC%, SC%, UP%, Fixed%
- Adjust weights for score calculation
- Set weekly pacing multipliers

---

## ✅ Verification Checklist

After uploading and aggregating:

- [ ] Login as admin@cmetrics.app
- [ ] Overview page shows real CC% and SC% (not 0%)
- [ ] Mentor count shows 218 (or more after additional uploads)
- [ ] Mentors page lists all mentors with data
- [ ] Charts display (not empty)
- [ ] Top/bottom performers show real names
- [ ] Status distribution shows counts (not all 0)

---

## 🚨 Troubleshooting

### Dashboard Still Shows 0%:

1. **Check you're logged in as admin** (not a team leader)
2. **Run aggregation**:
   ```bash
   npm run aggregate --workspace=server
   ```
3. **Hard refresh browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. **Check browser console** for API errors (F12 → Console tab)

### Upload Failed:

1. **Check file format**: Headers must match expected columns
2. **Check console logs**: Look for error messages in terminal
3. **Try folder ingestion**: `npm run ingest:folder` (more reliable)
4. **Check ingestion report**: `./ingestion-reports/*.json`

### "No files were successfully processed":

- File has wrong format (like 1410Leads.xlsx)
- Headers don't match any known pattern
- File is empty or corrupted
- Check error details in ingestion report

---

## 📞 Next Steps

1. **Logout** from Kiran Patel account
2. **Login as admin@cmetrics.app / Admin123!**
3. **Verify data** is showing on Overview page
4. **Upload remaining files**:
   - FTtest.xlsx
   - CM teams (1).xlsx
   - Upgrade Rate xlsx
5. **Run aggregation** after each upload
6. **Refresh dashboard** to see complete data

---

**Your platform is ready! Just need to login as admin to see everything.** 🎉

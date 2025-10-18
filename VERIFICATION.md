# Production Upload Verification Guide

## Prerequisites
- Railway deployment is live and healthy (`/healthz` returns 200)
- Admin user exists (seeded or created)
- Sample Excel files available for testing

## Verification Steps

### Step 1: Access Admin Ingestion Page

1. Navigate to your Railway deployment URL
2. Login as Admin:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Go to `/admin/ingestion` or use navigation menu

**Expected**: Ingestion page loads with 5 file upload zones

### Step 2: Upload Excel Files

Prepare 2-3 sample Excel files (any subset of the 5 sources):

**Recommended test files**:
- `CCtest.xlsx` (Class Consumption with CC% and SC% columns)
- `FixedTest.xlsx` (Fixed Rate data)
- `UpgradeRate.xlsx` (Upgrade percentage data)

**Upload process**:
1. Drag & drop each file to its corresponding zone OR click to browse
2. Verify file preview shows filename and size
3. Check no validation errors appear (size/type)
4. Click "Upload & Process" button

**Expected**:
- Upload button shows spinner
- No errors in browser console
- Processing completes in 2-10 seconds (depending on file sizes)

### Step 3: Review Ingestion Report

After upload completes, verify the report shows:

**Summary Cards**:
- ✅ Mentors: Count > 0
- ✅ Created: Number of new metric records
- ✅ Updated: Number of updated records (0 on first upload)
- ✅ Skipped: Duplicates (0 on first upload)

**Coverage Bars**:
- CC, SC, UP, Fixed, Referral, Leads percentages
- At least one metric should show > 0%

**Sources Breakdown**:
- One card per uploaded file
- Shows: Received, Accepted, Rejected counts
- Columns detected count
- If rejected > 0: Expand to see row-level errors

**Actions**:
- Click "Download JSON" to save full report
- Verify JSON file downloads successfully

### Step 4: Verify Data in Overview Dashboard

1. Click "View Overview" button (or navigate manually to `/overview`)
2. Check dashboard displays real data:
   - **KPI Cards**: CC%, SC%, UP%, Fixed% show actual values (not "0%" or "N/A")
   - **Weekly Pacing Chart**: Data points visible (not empty)
   - **Status Distribution**: Counts for Above/Warning/Below (not all zero)

**Expected**: Charts and tables populate with uploaded data

### Step 5: Verify Data in Mentors List

1. Click "View Mentors" button (or navigate to `/mentors`)
2. Check mentors table:
   - Rows visible (not "No data")
   - Mentor names from uploaded files appear
   - CC%, SC%, UP%, Fixed% columns show values
   - Status chips display (green/yellow/red)
   - Targets Hit column shows 0-4

**Expected**: Table shows mentors with metrics

### Step 6: Test Re-upload (Deduplication)

1. Return to `/admin/ingestion`
2. Upload the **same files again**
3. Review report:
   - **Skipped (duplicates)**: Should be > 0
   - **Created**: Should be 0
   - **Updated**: May be > 0 if data changed

**Expected**: System detects and skips duplicate records

### Step 7: Test Partial Upload

1. Clear all files
2. Upload only 1-2 sources (e.g., just CC and Fixed)
3. Verify:
   - Processing succeeds
   - Coverage shows 100% for uploaded sources, 0% for others
   - Mentors list updates with partial metrics

**Expected**: Partial uploads work correctly

### Step 8: Test Error Handling

**Invalid file type**:
1. Try uploading a `.pdf` or `.docx` file
2. Verify error message appears: "Invalid file type..."

**Oversized file** (if possible):
1. Try uploading a file > 200MB
2. Verify error: "File too large..."

**Malformed Excel**:
1. Create/upload Excel with missing required columns (e.g., no "Mentor Name")
2. Verify rejected rows appear in report

**Expected**: Validation errors display clearly

## API Verification (Optional)

Test programmatic upload via curl:

```bash
# 1. Login to get JWT cookie
curl -X POST "https://your-app.up.railway.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c cookies.txt

# 2. Upload files
curl -X POST "https://your-app.up.railway.app/api/ingest/uploads" \
  -b cookies.txt \
  -F "cc_file=@./CCtest.xlsx" \
  -F "fixed_file=@./FixedTest.xlsx"

# 3. Check response
# Should return JSON with {success: true, report: {...}}
```

**Expected**: API returns 200 OK with IngestionReport JSON

## Performance Checks

1. **Memory**: Check Railway metrics - no significant memory spikes during upload
2. **Response Time**: Upload + processing completes in < 30 seconds for files under 50MB
3. **Database**: Verify no connection pool exhaustion
4. **Healthz**: `/healthz` remains 200 OK during and after uploads

## Acceptance Checklist

- [ ] Admin can access `/admin/ingestion` page
- [ ] Drag-and-drop file upload works
- [ ] File validation (type/size) shows clear errors
- [ ] Upload processes successfully with 2-3 sample files
- [ ] Ingestion report displays with accurate counts
- [ ] Coverage percentages match uploaded sources
- [ ] "View Overview" button navigates and shows real data
- [ ] "View Mentors" button navigates and shows real data
- [ ] Charts/tables reflect uploaded metrics (no mock data)
- [ ] Re-uploading same files triggers deduplication (skipped count > 0)
- [ ] Download JSON button saves full report
- [ ] Invalid files show validation errors
- [ ] `/healthz` remains healthy throughout
- [ ] No errors in server logs (check Railway logs)
- [ ] Memory usage stable (no leaks)

## Troubleshooting

**Upload fails with 500 error**:
- Check Railway logs for stack trace
- Verify DATABASE_URL is correct
- Ensure Prisma migrations ran (`prisma migrate deploy` on boot)

**"No files uploaded" error**:
- Verify at least one file is selected
- Check file input fields are named correctly (`cc_file`, etc.)

**Report shows 0 created/updated**:
- Check for validation errors in sources breakdown
- Verify Excel headers match expected formats
- Review rejected rows for clues

**Dashboard shows mock data after upload**:
- Check if dashboards are wired to API endpoints (not mock data)
- Verify Overview/Mentors pages query database
- Check browser console for API errors

## Success Criteria

✅ **All checks pass**
✅ **Data flows: Upload → Report → Dashboard → Tables**
✅ **No memory leaks or crashes**
✅ **Folder/Sheets ingestion modes still work (if tested)**

---

**Test Date**: _____________
**Tester**: _____________
**Railway URL**: _____________
**Result**: ☐ Pass ☐ Fail
**Notes**: _____________________________________________

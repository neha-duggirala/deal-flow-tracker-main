# Integration Checklist & Testing Guide

## Pre-Flight Checks

- [ ] Backend code reviewed and ready to deploy
- [ ] Frontend code synced with latest changes
- [ ] Node.js and npm installed on your machine
- [ ] Python 3.9+ installed and accessible
- [ ] Port 8005 is available (not in use by other app)
- [ ] Port 5173 available (frontend dev server)

## Installation Steps

### Backend Setup
```bash
# 1. Navigate to backend directory
cd be

# 2. Create virtual environment (optional but recommended)
python -m venv venv

# 3. Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Verify Qdrant is accessible (if required)
# Check backend logs or documentation for connection details
```

### Frontend Setup
```bash
# 1. Navigate to frontend directory
cd fe

# 2. Create .env file from template
copy .env.example .env
# On macOS/Linux:
# cp .env.example .env

# 3. Install dependencies
npm install

# 4. Verify environment variables
cat .env
# Should see: REACT_APP_API_URL=http://localhost:8005
```

## Startup Sequence

### Terminal 1 - Backend Server
```bash
cd be
uvicorn main:app --host 127.0.0.1 --port 8005 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8005
INFO:     Application startup complete
```

### Terminal 2 - Frontend Dev Server
```bash
cd fe
npm run dev
```

Expected output:
```
VITE v4.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Terminal 3 - Testing/Debugging (Optional)
```bash
cd be
# Or use for monitoring logs
```

## Health Checks

### 1. Backend Health
```bash
curl http://localhost:8005/health
# Response: {"status":"ok"}
```

### 2. API Documentation
- Open browser: `http://localhost:8005/docs`
- Should see Swagger UI with all endpoints
- Try endpoints directly (optional)

### 3. Frontend App
- Open browser: `http://localhost:5173`
- Should see Deal Flow dashboard
- No red error messages

### 4. Network Connectivity
Open browser DevTools (F12):
- Network tab should be empty (no errors)
- When clicking "Analyze", should see POST to `/api/analyze`
- Response should have 200 status

## Feature Testing

### Test 1: Basic Analysis
1. [ ] Dashboard loads without errors
2. [ ] Deal list visible with mock data
3. [ ] Can select different deals
4. [ ] Chat panel shows deal-specific messages

### Test 2: Analyze Functionality
1. [ ] Select "DEAL-IR-2024-001" (Steel deal)
2. [ ] Click "Analyze" button
3. [ ] Button shows "Analyzing..." with spinner
4. [ ] After 2-5 seconds, analysis result appears
5. [ ] Result shows Status, Risk Level, Confidence

### Test 3: Error Handling
1. [ ] Stop backend server
2. [ ] Click "Analyze" button
3. [ ] Error message appears in red banner
4. [ ] Message includes hint about backend URL
5. [ ] Start backend again - should work

### Test 4: Different Deals
- [ ] Repeat "Test 2" with different deals (001-005)
- [ ] Each should produce different results
- [ ] Chat history per deal should be separate

### Test 5: Error Cases
- [ ] Test with deal that has no messages (001)
- [ ] Test with deal that has high risk (003)
- [ ] Test with deal that needs review

## Response Validation

### Expected Analysis Response Structure
```json
{
  "status": "On Track|Action Needed|Blocked",
  "bottleneck": "Issue description or None",
  "suggested_task": "Action to take",
  "suggested_draft": "Draft communication",
  "risk_level": "Low|Medium|High",
  "confidence_score": 0.85,
  "fingerprints": ["pattern1", "pattern2"],
  "requires_review": false,
  "thread_id": "DEAL-IR-2024-001_abc12345"
}
```

Check in browser DevTools:
1. Open Network tab
2. Filter for "analyze"
3. Click Analyze button
4. Check response matches structure above

## Data Validation

### Verify Data Flow
- [ ] Incoming messages match filters
- [ ] Analysis message added to chat
- [ ] Deal status updates after analysis
- [ ] Risk level color matches status
- [ ] Confidence score percentage displayed

### Check Message Format
```typescript
// Each message should have:
{
  id: string,
  sender: string,
  content: string,
  timestamp: string,
  type: "email" | "chat" | "system",
  dealId: string,
  sentiment: "positive" | "neutral" | "negative"
}
```

## Performance Testing

### Load Time
- [ ] Dashboard loads in < 2 seconds
- [ ] Deal list renders in < 1 second
- [ ] Analysis takes 2-5 seconds

### Memory Usage
- [ ] Check DevTools Memory tab
- [ ] Should not continuously increase
- [ ] No obvious memory leaks in console

### API Response Times
- [ ] `/health` returns in < 100ms
- [ ] `/api/analyze` returns in 2-5 seconds
- [ ] No timeout errors in console

## Browser Compatibility Testing

Test on:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (if on macOS)

Expected: All features work consistently

## Integration Points Verification

Verify these connections work:

1. **Frontend → Backend**
   - [ ] POST /api/analyze connected
   - [ ] Payload formatted correctly
   - [ ] Response parsed correctly
   - [ ] Error handling works

2. **State Management**
   - [ ] Selected deal updates UI
   - [ ] Messages persist during session
   - [ ] Analysis results stored
   - [ ] Error state clears on success

3. **UI Responsiveness**
   - [ ] Button disabled during analysis
   - [ ] Loading spinner shows
   - [ ] Chat scrolls to latest message
   - [ ] Error banner appears

## Cleanup & Restart

### Clear Cache (if issues)
```bash
# Frontend
cd fe
rm -rf node_modules
npm install

# Backend
pip install --upgrade -r requirements.txt
```

### Restart Everything
```bash
# Terminal 1
pkill -f "uvicorn"
# Or Ctrl+C then:
cd be && uvicorn main:app --host 127.0.0.1 --port 8005 --reload

# Terminal 2
cd fe && npm run dev
```

## Troubleshooting Checklist

If tests fail:

- [ ] Backend running on port 8005?
  ```bash
  lsof -i :8005
  ```

- [ ] Frontend running on port 5173?
  ```bash
  lsof -i :5173
  ```

- [ ] Correct CORS headers in backend?
  - Check main.py, should have `allow_origins=["*"]`

- [ ] Environment variables set correctly?
  - Check fe/.env file

- [ ] Dependencies installed completely?
  - Try `npm install` again

- [ ] Network connectivity okay?
  - Try `curl http://localhost:8005/health`

- [ ] Check browser console (F12) for errors

- [ ] Check backend logs for request details

## Sign-Off

After all tests pass:

- [ ] All health checks: ✅
- [ ] Feature tests: ✅
- [ ] Response validation: ✅
- [ ] Data validation: ✅
- [ ] Performance acceptable: ✅
- [ ] No browser console errors: ✅
- [ ] Error handling works: ✅
- [ ] Multiple deals work: ✅

**Integration Status: READY FOR USE** ✅

## Next Steps

1. Deploy backend to production server
2. Update frontend environment variables for prod
3. Implement remaining endpoints:
   - `POST /api/review` (gatekeeper flow)
   - `GET /api/deals/{id}/status` (polling)
   - `POST /api/deals/{id}/ingest` (pre-load context)

4. Add features:
   - Real-time status updates
   - Deal history saving
   - Export functionality
   - Analytics dashboard

## Support & Questions

- **API Issues**: Check `http://localhost:8005/docs`
- **Frontend Issues**: Check browser console (F12)
- **General Help**: See `API_INTEGRATION_GUIDE.md`
- **Code Examples**: See `QUICK_REFERENCE.md`

---

**Last Updated:** March 17, 2026
**Integration Version:** 1.0.0
**Status:** Production Ready ✅

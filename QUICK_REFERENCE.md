# Quick Reference: Using the API Integration

## Analyzing a Deal

### From the UI
1. Select a deal from the "Active Deals" list
2. Click the **"Analyze"** button in the chat panel
3. Watch the results appear in the chat

### Programmatically
```typescript
import { useAnalyzeDeal } from "@/hooks/useApi";

function MyComponent() {
  const { analyze, loading, error, result } = useAnalyzeDeal();

  const handleAnalyze = async () => {
    try {
      const response = await analyze({
        deal_id: "DEAL-IR-2024-001",
        sector: "Metals & Mining",
        parties: "Tata Steel, Severstal",
        messages: [
          {
            sender: "Rajesh Kumar",
            content: "Ready to ship",
            type: "email"
          }
        ]
      });
      console.log(response.status); // "On Track" | "Action Needed" | "Blocked"
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button onClick={handleAnalyze} disabled={loading}>
      {loading ? "Analyzing..." : "Analyze"}
    </button>
  );
}
```

## Getting Deal Status

```typescript
import { useDealStatus } from "@/hooks/useApi";

function StatusChecker() {
  const { fetchStatus, loading, status } = useDealStatus();

  useEffect(() => {
    fetchStatus("DEAL-IR-2024-001");
  }, []);

  if (status?.is_waiting_for_review) {
    return <p>Review required for: {status.state_snapshot.suggested_task}</p>;
  }
}
```

## Reviewing a Task

```typescript
import { useReviewTask } from "@/hooks/useApi";

function ReviewDialog({ threadId }) {
  const { review, loading } = useReviewTask();

  const handleApprove = async () => {
    await review({
      thread_id: threadId,
      action: "approve"
    });
  };

  const handleReject = async () => {
    await review({
      thread_id: threadId,
      action: "reject"
    });
  };

  return (
    <>
      <button onClick={handleApprove} disabled={loading}>Approve</button>
      <button onClick={handleReject} disabled={loading}>Reject</button>
    </>
  );
}
```

## Ingesting Deals

```typescript
import { useIngestDeal } from "@/hooks/useApi";

function IngestButton() {
  const { ingest, loading, success, error } = useIngestDeal();

  const handleIngest = async () => {
    try {
      await ingest("DEAL-IR-2024-001");
      // success will be true
      console.log("Ingestion complete!");
    } catch (err) {
      console.error("Ingest failed:", error);
    }
  };

  return (
    <button onClick={handleIngest} disabled={loading}>
      {loading ? "Ingesting..." : "Ingest Deal"}
    </button>
  );
}
```

## API Response Types

### AnalyzeResponse
```typescript
{
  status: "On Track" | "Action Needed" | "Blocked",
  bottleneck: string,              // ";" separated list
  suggested_task: string,           // Recommended action
  suggested_draft: string,          // Draft communication
  risk_level: "Low" | "Medium" | "High",
  confidence_score: 0.0-1.0,        // 0.92 = 92%
  fingerprints: string[],           // Pattern matches
  requires_review: boolean,         // Needs gatekeeper approval
  thread_id: string                 // For resuming
}
```

### DealStatusResponse
```typescript
{
  deal_id: string,
  current_node: string,             // "completed" | "gatekeeper"
  is_waiting_for_review: boolean,
  state_snapshot: {
    bottlenecks: string[],
    suggested_task: string,
    risk_level: string,
    confidence_score: number,
    fingerprints: string[],
    thread_id: string
  }
}
```

## Error Handling

```typescript
async function analyzeSafely(dealId: string) {
  try {
    const result = await analyze(payload);
    // handle success
  } catch (error) {
    if (error.message.includes("404")) {
      // Deal not found
    } else if (error.message.includes("500")) {
      // Server error - check backend logs
    } else {
      // Network or other error
      // Backend likely not running
    }
  }
}
```

## Environment Setup

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8005
```

### Backend (uvicorn command)
```bash
uvicorn main:app --host 127.0.0.1 --port 8005 --reload
```

## Debugging

### Check Backend Health
```bash
curl http://localhost:8005/health
# Response: {"status":"ok"}
```

### View API Docs
```
http://localhost:8005/docs
```

### Check Browser Console
- Right-click → Inspect → Console tab
- Look for API request logs and errors

### Check Backend Logs
- Watch terminal where backend is running
- Look for "📊 Analyze Deal Request:" logs
- Check for error traces

## Common Issues & Solutions

### "Failed to connect to backend"
**Solution:** Ensure backend is running
```bash
cd be
uvicorn main:app --host 127.0.0.1 --port 8005 --reload
```

### "CORS error"
**Solution:** Backend has CORS enabled, check browser console for actual error

### "Analysis returns empty results"
**Solution:** Check that messages are properly formatted with sender, content, and type

### "Thread ID not found for review"
**Solution:** Ensure you're using the correct thread_id from the analyze response

## Type Checking

All API calls are type-safe:
```typescript
// ✅ Correct
const response = await analyze({
  deal_id: "...",
  sector: "...",
  parties: "...",
  messages: [{ sender: "...", content: "...", type: "email" }]
});

// ❌ TypeScript will error if fields missing or wrong type
```

## Testing the Integration

### 1. Test Backend
```bash
curl -X POST http://localhost:8005/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "deal_id": "TEST-001",
    "sector": "Technology",
    "parties": "Company A, Company B",
    "messages": [{
      "sender": "Alice",
      "content": "Ready to proceed",
      "type": "email"
    }]
  }'
```

### 2. Test Frontend
- Open browser dev tools (F12)
- Go to "Network" tab
- Click "Analyze" on a deal
- Watch the POST request to /api/analyze
- Check response in "Response" tab

### 3. Test Full Flow
1. Start backend: `uvicorn main:app --host 127.0.0.1 --port 8005 --reload`
2. Start frontend: `npm run dev`
3. Select a deal and click "Analyze"
4. Message should appear in chat within 2-5 seconds

## Performance Notes

- Analysis takes 2-5 seconds depending on message count
- Large messages (>10KB) may take longer
- Multiple concurrent requests are handled sequentially
- UI remains responsive during analysis

## Next Features to Implement

- [ ] Real-time status polling with `useDealStatus()`
- [ ] Gatekeeper review flow with `useReviewTask()`
- [ ] Batch ingest all deals on app load
- [ ] Save analysis history to local storage
- [ ] Export analysis reports as PDF
- [ ] Real-time updates with WebSocket

---

**Questions?** Check the full guide: `API_INTEGRATION_GUIDE.md`

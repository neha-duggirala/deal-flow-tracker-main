# API Integration Setup Guide

## Overview
This guide explains how to connect the React Frontend with the FastAPI Backend endpoints.

## Prerequisites
- Node.js 16+ (for frontend)
- Python 3.9+ (for backend)
- Backend running on `http://localhost:8005`

## Backend Setup

### 1. Install Dependencies
```bash
cd be
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
cd be
uvicorn main:app --host 127.0.0.1 --port 8005 --reload
```

The server will start at `http://localhost:8005` with API docs at `http://localhost:8005/docs`

## Frontend Setup

### 1. Install Dependencies
```bash
cd fe
npm install
```

### 2. Configure API URL (Optional)
By default, the frontend looks for the backend at `http://localhost:8005`. To use a different URL:

Create a `.env` file in the `fe` directory:
```env
REACT_APP_API_URL=http://localhost:8005
```

### 3. Start the Development Server
```bash
cd fe
npm run dev
```

The frontend will be available at `http://localhost:5173` (or another port shown in terminal)

## API Endpoints

### Available Endpoints

1. **POST /api/analyze**
   - Analyzes a deal using the multi-agent system
   - Request: `AnalyzeRequest` (deal_id, sector, parties, messages)
   - Response: `AnalyzeResponse` (status, bottleneck, suggested_task, risk_level, confidence_score, etc.)

2. **POST /api/review**
   - Reviews and approves/rejects a gatekeeper task
   - Request: `GatekeeperReviewRequest` (thread_id, action, edited_task?)
   - Response: `GatekeeperReviewResponse` (final_task, is_finalized, status)

3. **GET /api/deals/{deal_id}/status**
   - Retrieves the current status of a deal
   - Response: `GraphStatusResponse` (deal_id, current_node, is_waiting_for_review, state_snapshot)

4. **POST /api/deals/{deal_id}/ingest**
   - Ingests a deal's communications into Qdrant vector DB
   - Response: `IngestResponse` (deal_id, points_created, message)

5. **POST /api/deals/ingest-all**
   - Ingests all deals from synthetic_data.json
   - Response: Object with total_points_created and array of deals

## Frontend Components & Hooks

### API Service (`src/lib/api.ts`)
Provides functions for communicating with the backend:
- `checkHealth()` - Verify backend is running
- `analyzeDeal(payload)` - Send deal for analysis
- `reviewTask(payload)` - Submit review decision
- `getDealStatus(dealId)` - Poll deal status
- `ingestDeal(dealId)` - Ingest specific deal
- `ingestAllDeals()` - Ingest all deals

### Custom Hooks (`src/hooks/useApi.ts`)
Manages API call state and loading:
- `useAnalyzeDeal()` - Manage deal analysis state
- `useIngestDeal()` - Manage ingest state
- `useDealStatus()` - Manage status polling
- `useReviewTask()` - Manage task review state

### Main Page (`src/pages/Index.tsx`)
Integrated with:
- Real API calls to `/api/analyze`
- Error handling and loading states
- Dynamic UI updates based on API responses
- Message streaming from backend

### ChatInput Component (`src/components/ChatInput.tsx`)
Updates:
- Added `isAnalyzing` prop to show loading state
- Disabled state during analysis
- Animated spinner icon

## Data Flow

1. **User selects a deal** → Filters messages for that deal
2. **User clicks "Analyze"** → Frontend calls `/api/analyze` with deal data
3. **Backend processes** → Multi-agent system analyzes deal
4. **Response returned** → Frontend displays results in chat
5. **Deal info updated** → Selected deal status/risk updated based on analysis

## Error Handling

- Network errors display in red error banner
- User-friendly error messages
- Fallback to mock data if backend unavailable
- Console logging for debugging

## Testing the Integration

### 1. Check Backend Health
```bash
curl http://localhost:8005/health
```

### 2. Test Analyze Endpoint
```bash
curl -X POST http://localhost:8005/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "deal_id": "DEAL-IR-2024-001",
    "sector": "Metals & Mining",
    "parties": "Tata Steel, Severstal",
    "messages": [
      {
        "sender": "Rajesh Kumar",
        "content": "Steel export shipment ready",
        "type": "email"
      }
    ]
  }'
```

### 3. Via Frontend UI
1. Navigate to dashboard
2. Select a deal from the list
3. Click "Analyze" button
4. Watch for analysis results in chat panel

## Troubleshooting

### Backend Not Found
- Ensure backend is running: `http://localhost:8005/health`
- Check firewall/security settings
- Verify no other app is using port 8005

### CORS Issues
- Backend has CORS enabled for all origins (`allow_origins=["*"]`)
- Check browser console for specific error messages

### Analysis Fails
- Check backend logs for error details
- Verify messages are properly formatted
- Ensure Qdrant service is running (if required)

### UI Not Updating
- Check browser developer console
- Verify API response format matches types
- Clear browser cache and reload

## Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8005
```

### Backend (config.py / environment)
```env
# Set as needed
QDRANT_URL=http://localhost:6333
LANGCHAIN_API_KEY=your_key
```

## Next Steps

1. ✅ Start backend server
2. ✅ Start frontend dev server
3. ✅ Test health endpoint
4. ✅ Try analyzing a deal
5. ✅ Monitor backend logs for issues
6. ✅ Review API responses in browser dev tools

## Support

For issues or questions:
- Check backend FastAPI docs: `http://localhost:8005/docs`
- Review component implementations in `src/`
- Check `src/lib/api.ts` for API function implementations

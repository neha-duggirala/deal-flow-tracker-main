/**
 * API service for communicating with the DealFlow backend
 * Base URL: http://localhost:8005
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8005";

export interface AnalyzeRequestPayload {
  deal_id: string;
  sector: string;
  parties: string;
  messages: Array<{
    sender: string;
    content: string;
    timestamp?: string;
    type?: string;
  }>;
}

export interface AnalyzeResponsePayload {
  status: string;
  bottleneck: string;
  suggested_task: string;
  suggested_draft: string;
  risk_level: string;
  confidence_score: number;
  fingerprints: string[];
  requires_review: boolean;
  thread_id: string;
}

export interface ReviewRequestPayload {
  thread_id: string;
  action: "approve" | "reject" | "edit";
  edited_task?: string;
}

export interface ReviewResponsePayload {
  final_task: string;
  is_finalized: boolean;
  status: string;
}

export interface DealStatusPayload {
  deal_id: string;
  current_node: string;
  is_waiting_for_review: boolean;
  state_snapshot: {
    bottlenecks: string[];
    suggested_task: string;
    risk_level: string;
    confidence_score: number;
    fingerprints: string[];
    thread_id: string;
  };
}

export interface IngestResponsePayload {
  deal_id: string;
  points_created: number;
  message: string;
}

// Health check
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
};

// Analyze a deal
export const analyzeDeal = async (
  payload: AnalyzeRequestPayload
): Promise<AnalyzeResponsePayload> => {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to analyze deal");
  }

  return response.json();
};

// Review a task (gatekeeper approval/rejection)
export const reviewTask = async (
  payload: ReviewRequestPayload
): Promise<ReviewResponsePayload> => {
  const response = await fetch(`${API_BASE_URL}/api/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to review task");
  }

  return response.json();
};

// Get deal status
export const getDealStatus = async (dealId: string): Promise<DealStatusPayload> => {
  const response = await fetch(`${API_BASE_URL}/api/deals/${dealId}/status`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch deal status");
  }

  return response.json();
};

// Ingest a specific deal
export const ingestDeal = async (dealId: string): Promise<IngestResponsePayload> => {
  const response = await fetch(`${API_BASE_URL}/api/deals/${dealId}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to ingest deal");
  }

  return response.json();
};

// Ingest all deals
export const ingestAllDeals = async (): Promise<{
  total_points_created: number;
  deals: Array<{
    deal_id: string;
    messages_ingested: number;
  }>;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/deals/ingest-all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to ingest all deals");
  }

  return response.json();
};

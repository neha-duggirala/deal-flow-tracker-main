import { useState, useCallback } from "react";
import {
  analyzeDeal,
  ingestDeal,
  getDealStatus,
  reviewTask,
  type AnalyzeRequestPayload,
  type AnalyzeResponsePayload,
  type ReviewRequestPayload,
} from "@/lib/api";

interface UseAnalyzeState {
  loading: boolean;
  error: string | null;
  result: AnalyzeResponsePayload | null;
  threadId: string | null;
}

export const useAnalyzeDeal = () => {
  const [state, setState] = useState<UseAnalyzeState>({
    loading: false,
    error: null,
    result: null,
    threadId: null,
  });

  const analyze = useCallback(
    async (payload: AnalyzeRequestPayload) => {
      setState({ loading: true, error: null, result: null, threadId: null });
      try {
        const result = await analyzeDeal(payload);
        setState({
          loading: false,
          error: null,
          result,
          threadId: result.thread_id,
        });
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({
          loading: false,
          error: errorMessage,
          result: null,
          threadId: null,
        });
        throw error;
      }
    },
    []
  );

  return { ...state, analyze };
};

interface UseIngestState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export const useIngestDeal = () => {
  const [state, setState] = useState<UseIngestState>({
    loading: false,
    error: null,
    success: false,
  });

  const ingest = useCallback(async (dealId: string) => {
    setState({ loading: true, error: null, success: false });
    try {
      await ingestDeal(dealId);
      setState({ loading: false, error: null, success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setState({
        loading: false,
        error: errorMessage,
        success: false,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return { ...state, ingest, reset };
};

interface UseDealStatusState {
  loading: boolean;
  error: string | null;
  status: any | null;
  isWaitingForReview: boolean;
}

export const useDealStatus = () => {
  const [state, setState] = useState<UseDealStatusState>({
    loading: false,
    error: null,
    status: null,
    isWaitingForReview: false,
  });

  const fetchStatus = useCallback(async (dealId: string) => {
    setState({ loading: true, error: null, status: null, isWaitingForReview: false });
    try {
      const status = await getDealStatus(dealId);
      setState({
        loading: false,
        error: null,
        status,
        isWaitingForReview: status.is_waiting_for_review,
      });
      return status;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setState({
        loading: false,
        error: errorMessage,
        status: null,
        isWaitingForReview: false,
      });
      throw error;
    }
  }, []);

  return { ...state, fetchStatus };
};

interface UseReviewTaskState {
  loading: boolean;
  error: string | null;
  result: any | null;
}

export const useReviewTask = () => {
  const [state, setState] = useState<UseReviewTaskState>({
    loading: false,
    error: null,
    result: null,
  });

  const review = useCallback(async (payload: ReviewRequestPayload) => {
    setState({ loading: true, error: null, result: null });
    try {
      const result = await reviewTask(payload);
      setState({
        loading: false,
        error: null,
        result,
      });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setState({
        loading: false,
        error: errorMessage,
        result: null,
      });
      throw error;
    }
  }, []);

  return { ...state, review };
};

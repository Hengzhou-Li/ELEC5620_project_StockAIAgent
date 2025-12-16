import type { ApiHistoryPart } from '@/store/chartStore';

export interface StockHistoryPoint {
  date: string;
  price: number;
}

export interface StockPredictionPoint {
  date: string;
  predictedPrice: number;
}

export interface FunctionCallResult {
  name: string;
  data: {
    symbol?: string;
    history?: StockHistoryPoint[];
    predictions?: StockPredictionPoint[];
  };
}

export interface ChatApiResponse {
  reply: string;
  history: ApiHistoryPart[];
  functionCallCount: number;
  functionCallResult?: FunctionCallResult | null;
  conversationId?: string;
}


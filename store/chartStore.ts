// store/chartStore.ts
import { create } from 'zustand';

// This type definition is shared across multiple components (Chatbox, ChatMessages)
export interface ApiHistoryPart {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Type definition for a single point of data in our chart
interface ChartDataPoint {
  date: string;
  price?: number;
  predictedPrice?: number;
}

// Defines the entire shape of our global application state
interface AppState {
  // Chart-related state
  ticker: string | null;
  chartData: ChartDataPoint[];
  setChartData: (data: { ticker: string; data: ChartDataPoint[] }) => void;
  
  // Chat history state
  history: ApiHistoryPart[];
  setHistory: (history: ApiHistoryPart[]) => void;
}

// 【FIX】The hook is now correctly named and exported as 'useAppStore'
export const useAppStore = create<AppState>((set) => ({
  // Initial state values when the app loads
  ticker: null,
  chartData: [],
  history: [
    { role: 'model', parts: [{ text: "Hello! I'm your financial assistant. May I ask how I can assist you?" }] }
  ],

  // Actions that can modify the state
  setChartData: (data) => set({ 
    ticker: data.ticker, 
    chartData: data.data 
  }),
  
  setHistory: (history) => set({ history }),
}));
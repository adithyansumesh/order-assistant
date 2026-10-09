export interface ToolCallSummary {
  tool_name: string;
  arguments: Record<string, any>;
  summary: string;
  record_count?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCallSummary[];
  timestamp: string;
  error?: string | null;
}

export interface HealthStatus {
  status: string;
  dataset_loaded: boolean;
  total_orders: number;
  version: string;
}

export interface StatsData {
  total_orders: number;
  total_recorded_value_inr: number;
  realized_revenue_inr: number;
  cancelled_orders_count: number;
  cancelled_value_inr: number;
  returned_orders_count: number;
  pending_orders_count: number;
  orders_by_status: Record<string, number>;
  orders_by_category: Record<string, number>;
  orders_by_city: Record<string, number>;
  date_range: {
    start: string;
    end: string;
  };
}

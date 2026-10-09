export interface ToolCallSummary {
  tool_name: string;
  arguments: Record<string, any>;
  summary: string;
  record_count?: number;
  duration_ms?: number;
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
  top_customers?: Array<{
    rank: number;
    name: string;
    spent: string;
    orders: number;
    tier: string;
    city: string;
  }>;
}

export type WorkspaceTab =
  | "ai-assistant"
  | "order-insights"
  | "order-explorer"
  | "data-management"
  | "tool-inspector"
  | "settings";

export interface CsvValidationResult {
  valid: boolean;
  filename: string;
  file_size_bytes: number;
  total_rows: number;
  columns: string[];
  missing_columns: string[];
  internal_duplicates: string[];
  existing_duplicates: string[];
  errors: string[];
  warnings: string[];
  preview_rows: Record<string, string>[];
}

export interface CsvImportResult {
  success: boolean;
  mode: "append" | "replace";
  records_added: number;
  records_skipped: number;
  records_rejected: number;
  total_records: number;
  backup_created?: string | null;
  message: string;
  error?: string;
}

export interface OrderItem {
  order_id: string;
  customer_name: string;
  city: string;
  product: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  order_date: string;
  delivery_date: string;
  status: "delivered" | "shipped" | "processing" | "cancelled" | "returned";
}

export interface AppSettings {
  voiceLanguage: string;
  audioFeedback: boolean;
  reducedMotion: boolean;
}

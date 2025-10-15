export interface ApiKey {
  id: number;
  key: string;
  name: string;
  limit_per_minute: number;
  limit_per_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApiKeyRequest {
  name: string;
  limit_per_minute: number;
  limit_per_day: number;
}

export interface RequestLog {
  id: number;
  api_key_id: number;
  timestamp: Date;
  endpoint: string;
  status_code: number;
}

export interface UsageStats {
  api_key: string;
  name: string;
  requests_this_minute: number;
  requests_today: number;
  limit_per_minute: number;
  limit_per_day: number;
}

// Protected API - Third-party APIs that admins configure
export interface ProtectedApi {
  id: number;
  name: string;
  slug: string;
  target_url: string;
  description?: string;
  http_methods: string[];
  default_headers: Record<string, string>;
  requires_auth: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProtectedApiRequest {
  name: string;
  slug: string;
  target_url: string;
  description?: string;
  http_methods?: string[];
  default_headers?: Record<string, string>;
  requires_auth?: boolean;
}

// API Key Endpoint - Links API keys to specific APIs with custom limits
export interface ApiKeyEndpoint {
  id: number;
  api_key_id: number;
  protected_api_id: number;
  limit_per_minute: number;
  limit_per_day: number;
  created_at: Date;
}

export interface CreateApiKeyEndpointRequest {
  api_key_id: number;
  protected_api_id: number;
  limit_per_minute: number;
  limit_per_day: number;
}

// Proxy Request Log - Enhanced logging for proxied requests
export interface ProxyRequestLog {
  id: number;
  api_key_id: number;
  protected_api_id: number;
  method: string;
  path: string;
  query_params?: string;
  request_headers?: Record<string, string>;
  request_body?: string;
  response_status?: number;
  response_time_ms?: number;
  rate_limited: boolean;
  error_message?: string;
  timestamp: Date;
}

// Enhanced usage stats with per-endpoint breakdown
export interface EndpointUsageStats {
  api_key: string;
  api_key_name: string;
  protected_api_id: number;
  protected_api_name: string;
  protected_api_slug: string;
  requests_this_minute: number;
  requests_today: number;
  limit_per_minute: number;
  limit_per_day: number;
}

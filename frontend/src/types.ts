export interface ApiKey {
  id: number;
  key: string;
  name: string;
  limit_per_minute: number;
  limit_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  api_key: string;
  name: string;
  requests_this_minute: number;
  requests_today: number;
  limit_per_minute: number;
  limit_per_day: number;
}

export interface CreateApiKeyRequest {
  name: string;
  limit_per_minute: number;
  limit_per_day: number;
}

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
  created_at: string;
  updated_at: string;
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

export interface ApiKeyEndpoint {
  id: number;
  api_key_id: number;
  protected_api_id: number;
  limit_per_minute: number;
  limit_per_day: number;
  created_at: string;
  api_name?: string;
  api_slug?: string;
  target_url?: string;
  description?: string;
}

export interface LinkApiKeyRequest {
  api_key_id: number;
  protected_api_id: number;
  limit_per_minute: number;
  limit_per_day: number;
}

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

import { useState, useEffect } from 'react';
import './App.css';
import type {
  ApiKey,
  UsageStats,
  CreateApiKeyRequest,
  ProtectedApi,
  CreateProtectedApiRequest,
  ApiKeyEndpoint,
  LinkApiKeyRequest,
  EndpointUsageStats
} from './types';

const API_BASE_URL = 'http://localhost:3001';

type Tab = 'api-keys' | 'protected-apis' | 'link-endpoints' | 'endpoint-stats';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('api-keys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [protectedApis, setProtectedApis] = useState<ProtectedApi[]>([]);
  const [endpointStats, setEndpointStats] = useState<EndpointUsageStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyLimitPerMinute, setNewKeyLimitPerMinute] = useState('50');
  const [newKeyLimitPerDay, setNewKeyLimitPerDay] = useState('1000');

  // Protected API form state
  const [newApiName, setNewApiName] = useState('');
  const [newApiSlug, setNewApiSlug] = useState('');
  const [newApiTargetUrl, setNewApiTargetUrl] = useState('');
  const [newApiDescription, setNewApiDescription] = useState('');

  // Link endpoint form state
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<number | ''>('');
  const [selectedProtectedApiId, setSelectedProtectedApiId] = useState<number | ''>('');
  const [linkLimitPerMinute, setLinkLimitPerMinute] = useState('10');
  const [linkLimitPerDay, setLinkLimitPerDay] = useState('1000');

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/keys`);
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/keys/stats`);
      if (!response.ok) throw new Error('Failed to fetch usage stats');
      const data = await response.json();
      setUsageStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchProtectedApis = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/protected-apis`);
      if (!response.ok) throw new Error('Failed to fetch protected APIs');
      const data = await response.json();
      setProtectedApis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchEndpointStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/protected-apis/stats/endpoints`);
      if (!response.ok) throw new Error('Failed to fetch endpoint stats');
      const data = await response.json();
      setEndpointStats(data);
    } catch (err) {
      console.error('Error fetching endpoint stats:', err);
    }
  };

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: CreateApiKeyRequest = {
        name: newKeyName,
        limit_per_minute: parseInt(newKeyLimitPerMinute),
        limit_per_day: parseInt(newKeyLimitPerDay),
      };

      const response = await fetch(`${API_BASE_URL}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create API key');

      setNewKeyName('');
      setNewKeyLimitPerMinute('50');
      setNewKeyLimitPerDay('1000');
      await fetchApiKeys();
      await fetchUsageStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      await fetchApiKeys();
      await fetchUsageStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createProtectedApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: CreateProtectedApiRequest = {
        name: newApiName,
        slug: newApiSlug,
        target_url: newApiTargetUrl,
        description: newApiDescription || undefined,
        http_methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default_headers: {},
        requires_auth: false,
      };

      const response = await fetch(`${API_BASE_URL}/api/protected-apis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create protected API');
      }

      setNewApiName('');
      setNewApiSlug('');
      setNewApiTargetUrl('');
      setNewApiDescription('');
      await fetchProtectedApis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteProtectedApi = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this protected API?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/protected-apis/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete protected API');

      await fetchProtectedApis();
      await fetchEndpointStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const linkApiKeyToEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: LinkApiKeyRequest = {
        api_key_id: selectedApiKeyId as number,
        protected_api_id: selectedProtectedApiId as number,
        limit_per_minute: parseInt(linkLimitPerMinute),
        limit_per_day: parseInt(linkLimitPerDay),
      };

      const response = await fetch(`${API_BASE_URL}/api/protected-apis/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to link API key to endpoint');

      setSelectedApiKeyId('');
      setSelectedProtectedApiId('');
      setLinkLimitPerMinute('10');
      setLinkLimitPerDay('1000');
      await fetchEndpointStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchUsageStats();
    fetchProtectedApis();
    fetchEndpointStats();

    // Auto-refresh stats every 5 seconds
    const interval = setInterval(() => {
      fetchUsageStats();
      fetchEndpointStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getUsageForKey = (key: string): UsageStats | undefined => {
    return usageStats.find((stat) => stat.api_key === key);
  };

  const getPercentage = (current: number, limit: number): number => {
    return Math.min((current / limit) * 100, 100);
  };

  const getColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  return (
    <div className="app">
      <header>
        <h1>🚀 API Rate Limiter & Proxy Gateway</h1>
        <p>Manage API keys, protect third-party APIs, and monitor usage in real-time</p>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'api-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          🔑 API Keys
        </button>
        <button
          className={`tab ${activeTab === 'protected-apis' ? 'active' : ''}`}
          onClick={() => setActiveTab('protected-apis')}
        >
          🌐 Protected APIs
        </button>
        <button
          className={`tab ${activeTab === 'link-endpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('link-endpoints')}
        >
          🔗 Link Endpoints
        </button>
        <button
          className={`tab ${activeTab === 'endpoint-stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('endpoint-stats')}
        >
          📊 Endpoint Statistics
        </button>
      </div>

      <div className="container">
        {activeTab === 'api-keys' && (
          <>
            <section className="create-key-section">
              <h2>Create New API Key</h2>
              <form onSubmit={createApiKey}>
                <div className="form-group">
                  <label htmlFor="name">Key Name</label>
                  <input
                    id="name"
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Mobile App"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="limitMinute">Limit per Minute</label>
                    <input
                      id="limitMinute"
                      type="number"
                      value={newKeyLimitPerMinute}
                      onChange={(e) => setNewKeyLimitPerMinute(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="limitDay">Limit per Day</label>
                    <input
                      id="limitDay"
                      type="number"
                      value={newKeyLimitPerDay}
                      onChange={(e) => setNewKeyLimitPerDay(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating...' : 'Create API Key'}
                </button>
              </form>
            </section>

            <section className="keys-section">
              <h2>API Keys & Usage Statistics</h2>
              {apiKeys.length === 0 ? (
                <p className="empty-state">No API keys yet. Create one above to get started.</p>
              ) : (
                <div className="keys-list">
                  {apiKeys.map((key) => {
                    const usage = getUsageForKey(key.key);
                    const minutePercentage = usage
                      ? getPercentage(usage.requests_this_minute, key.limit_per_minute)
                      : 0;
                    const dayPercentage = usage
                      ? getPercentage(usage.requests_today, key.limit_per_day)
                      : 0;

                    return (
                      <div key={key.id} className="key-card">
                        <div className="key-header">
                          <h3>{key.name}</h3>
                          <button
                            onClick={() => deleteApiKey(key.id)}
                            className="btn-delete"
                            title="Delete key"
                          >
                            🗑️
                          </button>
                        </div>

                        <div className="key-value">
                          <code>{key.key}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(key.key)}
                            className="btn-copy"
                            title="Copy to clipboard"
                          >
                            📋
                          </button>
                        </div>

                        <div className="usage-stats">
                          <div className="stat">
                            <div className="stat-header">
                              <span>Requests This Minute</span>
                              <span className={getColorClass(minutePercentage)}>
                                {usage?.requests_this_minute || 0} / {key.limit_per_minute}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className={`progress-fill ${getColorClass(minutePercentage)}`}
                                style={{ width: `${minutePercentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="stat">
                            <div className="stat-header">
                              <span>Requests Today</span>
                              <span className={getColorClass(dayPercentage)}>
                                {usage?.requests_today || 0} / {key.limit_per_day}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className={`progress-fill ${getColorClass(dayPercentage)}`}
                                style={{ width: `${dayPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="key-meta">
                          <small>Created: {new Date(key.created_at).toLocaleString()}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'protected-apis' && (
          <>
            <section className="create-key-section">
              <h2>Create Protected API</h2>
              <p className="section-description">
                Register a third-party API to protect it with rate limiting via the proxy gateway.
              </p>
              <form onSubmit={createProtectedApi}>
                <div className="form-group">
                  <label htmlFor="apiName">API Name</label>
                  <input
                    id="apiName"
                    type="text"
                    value={newApiName}
                    onChange={(e) => setNewApiName(e.target.value)}
                    placeholder="e.g., JSONPlaceholder API"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="apiSlug">Slug (URL-friendly identifier)</label>
                  <input
                    id="apiSlug"
                    type="text"
                    value={newApiSlug}
                    onChange={(e) => setNewApiSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="e.g., jsonplaceholder"
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <small>Use lowercase letters, numbers, and hyphens only</small>
                </div>

                <div className="form-group">
                  <label htmlFor="apiTargetUrl">Target URL</label>
                  <input
                    id="apiTargetUrl"
                    type="url"
                    value={newApiTargetUrl}
                    onChange={(e) => setNewApiTargetUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    required
                  />
                  <small>The base URL of the third-party API</small>
                </div>

                <div className="form-group">
                  <label htmlFor="apiDescription">Description (optional)</label>
                  <textarea
                    id="apiDescription"
                    value={newApiDescription}
                    onChange={(e) => setNewApiDescription(e.target.value)}
                    placeholder="Brief description of this API..."
                    rows={3}
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creating...' : 'Create Protected API'}
                </button>
              </form>
            </section>

            <section className="keys-section">
              <h2>Protected APIs</h2>
              {protectedApis.length === 0 ? (
                <p className="empty-state">
                  No protected APIs yet. Create one above to start proxying requests.
                </p>
              ) : (
                <div className="keys-list">
                  {protectedApis.map((api) => (
                    <div key={api.id} className="key-card">
                      <div className="key-header">
                        <h3>{api.name}</h3>
                        <button
                          onClick={() => deleteProtectedApi(api.id)}
                          className="btn-delete"
                          title="Delete protected API"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="api-details">
                        <div className="detail-row">
                          <strong>Slug:</strong>
                          <code>{api.slug}</code>
                        </div>
                        <div className="detail-row">
                          <strong>Target URL:</strong>
                          <code className="url">{api.target_url}</code>
                        </div>
                        <div className="detail-row">
                          <strong>Proxy URL:</strong>
                          <code className="url">{API_BASE_URL}/proxy/{api.slug}/*</code>
                        </div>
                        {api.description && (
                          <div className="detail-row">
                            <strong>Description:</strong>
                            <span>{api.description}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <strong>HTTP Methods:</strong>
                          <span>{api.http_methods.join(', ')}</span>
                        </div>
                      </div>

                      <div className="key-meta">
                        <small>Created: {new Date(api.created_at).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'link-endpoints' && (
          <section className="create-key-section">
            <h2>Link API Key to Protected API</h2>
            <p className="section-description">
              Grant an API key access to a protected API with custom rate limits.
            </p>
            <form onSubmit={linkApiKeyToEndpoint}>
              <div className="form-group">
                <label htmlFor="selectApiKey">Select API Key</label>
                <select
                  id="selectApiKey"
                  value={selectedApiKeyId}
                  onChange={(e) => setSelectedApiKeyId(e.target.value ? parseInt(e.target.value) : '')}
                  required
                >
                  <option value="">-- Select an API Key --</option>
                  {apiKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({key.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="selectProtectedApi">Select Protected API</label>
                <select
                  id="selectProtectedApi"
                  value={selectedProtectedApiId}
                  onChange={(e) => setSelectedProtectedApiId(e.target.value ? parseInt(e.target.value) : '')}
                  required
                >
                  <option value="">-- Select a Protected API --</option>
                  {protectedApis.map((api) => (
                    <option key={api.id} value={api.id}>
                      {api.name} ({api.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="linkLimitMinute">Limit per Minute</label>
                  <input
                    id="linkLimitMinute"
                    type="number"
                    value={linkLimitPerMinute}
                    onChange={(e) => setLinkLimitPerMinute(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="linkLimitDay">Limit per Day</label>
                  <input
                    id="linkLimitDay"
                    type="number"
                    value={linkLimitPerDay}
                    onChange={(e) => setLinkLimitPerDay(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Linking...' : 'Link API Key to Endpoint'}
              </button>
            </form>

            <div className="info-box" style={{ marginTop: '2rem' }}>
              <h3>How to Use:</h3>
              <ol>
                <li>Create an API key in the "API Keys" tab</li>
                <li>Create a protected API in the "Protected APIs" tab</li>
                <li>Link them together here with custom rate limits</li>
                <li>Make requests to: <code>{API_BASE_URL}/proxy/[slug]/[path]</code></li>
              </ol>
              <p>
                <strong>Example:</strong>
                <br />
                <code>curl -H "x-api-key: YOUR_KEY" {API_BASE_URL}/proxy/jsonplaceholder/posts/1</code>
              </p>
            </div>
          </section>
        )}

        {activeTab === 'endpoint-stats' && (
          <section className="keys-section">
            <h2>Per-Endpoint Usage Statistics</h2>
            <p className="section-description">
              Real-time statistics for each API key's access to protected APIs.
            </p>
            {endpointStats.length === 0 ? (
              <p className="empty-state">
                No endpoint statistics yet. Link API keys to protected APIs to see usage data.
              </p>
            ) : (
              <div className="keys-list">
                {endpointStats.map((stat, index) => {
                  const minutePercentage = getPercentage(
                    stat.requests_this_minute,
                    stat.limit_per_minute
                  );
                  const dayPercentage = getPercentage(
                    stat.requests_today,
                    stat.limit_per_day
                  );

                  return (
                    <div key={`${stat.api_key}-${stat.protected_api_id}-${index}`} className="key-card">
                      <div className="key-header">
                        <h3>
                          {stat.api_key_name} → {stat.protected_api_name}
                        </h3>
                      </div>

                      <div className="api-details">
                        <div className="detail-row">
                          <strong>API Slug:</strong>
                          <code>{stat.protected_api_slug}</code>
                        </div>
                        <div className="detail-row">
                          <strong>Proxy URL:</strong>
                          <code className="url">
                            {API_BASE_URL}/proxy/{stat.protected_api_slug}/*
                          </code>
                        </div>
                      </div>

                      <div className="usage-stats">
                        <div className="stat">
                          <div className="stat-header">
                            <span>Requests This Minute</span>
                            <span className={getColorClass(minutePercentage)}>
                              {stat.requests_this_minute} / {stat.limit_per_minute}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className={`progress-fill ${getColorClass(minutePercentage)}`}
                              style={{ width: `${minutePercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-header">
                            <span>Requests Today</span>
                            <span className={getColorClass(dayPercentage)}>
                              {stat.requests_today} / {stat.limit_per_day}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className={`progress-fill ${getColorClass(dayPercentage)}`}
                              style={{ width: `${dayPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default App;

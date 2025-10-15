import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const initDatabase = async () => {
  try {
    // API Keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        limit_per_minute INTEGER NOT NULL,
        limit_per_day INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Protected APIs table - Third-party APIs that admins configure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protected_apis (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        target_url TEXT NOT NULL,
        description TEXT,
        http_methods TEXT[] DEFAULT ARRAY['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default_headers JSONB DEFAULT '{}',
        requires_auth BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // API Key Endpoints - Links API keys to specific APIs with custom limits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_key_endpoints (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
        protected_api_id INTEGER REFERENCES protected_apis(id) ON DELETE CASCADE,
        limit_per_minute INTEGER NOT NULL,
        limit_per_day INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(api_key_id, protected_api_id)
      );
    `);

    // Enhanced request logs for proxied requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proxy_request_logs (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
        protected_api_id INTEGER REFERENCES protected_apis(id) ON DELETE CASCADE,
        method VARCHAR(10) NOT NULL,
        path TEXT,
        query_params TEXT,
        request_headers JSONB,
        request_body TEXT,
        response_status INTEGER,
        response_time_ms INTEGER,
        rate_limited BOOLEAN DEFAULT false,
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Legacy request logs table (keep for backward compatibility)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        endpoint VARCHAR(255),
        status_code INTEGER
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_api_key_endpoints_api_key
      ON api_key_endpoints(api_key_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_api_key_endpoints_protected_api
      ON api_key_endpoints(protected_api_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proxy_logs_timestamp
      ON proxy_request_logs(timestamp);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_proxy_logs_api_key
      ON proxy_request_logs(api_key_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_protected_apis_slug
      ON protected_apis(slug);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

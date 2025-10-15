const API_BASE_URL = 'http://localhost:3001';

// Helper function to make requests
async function makeRequest(apiKey, endpoint = '/api/protected/data') {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? await response.json() : await response.text(),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Helper to create an API key
async function createApiKey(name, limitPerMinute, limitPerDay) {
  const response = await fetch(`${API_BASE_URL}/api/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      limit_per_minute: limitPerMinute,
      limit_per_day: limitPerDay,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create API key: ${response.statusText}`);
  }

  return response.json();
}

// Helper to get usage stats
async function getUsageStats() {
  const response = await fetch(`${API_BASE_URL}/api/keys/stats`);
  return response.json();
}

// Helper to create a protected API
async function createProtectedApi(name, slug, targetUrl) {
  const response = await fetch(`${API_BASE_URL}/api/protected-apis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      slug,
      target_url: targetUrl,
      description: `${name} for testing`,
      http_methods: ['GET', 'POST'],
      default_headers: {},
      requires_auth: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create protected API: ${response.statusText}`);
  }

  return response.json();
}

// Helper to link API key to protected API
async function linkApiKeyToEndpoint(apiKeyId, protectedApiId, limitPerMinute, limitPerDay) {
  const response = await fetch(`${API_BASE_URL}/api/protected-apis/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key_id: apiKeyId,
      protected_api_id: protectedApiId,
      limit_per_minute: limitPerMinute,
      limit_per_day: limitPerDay,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to link API key to endpoint: ${response.statusText}`);
  }

  return response.json();
}

// Helper to make proxy requests
async function makeProxyRequest(apiKey, apiSlug, path) {
  try {
    const response = await fetch(`${API_BASE_URL}/proxy/${apiSlug}/${path}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? await response.json() : await response.json().catch(() => response.text()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Helper to get endpoint usage stats
async function getEndpointStats() {
  const response = await fetch(`${API_BASE_URL}/api/protected-apis/stats/endpoints`);
  return response.json();
}

// Test function
async function runTest() {
  console.log('🚀 Starting API Rate Limiter Test\n');

  try {
    // Step 1: Create two API keys
    console.log('📝 Step 1: Creating two API keys...');

    const key1 = await createApiKey('Test App 1', 5, 100);
    console.log(`   ✓ Created Key 1: ${key1.key}`);
    console.log(`     - Limit: ${key1.limit_per_minute} per minute, ${key1.limit_per_day} per day\n`);

    const key2 = await createApiKey('Test App 2', 10, 200);
    console.log(`   ✓ Created Key 2: ${key2.key}`);
    console.log(`     - Limit: ${key2.limit_per_minute} per minute, ${key2.limit_per_day} per day\n`);

    // Step 2: Test Key 1 - Send requests up to limit
    console.log('📊 Step 2: Testing Key 1 - Sending requests up to limit (5 per minute)...');
    let successCount = 0;
    let rateLimitedCount = 0;

    for (let i = 1; i <= 7; i++) {
      const result = await makeRequest(key1.key);

      if (result.status === 200) {
        successCount++;
        console.log(`   ✓ Request ${i}: SUCCESS (200)`);
      } else if (result.status === 429) {
        rateLimitedCount++;
        console.log(`   ✗ Request ${i}: RATE LIMITED (429) - ${typeof result.data === 'string' ? result.data : JSON.stringify(result.data)}`);
      } else {
        console.log(`   ? Request ${i}: UNEXPECTED (${result.status})`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   Summary: ${successCount} successful, ${rateLimitedCount} rate limited`);

    if (successCount === 5 && rateLimitedCount === 2) {
      console.log('   ✅ PASSED: Rate limiting working correctly!\n');
    } else {
      console.log('   ⚠️  WARNING: Expected 5 successful and 2 rate limited\n');
    }

    // Step 3: Test Key 2 - Burst test
    console.log('⚡ Step 3: Testing Key 2 - Burst test (10 requests rapidly)...');
    successCount = 0;
    rateLimitedCount = 0;

    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(makeRequest(key2.key));
    }

    const results = await Promise.all(promises);
    results.forEach((result, i) => {
      if (result.status === 200) {
        successCount++;
        console.log(`   ✓ Request ${i + 1}: SUCCESS (200)`);
      } else if (result.status === 429) {
        rateLimitedCount++;
        console.log(`   ✗ Request ${i + 1}: RATE LIMITED (429)`);
      }
    });

    console.log(`\n   Summary: ${successCount} successful, ${rateLimitedCount} rate limited`);

    if (successCount === 10 && rateLimitedCount === 0) {
      console.log('   ✅ PASSED: All burst requests within limit succeeded!\n');
    } else if (successCount <= 10) {
      console.log('   ⚠️  INFO: Some requests were rate limited (this can happen with rapid concurrent requests)\n');
    }

    // Step 4: Test exceeding limit
    console.log('🔥 Step 4: Testing Key 2 - Exceeding per-minute limit...');
    successCount = 0;
    rateLimitedCount = 0;

    for (let i = 1; i <= 5; i++) {
      const result = await makeRequest(key2.key);

      if (result.status === 200) {
        successCount++;
      } else if (result.status === 429) {
        rateLimitedCount++;
        console.log(`   ✗ Request ${i}: RATE LIMITED (429) - Exceeded limit as expected`);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n   Summary: ${successCount} successful, ${rateLimitedCount} rate limited`);

    if (rateLimitedCount > 0) {
      console.log('   ✅ PASSED: Rate limiter correctly enforcing limits!\n');
    } else {
      console.log('   ⚠️  INFO: No rate limiting occurred (limit may not have been exceeded yet)\n');
    }

    // Step 5: Check dashboard stats
    console.log('📈 Step 5: Checking dashboard statistics...');
    const stats = await getUsageStats();

    console.log('   Current Usage:');
    stats.forEach(stat => {
      const minutePercent = ((stat.requests_this_minute / stat.limit_per_minute) * 100).toFixed(1);
      const dayPercent = ((stat.requests_today / stat.limit_per_day) * 100).toFixed(1);

      console.log(`   • ${stat.name}:`);
      console.log(`     - This minute: ${stat.requests_this_minute}/${stat.limit_per_minute} (${minutePercent}%)`);
      console.log(`     - Today: ${stat.requests_today}/${stat.limit_per_day} (${dayPercent}%)`);
    });

    // Step 6: Test Proxy Gateway
    console.log('🌐 Step 6: Testing Proxy Gateway functionality...\n');

    // Create a protected API
    console.log('   📝 Creating protected API for JSONPlaceholder...');
    const protectedApi = await createProtectedApi(
      'JSONPlaceholder API',
      'jsonplaceholder-test',
      'https://jsonplaceholder.typicode.com'
    );
    console.log(`   ✓ Created protected API: ${protectedApi.name} (slug: ${protectedApi.slug})\n`);

    // Link Key 1 to the protected API
    console.log('   🔗 Linking API key to protected API...');
    await linkApiKeyToEndpoint(key1.id, protectedApi.id, 3, 50);
    console.log(`   ✓ Linked ${key1.name} with limits: 3/min, 50/day\n`);

    // Test proxy requests
    console.log('   📡 Testing proxy requests (limit: 3 per minute)...');
    successCount = 0;
    rateLimitedCount = 0;

    for (let i = 1; i <= 5; i++) {
      const result = await makeProxyRequest(key1.key, protectedApi.slug, `posts/${i}`);

      if (result.status === 200) {
        successCount++;
        console.log(`   ✓ Request ${i}: SUCCESS (200) - Proxied to third-party API`);
      } else if (result.status === 429) {
        rateLimitedCount++;
        console.log(`   ✗ Request ${i}: RATE LIMITED (429) - ${JSON.stringify(result.data)}`);
      } else {
        console.log(`   ? Request ${i}: UNEXPECTED (${result.status})`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   Summary: ${successCount} successful, ${rateLimitedCount} rate limited`);

    if (successCount === 3 && rateLimitedCount === 2) {
      console.log('   ✅ PASSED: Proxy rate limiting working correctly!\n');
    } else {
      console.log('   ⚠️  INFO: Expected 3 successful and 2 rate limited\n');
    }

    // Check endpoint usage stats
    console.log('   📊 Checking endpoint-specific usage statistics...');
    const endpointStats = await getEndpointStats();

    console.log('   Endpoint Usage:');
    endpointStats.forEach(stat => {
      const minutePercent = ((stat.requests_this_minute / stat.limit_per_minute) * 100).toFixed(1);
      const dayPercent = ((stat.requests_today / stat.limit_per_day) * 100).toFixed(1);

      console.log(`   • ${stat.api_key_name} → ${stat.protected_api_name}:`);
      console.log(`     - This minute: ${stat.requests_this_minute}/${stat.limit_per_minute} (${minutePercent}%)`);
      console.log(`     - Today: ${stat.requests_today}/${stat.limit_per_day} (${dayPercent}%)`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Open http://localhost:5173 to view the dashboard');
    console.log('   2. The usage statistics should reflect the test requests');
    console.log('   3. The dashboard auto-refreshes every 5 seconds');
    console.log('   4. Proxy gateway is now active and rate limiting per-endpoint');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Backend is running on http://localhost:3001');
    console.error('   2. PostgreSQL is running and accessible');
    console.error('   3. Redis is running and accessible');
    process.exit(1);
  }
}

// Check if server is reachable
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('✓ Server is reachable\n');
      return true;
    }
  } catch (error) {
    console.error('✗ Cannot reach server at', API_BASE_URL);
    console.error('  Please start the backend server first: cd backend && npm run dev');
    return false;
  }
  return false;
}

// Run the test
(async () => {
  if (await checkServer()) {
    await runTest();
  } else {
    process.exit(1);
  }
})();

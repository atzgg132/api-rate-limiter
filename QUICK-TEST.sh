#!/bin/bash

# Quick Test Script for Proxy Gateway
# This script helps you test the complete flow

echo "============================================================"
echo "🚀 PROXY GATEWAY QUICK TEST"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API key is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: API key required${NC}"
    echo ""
    echo "Usage: ./QUICK-TEST.sh YOUR_API_KEY"
    echo ""
    echo "Steps to get an API key:"
    echo "1. Open http://localhost:5173"
    echo "2. Go to 'API Keys' tab"
    echo "3. Create a new API key"
    echo "4. Copy the key and run this script again"
    echo ""
    exit 1
fi

API_KEY=$1

echo -e "${YELLOW}📋 Testing with API Key: ${API_KEY}${NC}"
echo ""

# Test 1: Health check on external API
echo -e "${YELLOW}Test 1: External API Health Check${NC}"
echo "→ curl http://localhost:4000/health"
curl -s http://localhost:4000/health | jq .
echo ""

# Test 2: Get users through proxy
echo -e "${YELLOW}Test 2: Get Users (Proxied)${NC}"
echo "→ curl -H 'x-api-key: $API_KEY' http://localhost:3001/proxy/my-shop/users"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" http://localhost:3001/proxy/my-shop/users)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (200)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}❌ Failed ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 3: Get specific product
echo -e "${YELLOW}Test 3: Get Product #1 (Proxied)${NC}"
echo "→ curl -H 'x-api-key: $API_KEY' http://localhost:3001/proxy/my-shop/products/1"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" http://localhost:3001/proxy/my-shop/products/1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (200)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}❌ Failed ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 4: Get statistics
echo -e "${YELLOW}Test 4: Get Statistics (Proxied)${NC}"
echo "→ curl -H 'x-api-key: $API_KEY' http://localhost:3001/proxy/my-shop/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" http://localhost:3001/proxy/my-shop/stats)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (200)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}❌ Failed ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 5: Rate limiting test
echo -e "${YELLOW}Test 5: Rate Limiting Test (5 rapid requests)${NC}"
echo "→ Making 5 requests rapidly to test rate limit..."
echo ""

for i in {1..5}; do
    echo "Request $i:"
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "x-api-key: $API_KEY" http://localhost:3001/proxy/my-shop/users)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}✅ Success (200)${NC}"
    elif [ "$HTTP_CODE" = "429" ]; then
        echo -e "  ${RED}⛔ Rate Limited (429)${NC}"
        BODY=$(echo "$RESPONSE" | sed '$d')
        echo "$BODY" | jq .
    else
        echo -e "  ${YELLOW}⚠️  Other ($HTTP_CODE)${NC}"
    fi

    # Small delay between requests
    sleep 0.2
done
echo ""

# Test 6: Endpoint statistics
echo -e "${YELLOW}Test 6: View Endpoint Statistics${NC}"
echo "→ curl http://localhost:3001/api/protected-apis/stats/endpoints"
curl -s http://localhost:3001/api/protected-apis/stats/endpoints | jq .
echo ""

echo "============================================================"
echo -e "${GREEN}✅ Test Complete!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173"
echo "2. Go to 'Endpoint Statistics' tab"
echo "3. Watch the stats update in real-time!"
echo ""

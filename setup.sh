#!/bin/bash

# API Rate Limiter & Proxy Gateway - Setup Script
# This script will set up the entire project automatically

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BOLD}${MAGENTA}============================================================${NC}"
    echo -e "${BOLD}${MAGENTA}$1${NC}"
    echo -e "${BOLD}${MAGENTA}============================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BOLD}${CYAN}➜ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
print_header "🚀 API RATE LIMITER & PROXY GATEWAY - SETUP"

echo -e "${BOLD}This script will:${NC}"
echo "  1. Check system prerequisites"
echo "  2. Install all dependencies"
echo "  3. Set up environment variables"
echo "  4. Start Docker services (PostgreSQL & Redis)"
echo "  5. Initialize the database"
echo "  6. Start all services"
echo "  7. Provide testing instructions"
echo ""
read -p "Press Enter to continue..."

# Step 1: Check Prerequisites
print_header "📋 STEP 1: Checking Prerequisites"

print_step "Checking Node.js..."
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"
else
    print_error "Node.js is not installed!"
    print_info "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

print_step "Checking npm..."
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm is installed: v$NPM_VERSION"
else
    print_error "npm is not installed!"
    exit 1
fi

print_step "Checking Docker..."
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker is installed: $DOCKER_VERSION"
else
    print_error "Docker is not installed!"
    print_info "Please install Docker from: https://www.docker.com/get-started"
    exit 1
fi

print_step "Checking Docker Compose..."
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    print_success "Docker Compose is available"
else
    print_error "Docker Compose is not available!"
    print_info "Please install Docker Compose"
    exit 1
fi

# Step 2: Install Dependencies
print_header "📦 STEP 2: Installing Dependencies"

print_step "Installing backend dependencies..."
cd backend
npm install
print_success "Backend dependencies installed"
cd ..

print_step "Installing frontend dependencies..."
cd frontend
npm install
print_success "Frontend dependencies installed"
cd ..

print_step "Installing external API dependencies..."
cd external-api
npm install
print_success "External API dependencies installed"
cd ..

# Step 3: Environment Setup
print_header "⚙️  STEP 3: Setting Up Environment Variables"

if [ ! -f "backend/.env" ]; then
    print_step "Creating backend/.env file..."
    cat > backend/.env << 'EOF'
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rate_limiter
REDIS_URL=redis://localhost:6379
EOF
    print_success "Created backend/.env file"
else
    print_info "backend/.env already exists, skipping..."
fi

# Step 4: Start Docker Services
print_header "🐳 STEP 4: Starting Docker Services"

print_step "Starting PostgreSQL and Redis containers..."
docker-compose up -d

print_step "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_success "PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start in time"
        exit 1
    fi
    echo -n "."
    sleep 1
done

print_step "Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Redis failed to start in time"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Step 5: Verify Setup
print_header "✅ STEP 5: Verifying Setup"

print_step "Checking Docker containers..."
docker-compose ps

print_success "All Docker services are running!"

# Step 6: Final Instructions
print_header "🎉 SETUP COMPLETE!"

echo -e "${BOLD}${GREEN}Your API Rate Limiter & Proxy Gateway is ready to use!${NC}"
echo ""
echo -e "${BOLD}${CYAN}Next Steps:${NC}"
echo ""

echo -e "${BOLD}1. Start the Backend Server:${NC}"
echo -e "   ${YELLOW}cd backend && npm run dev${NC}"
echo ""

echo -e "${BOLD}2. Start the Frontend Dashboard (in a new terminal):${NC}"
echo -e "   ${YELLOW}cd frontend && npm run dev${NC}"
echo ""

echo -e "${BOLD}3. Start the External API for Testing (in a new terminal):${NC}"
echo -e "   ${YELLOW}cd external-api && npm start${NC}"
echo ""

echo -e "${BOLD}${CYAN}Quick Start URLs:${NC}"
echo -e "   📊 Dashboard: ${GREEN}http://localhost:5173${NC}"
echo -e "   🔧 Backend API: ${GREEN}http://localhost:3001${NC}"
echo -e "   🌐 External API: ${GREEN}http://localhost:4000${NC}"
echo ""

echo -e "${BOLD}${CYAN}Testing the System:${NC}"
echo ""
echo -e "   1. Open ${GREEN}http://localhost:5173${NC} in your browser"
echo -e "   2. Go to ${CYAN}API Keys${NC} tab and create a new API key"
echo -e "   3. Go to ${CYAN}Protected APIs${NC} tab and create:"
echo -e "      - Name: ${YELLOW}My Shop API${NC}"
echo -e "      - Slug: ${YELLOW}my-shop${NC}"
echo -e "      - Target URL: ${YELLOW}http://localhost:4000${NC}"
echo -e "   4. Go to ${CYAN}Link Endpoints${NC} tab and link your key to the API"
echo -e "   5. Test with curl:"
echo -e "      ${YELLOW}curl -H \"x-api-key: YOUR_KEY\" http://localhost:3001/proxy/my-shop/users${NC}"
echo ""

echo -e "${BOLD}${CYAN}Documentation:${NC}"
echo -e "   📖 Step-by-Step Guide: ${YELLOW}STEP-BY-STEP-GUIDE.md${NC}"
echo -e "   📚 Complete Overview: ${YELLOW}COMPLETE-SYSTEM-OVERVIEW.md${NC}"
echo -e "   📋 Main README: ${YELLOW}README.md${NC}"
echo ""

echo -e "${BOLD}${CYAN}Useful Commands:${NC}"
echo -e "   • Run automated tests: ${YELLOW}node test-rate-limiter.js${NC}"
echo -e "   • Quick test script: ${YELLOW}./QUICK-TEST.sh YOUR_API_KEY${NC}"
echo -e "   • Stop Docker services: ${YELLOW}docker-compose down${NC}"
echo -e "   • View Docker logs: ${YELLOW}docker-compose logs -f${NC}"
echo ""

print_header "💡 PRO TIP"
echo -e "${CYAN}Open 3 terminal windows:${NC}"
echo -e "  Terminal 1: ${YELLOW}cd backend && npm run dev${NC}"
echo -e "  Terminal 2: ${YELLOW}cd frontend && npm run dev${NC}"
echo -e "  Terminal 3: ${YELLOW}cd external-api && npm start${NC}"
echo ""
echo -e "${GREEN}Then visit http://localhost:5173 and start testing! 🚀${NC}"
echo ""

# Ask if user wants to start services automatically
echo ""
read -p "Do you want to start all services now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_header "🚀 Starting All Services"

    print_step "Starting Backend (in background)..."
    cd backend
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    print_success "Backend started (PID: $BACKEND_PID)"
    cd ..

    print_step "Starting Frontend (in background)..."
    cd frontend
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    print_success "Frontend started (PID: $FRONTEND_PID)"
    cd ..

    print_step "Starting External API (in background)..."
    cd external-api
    npm start > ../logs/external-api.log 2>&1 &
    EXTERNAL_PID=$!
    print_success "External API started (PID: $EXTERNAL_PID)"
    cd ..

    sleep 5

    print_success "All services are starting up!"
    echo ""
    echo -e "${BOLD}${GREEN}View logs:${NC}"
    echo -e "  Backend: ${YELLOW}tail -f logs/backend.log${NC}"
    echo -e "  Frontend: ${YELLOW}tail -f logs/frontend.log${NC}"
    echo -e "  External API: ${YELLOW}tail -f logs/external-api.log${NC}"
    echo ""
    echo -e "${BOLD}${CYAN}Open your browser:${NC}"
    echo -e "  ${GREEN}http://localhost:5173${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to view process IDs to stop services${NC}"
    echo ""
    read -p "Press Enter to view PIDs..."
    echo ""
    echo -e "${BOLD}To stop services, use these commands:${NC}"
    echo -e "  kill $BACKEND_PID    # Stop backend"
    echo -e "  kill $FRONTEND_PID   # Stop frontend"
    echo -e "  kill $EXTERNAL_PID   # Stop external API"
    echo -e "  docker-compose down  # Stop Docker services"
    echo ""
else
    print_info "Skipping automatic service start"
    echo -e "${YELLOW}Start services manually using the commands above${NC}"
fi

print_header "✨ ENJOY YOUR API RATE LIMITER! ✨"

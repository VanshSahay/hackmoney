#!/bin/bash

# Run three MPC nodes locally for testing
# Usage: ./scripts/run-local-network.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🔐 MPC LOCAL NETWORK LAUNCHER 🔐                     ║${NC}"
echo -e "${GREEN}║     Starting 3 MPC Nodes for Local Testing                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ Error: pnpm is not installed${NC}"
    echo "Please install pnpm: npm install -g pnpm"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from packages/node directory${NC}"
    exit 1
fi

# Check if .env exists and warn
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file exists${NC}"
    echo "Environment variables from .env will be overridden by command line args"
    echo ""
fi

# Set common blockchain config
export RPC_URL=${RPC_URL:-http://localhost:8545}
export CHAIN_ID=${CHAIN_ID:-31337}
export HOOK_ADDRESS=${HOOK_ADDRESS:-0x0000000000000000000000000000000000000000}
export SETTLEMENT_ADDRESS=${SETTLEMENT_ADDRESS:-0x0000000000000000000000000000000000000000}

echo -e "${BLUE}📋 Network Configuration:${NC}"
echo "  RPC URL: $RPC_URL"
echo "  Chain ID: $CHAIN_ID"
echo "  Hook Address: $HOOK_ADDRESS"
echo "  Settlement Address: $SETTLEMENT_ADDRESS"
echo ""

# Create log directory
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}📝 Logs will be written to: $LOG_DIR/${NC}"
echo ""

# Function to run a node
run_node() {
    local node_name=$1
    local peers=$2
    local log_file="$LOG_DIR/${node_name}.log"
    
    echo -e "${GREEN}🚀 Starting $node_name...${NC}"
    
    NODE_NAME="$node_name" \
    PEERS="$peers" \
    RPC_URL="$RPC_URL" \
    CHAIN_ID="$CHAIN_ID" \
    HOOK_ADDRESS="$HOOK_ADDRESS" \
    SETTLEMENT_ADDRESS="$SETTLEMENT_ADDRESS" \
    pnpm dev > "$log_file" 2>&1 &
    
    local pid=$!
    echo "$pid" > "$LOG_DIR/${node_name}.pid"
    echo -e "${GREEN}  ✅ $node_name started (PID: $pid)${NC}"
    echo -e "${BLUE}  📄 Log: tail -f $log_file${NC}"
}

# Start the nodes
echo -e "${YELLOW}Starting nodes...${NC}"
echo ""

run_node "alice.eth" "bob.eth,charlie.eth"
sleep 2

run_node "bob.eth" "alice.eth,charlie.eth"
sleep 2

run_node "charlie.eth" "alice.eth,bob.eth"
sleep 2

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ ALL NODES STARTED                        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 Monitor logs:${NC}"
echo "  tail -f $LOG_DIR/alice.eth.log"
echo "  tail -f $LOG_DIR/bob.eth.log"
echo "  tail -f $LOG_DIR/charlie.eth.log"
echo ""

echo -e "${BLUE}🛑 Stop all nodes:${NC}"
echo "  ./scripts/stop-local-network.sh"
echo ""

echo -e "${YELLOW}💡 Tip: Watch all logs in separate terminals with:${NC}"
echo "  tail -f $LOG_DIR/*.log"
echo ""

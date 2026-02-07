#!/bin/bash

# Stop all local MPC nodes
# Usage: ./scripts/stop-local-network.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping MPC local network...${NC}"
echo ""

LOG_DIR="logs"

if [ ! -d "$LOG_DIR" ]; then
    echo -e "${RED}❌ No log directory found. Are any nodes running?${NC}"
    exit 1
fi

# Function to stop a node
stop_node() {
    local node_name=$1
    local pid_file="$LOG_DIR/${node_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}🛑 Stopping $node_name (PID: $pid)...${NC}"
            kill "$pid" 2>/dev/null || true
            sleep 1
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}  ⚠️  Force killing $node_name...${NC}"
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            echo -e "${GREEN}  ✅ $node_name stopped${NC}"
        else
            echo -e "${YELLOW}  ℹ️  $node_name already stopped${NC}"
        fi
        rm "$pid_file"
    else
        echo -e "${YELLOW}  ℹ️  No PID file for $node_name${NC}"
    fi
}

# Stop all nodes
stop_node "alice.eth"
stop_node "bob.eth"
stop_node "charlie.eth"

echo ""
echo -e "${GREEN}✅ All nodes stopped${NC}"
echo ""

# Ask to clean up logs
read -p "$(echo -e ${YELLOW}Delete log files? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "$LOG_DIR"/*.log
    echo -e "${GREEN}✅ Logs deleted${NC}"
else
    echo -e "${BLUE}ℹ️  Logs preserved in $LOG_DIR/${NC}"
fi

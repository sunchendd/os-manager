#!/bin/bash
pkill -f "dist/server.js" 2>/dev/null
sleep 1
cd /root/os-manager/backend
export PATH="/root/.opencode/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
nohup node dist/server.js > /tmp/os-manager.log 2>&1 &
echo "started pid $!"

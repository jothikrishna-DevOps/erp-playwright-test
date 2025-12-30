# Agent Configuration for EC2 Deployment

This guide explains how to configure your local agent to connect to the backend running on EC2.

## Prerequisites

- Agent is installed on your local machine
- EC2 backend is deployed and accessible
- You have the EC2 DNS name or IP address

## Configuration Steps

### 1. Update Agent Environment Variables

Create or update `agent/.env` file:

```env
BACKEND_URL=http://<EC2-DNS>
WS_URL=ws://<EC2-DNS>/ws
```

**Replace `<EC2-DNS>` with your actual EC2 DNS name or IP.**

Examples:
- `http://ec2-54-123-45-67.compute-1.amazonaws.com`
- `http://54.123.45.67` (if using IP)
- `https://playwright.example.com` (if using custom domain with HTTPS)

### 2. For HTTPS/WSS

If your EC2 instance uses HTTPS, update the URLs:

```env
BACKEND_URL=https://<EC2-DNS>
WS_URL=wss://<EC2-DNS>/ws
```

### 3. Start the Agent

```bash
cd agent
npm run dev
```

You should see:
```
📡 Connecting to backend: http://<EC2-DNS>
🔌 Connecting to WebSocket: ws://<EC2-DNS>/ws
✅ WebSocket connected
✅ Agent registration confirmed
```

## Troubleshooting

### Agent cannot connect to EC2

1. **Check EC2 Security Group**
   - Ensure port 80 (HTTP) is open
   - Ensure port 443 (HTTPS) is open if using SSL
   - Ensure port 22 (SSH) is open for your IP

2. **Check EC2 DNS/IP**
   - Verify the EC2 DNS name is correct
   - Test connectivity: `curl http://<EC2-DNS>/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

3. **Check Firewall**
   - Ensure your local firewall allows outbound connections
   - Check if corporate firewall blocks WebSocket connections

4. **Check nginx Configuration**
   - Verify `/ws` endpoint is configured in nginx
   - Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

### WebSocket Connection Fails

1. **Test WebSocket manually:**
   ```bash
   # Install wscat: npm install -g wscat
   wscat -c ws://<EC2-DNS>/ws
   ```

2. **Check nginx WebSocket configuration:**
   - Ensure `proxy_set_header Upgrade $http_upgrade;` is set
   - Ensure `proxy_set_header Connection "upgrade";` is set
   - Check nginx error logs

3. **Check backend WebSocket server:**
   - Verify backend is running: `pm2 status`
   - Check backend logs: `pm2 logs playwright-backend`

### Connection Timeout

1. **Check network latency:**
   ```bash
   ping <EC2-DNS>
   ```

2. **Increase timeout in agent (if needed):**
   - Modify `agent/src/agent-client.ts` connection timeout
   - Default is usually sufficient

## Security Notes

- **Never commit `.env` files** with real EC2 URLs to version control
- Use environment variables or secure configuration management
- Consider using VPN or private network for internal deployments
- For production, use HTTPS/WSS instead of HTTP/WS

## Testing Connection

After configuration, test the connection:

1. Start the agent
2. Check agent logs for connection status
3. In the EC2 backend, check connected agents:
   ```bash
   curl http://localhost:3005/api/agents
   ```
4. Your agent should appear in the list with status "connected"

## Multiple Agents

You can run multiple agents from different machines. Each agent will:
- Generate its own unique agent ID
- Connect independently to the EC2 backend
- Receive commands when tests are initiated from the UI


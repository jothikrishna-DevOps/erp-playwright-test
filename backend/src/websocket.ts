import { WebSocketServer, WebSocket } from 'ws';
import { dbRun, dbGet, dbAll } from './db';
import { WSMessage, AgentRegisterMessage, AgentStatusMessage } from '../../shared/types';

interface ConnectedAgent {
  ws: WebSocket;
  agentId: string;
  lastHeartbeat: Date;
}

const connectedAgents = new Map<string, ConnectedAgent>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');

    let agentId: string | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'agent:register':
            const registerMsg = message as AgentRegisterMessage;
            agentId = registerMsg.agentId;

            // Check if agent exists
            const agent = await dbGet<any>(
              'SELECT * FROM agents WHERE id = ?',
              [registerMsg.agentId]
            );

            if (!agent) {
              // Auto-create agent if it doesn't exist
              await dbRun(
                `INSERT INTO agents (id, name, token, status)
                 VALUES (?, ?, ?, 'connected')`,
                [registerMsg.agentId, registerMsg.name || `Agent-${registerMsg.agentId.substring(0, 8)}`, registerMsg.token]
              );
              console.log(`Created new agent: ${registerMsg.agentId}`);
            } else if (agent.token !== registerMsg.token) {
              // Update token if different
              await dbRun(
                `UPDATE agents SET token = ?, status = 'connected', last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
                [registerMsg.token, registerMsg.agentId]
              );
              console.log(`Updated token for agent: ${registerMsg.agentId}`);
            } else {
              // Agent exists with correct token, just update status
              await dbRun(
                `UPDATE agents SET status = 'connected', last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
                [registerMsg.agentId]
              );
            }

            // Register agent in connected agents map
            connectedAgents.set(agentId, {
              ws,
              agentId,
              lastHeartbeat: new Date()
            });

            ws.send(JSON.stringify({
              type: 'agent:registered',
              message: 'Agent registered successfully'
            }));

            console.log(`Agent ${agentId} connected`);
            break;

          case 'agent:status':
            const statusMsg = message as AgentStatusMessage;
            if (agentId) {
              // Update agent status
              await dbRun(
                `UPDATE agents 
                 SET current_test_id = ?, last_seen = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [statusMsg.testId || null, agentId]
              );

              // Update test status if testId provided
              if (statusMsg.testId) {
                await dbRun(
                  'UPDATE tests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [statusMsg.status === 'recording' ? 'recording' : 
                   statusMsg.status === 'running' ? 'running' : 'ready',
                   statusMsg.testId]
                );
              }

              // Broadcast to UI clients (if we add UI WebSocket support)
              broadcastToUI({
                type: 'test:update',
                testId: statusMsg.testId,
                status: statusMsg.status,
                message: statusMsg.message
              });
            }
            break;

          case 'agent:heartbeat':
            if (agentId) {
              const agent = connectedAgents.get(agentId);
              if (agent) {
                agent.lastHeartbeat = new Date();
                await dbRun(
                  'UPDATE agents SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                  [agentId]
                );
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', async () => {
      if (agentId) {
        connectedAgents.delete(agentId);
        await dbRun(
          'UPDATE agents SET status = ? WHERE id = ?',
          ['disconnected', agentId]
        );
        console.log(`Agent ${agentId} disconnected`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Cleanup disconnected agents (heartbeat timeout)
  setInterval(() => {
    const now = new Date();
    for (const [id, agent] of connectedAgents.entries()) {
      const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > 60000) { // 60 seconds timeout
        console.log(`Agent ${id} heartbeat timeout, disconnecting`);
        agent.ws.close();
        connectedAgents.delete(id);
        dbRun(
          'UPDATE agents SET status = ? WHERE id = ?',
          ['disconnected', id]
        );
      }
    }
  }, 30000); // Check every 30 seconds
}

export function broadcastToAgents(message: WSMessage) {
  for (const agent of connectedAgents.values()) {
    if (agent.ws.readyState === WebSocket.OPEN) {
      agent.ws.send(JSON.stringify(message));
    }
  }
}

export function sendToAgent(agentId: string, message: WSMessage) {
  const agent = connectedAgents.get(agentId);
  if (agent && agent.ws.readyState === WebSocket.OPEN) {
    agent.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// UI WebSocket clients (for real-time updates)
const uiClients = new Set<WebSocket>();

export function addUIClient(ws: WebSocket) {
  uiClients.add(ws);
  ws.on('close', () => {
    uiClients.delete(ws);
  });
}

function broadcastToUI(message: WSMessage) {
  for (const client of uiClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}


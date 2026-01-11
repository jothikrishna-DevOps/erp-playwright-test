import { AgentClient } from './agent-client';
import { loadConfig, saveConfig } from './config';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Starting Playwright Agent...\n');

  // Load or create agent configuration
  let config = loadConfig();
  
  if (!config.agentId) {
    config.agentId = uuidv4();
    // Add "docker" prefix to agent name if running in Docker (for easy identification)
    const namePrefix = process.env.DOCKER === 'true' ? 'docker' : os.hostname();
    config.name = `${namePrefix}-${config.agentId.substring(0, 8)}`;
    saveConfig(config);
    console.log(`✅ Generated new agent ID: ${config.agentId}`);
  }

  // Ensure name is set (should always be set at this point)
  if (!config.name) {
    const namePrefix = process.env.DOCKER === 'true' ? 'docker' : os.hostname();
    config.name = `${namePrefix}-${config.agentId.substring(0, 8)}`;
    saveConfig(config);
  }

  if (!config.token) {
    // In production, this should be provided securely
    // For now, generate a simple token
    config.token = uuidv4();
    saveConfig(config);
    console.log(`✅ Generated new agent token`);
  }

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3005';
  const wsUrl = process.env.WS_URL || 'ws://localhost:3005';

  // Ensure name is set (should always be set at this point)
  if (!config.name) {
    const namePrefix = process.env.DOCKER === 'true' ? 'docker' : os.hostname();
    config.name = `${namePrefix}-${config.agentId!.substring(0, 8)}`;
    saveConfig(config);
  }

  console.log(`📡 Connecting to backend: ${backendUrl}`);
  console.log(`🆔 Agent ID: ${config.agentId}`);
  console.log(`📝 Agent Name: ${config.name}\n`);

  // Create and start agent client
  const client = new AgentClient({
    agentId: config.agentId!,
    token: config.token!,
    name: config.name!,
    backendUrl,
    wsUrl
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down agent...');
    client.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down agent...');
    client.disconnect();
    process.exit(0);
  });

  // Start the agent
  await client.connect();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


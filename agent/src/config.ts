import fs from 'fs';
import path from 'path';

// Support configurable config path for Docker (via AGENT_CONFIG_PATH env var)
// Defaults to current working directory for backward compatibility
const CONFIG_DIR = process.env.AGENT_CONFIG_PATH 
  ? path.dirname(process.env.AGENT_CONFIG_PATH)
  : process.cwd();
const CONFIG_FILE = process.env.AGENT_CONFIG_PATH 
  ? process.env.AGENT_CONFIG_PATH
  : path.join(process.cwd(), 'agent-config.json');

export interface AgentConfig {
  agentId?: string;
  token?: string;
  name?: string;
}

export function loadConfig(): AgentConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load config:', error);
  }
  return {};
}

export function saveConfig(config: AgentConfig): void {
  try {
    // Ensure config directory exists (important for Docker volumes)
    if (process.env.AGENT_CONFIG_PATH && !fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}


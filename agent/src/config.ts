import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'agent-config.json');

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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}


import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  skills: string[];
  environment: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

const DATA_DIR = path.join(__dirname, '../../data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAgents(): AgentConfig[] {
  try {
    if (!fs.existsSync(AGENTS_FILE)) return [];
    const raw = fs.readFileSync(AGENTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAgents(agents: AgentConfig[]) {
  ensureDataDir();
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');
}

export class AgentManager {
  private agents: AgentConfig[] = [];

  constructor() {
    this.agents = loadAgents();
  }

  list(): AgentConfig[] {
    return this.agents;
  }

  get(id: string): AgentConfig | undefined {
    return this.agents.find(a => a.id === id);
  }

  create(data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): AgentConfig {
    const agent: AgentConfig = {
      ...data,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.agents.push(agent);
    saveAgents(this.agents);
    return agent;
  }

  update(id: string, data: Partial<Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>>): AgentConfig | null {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.agents[idx] = {
      ...this.agents[idx],
      ...data,
      updatedAt: Date.now(),
    };
    saveAgents(this.agents);
    return this.agents[idx];
  }

  delete(id: string): boolean {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.agents.splice(idx, 1);
    saveAgents(this.agents);
    return true;
  }
}

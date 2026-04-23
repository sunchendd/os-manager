import type { Session, Message } from '../types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSessions(): Session[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return [];
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  constructor() {
    const loaded = loadSessions();
    for (const s of loaded) {
      this.sessions.set(s.id, s);
    }
  }

  private persist() {
    saveSessions(this.listSessions());
  }

  createSession(): Session {
    const session: Session = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.persist();
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = Date.now();
      this.persist();
    }
  }

  getMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.updatedAt = Date.now();
      this.persist();
    }
  }

  deleteSession(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    if (result) this.persist();
    return result;
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

import type { Session, Message } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  createSession(): Session {
    const session: Session = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(session.id, session);
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
    }
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

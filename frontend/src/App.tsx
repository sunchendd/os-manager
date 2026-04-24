import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, RiskAssessment, Session } from '../../shared/types';
import { ChatPanel } from './components/ChatPanel';
import { RiskConfirmModal } from './components/RiskConfirmModal';
import { SystemDashboard } from './components/SystemDashboard';
import { SystemInfoPanel } from './components/SystemInfoPanel';
import { OptimizationPanel } from './components/OptimizationPanel';
import { SkillMarketplace } from './components/SkillMarketplace';
import { ServicesPanel } from './components/ServicesPanel';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { AgentPanel } from './components/AgentPanel';
import { ScheduledTasksPanel } from './components/ScheduledTasksPanel';
import { LoginPage } from './components/LoginPage';
import {
  Server, Terminal, Settings, Zap, Puzzle, Layers, Bot, Clock, LogOut
} from 'lucide-react';

const ACTIVE_SESSION_KEY = 'os-manager-active-session';
const AUTH_TOKEN_KEY = 'os-manager-token';

export interface OpenCodeEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'text' | 'done' | 'error';
  data?: any;
  text?: string;
  tool?: string;
  command?: string;
  output?: string;
  error?: string;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatState, setChatState] = useState<{
    sessions: Record<string, Session>;
    activeSessionId: string;
  }>({ sessions: {}, activeSessionId: '' });
  const [typingSessions, setTypingSessions] = useState<Record<string, boolean>>({});
  const [riskConfirm, setRiskConfirm] = useState<{
    show: boolean;
    assessment: RiskAssessment | null;
  }>({ show: false, assessment: null });
  const [activePanel, setActivePanel] = useState<'chat' | 'dashboard' | 'system' | 'optimize' | 'skills' | 'services' | 'agents' | 'scheduled'>('chat');

  // 认证状态
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Opencode 状态
  const [opencodeAvailable, setOpencodeAvailable] = useState(false);
  const [opencodeStreams, setOpencodeStreams] = useState<Record<string, OpenCodeEvent[]>>({});

  // Agent 状态
  interface AgentConfig {
    id: string;
    name: string;
    description: string;
    instructions: string;
    model: string;
    skills: string[];
    environment: Record<string, string>;
  }
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const activeMessages = chatState.activeSessionId
    ? chatState.sessions[chatState.activeSessionId]?.messages || []
    : [];
  const isTyping = chatState.activeSessionId ? !!typingSessions[chatState.activeSessionId] : false;
  const activeStream = chatState.activeSessionId ? opencodeStreams[chatState.activeSessionId] || [] : [];

  // 认证检查
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/check', {
          headers: { 'x-auth-token': token },
        });
        const data = await res.json();
        if (data.authenticated) {
          setAuthToken(token);
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthToken(null);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken(null);
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // 全局 fetch 拦截：自动添加认证头
  useEffect(() => {
    if (!authToken) return;
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const newInit = init || {};
      const headers = new Headers(newInit.headers || {});
      if (!headers.has('x-auth-token') && authToken) {
        headers.set('x-auth-token', authToken);
      }
      return originalFetch(input, { ...newInit, headers });
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    const newSocket = io(window.location.origin, {
      extraHeaders: { 'x-auth-token': authToken },
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('已连接到服务器');
      // 先获取已有会话列表，由 sessions_list 决定恢复或创建
      newSocket.emit('list_sessions');
      // 检测 opencode 可用性
      fetch('/api/health')
        .then(r => r.json())
        .then(data => {
          if (data.opencode) setOpencodeAvailable(true);
        })
        .catch(() => {});
    });

    newSocket.on('session_created', (data: { sessionId: string }) => {
      setChatState(prev => ({
        sessions: {
          ...prev.sessions,
          [data.sessionId]: {
            id: data.sessionId,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        activeSessionId: data.sessionId,
      }));
      try { localStorage.setItem(ACTIVE_SESSION_KEY, data.sessionId); } catch {}
    });

    newSocket.on('sessions_list', (data: { sessions: Session[] }) => {
      if (data.sessions.length > 0) {
        const sessionsMap: Record<string, Session> = {};
        for (const session of data.sessions) {
          sessionsMap[session.id] = session;
        }

        let targetId = '';
        try {
          const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
          if (saved && sessionsMap[saved]) {
            targetId = saved;
          }
        } catch {}

        if (!targetId) {
          const sorted = [...data.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
          targetId = sorted[0].id;
        }

        // 如果目标会话本来就是空的，直接复用，不创建新的
        const targetSession = sessionsMap[targetId];
        if (targetSession && targetSession.messages.length === 0) {
          setChatState({ sessions: sessionsMap, activeSessionId: targetId });
          // 空会话不需要 switch_session（已经在服务器上）
        } else {
          setChatState({ sessions: sessionsMap, activeSessionId: targetId });
          newSocket.emit('switch_session', { sessionId: targetId });
        }
      } else {
        // 服务器上没有会话，才创建新的
        newSocket.emit('create_session');
      }
    });

    newSocket.on('session_switched', (data: { sessionId: string; messages: Message[] }) => {
      setChatState(prev => ({
        sessions: {
          ...prev.sessions,
          [data.sessionId]: {
            ...prev.sessions[data.sessionId],
            id: data.sessionId,
            messages: data.messages,
          },
        },
        activeSessionId: data.sessionId,
      }));
    });

    newSocket.on('message', (data: { sessionId: string; message: Message }) => {
      setChatState(prev => {
        const session = prev.sessions[data.sessionId];
        if (!session) return prev;
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [data.sessionId]: {
              ...session,
              messages: [...session.messages, data.message],
              updatedAt: Date.now(),
            },
          },
        };
      });
    });

    newSocket.on('typing', (data: { sessionId: string; typing: boolean }) => {
      setTypingSessions(prev => ({ ...prev, [data.sessionId]: data.typing }));
    });

    newSocket.on('risk_confirm', (data: { sessionId: string; risk: RiskAssessment }) => {
      setRiskConfirm({ show: true, assessment: data.risk });
    });

    newSocket.on('session_cleared', (data: { sessionId: string }) => {
      setChatState(prev => {
        const session = prev.sessions[data.sessionId];
        if (!session) return prev;
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [data.sessionId]: {
              ...session,
              messages: [],
              updatedAt: Date.now(),
            },
          },
        };
      });
    });

    // Opencode 流式事件
    newSocket.on('opencode_event', (data: { sessionId: string; event: OpenCodeEvent }) => {
      setOpencodeStreams(prev => ({
        ...prev,
        [data.sessionId]: [...(prev[data.sessionId] || []), data.event],
      }));
    });

    newSocket.on('opencode_done', (data: { sessionId: string }) => {
      // 3秒后清理流
      setTimeout(() => {
        setOpencodeStreams(prev => {
          const next = { ...prev };
          delete next[data.sessionId];
          return next;
        });
      }, 5000);
    });

    newSocket.on('session_deleted', (data: { sessionId: string; success: boolean }) => {
      if (!data.success) return;
      let nextActiveId = '';
      let shouldCreateNew = false;
      setChatState(prev => {
        const nextSessions = { ...prev.sessions };
        delete nextSessions[data.sessionId];
        if (prev.activeSessionId === data.sessionId) {
          const remaining = Object.keys(nextSessions);
          if (remaining.length > 0) {
            nextActiveId = remaining[0];
            try { localStorage.setItem(ACTIVE_SESSION_KEY, nextActiveId); } catch {}
            return { sessions: nextSessions, activeSessionId: nextActiveId };
          }
          shouldCreateNew = true;
          try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch {}
          return { sessions: nextSessions, activeSessionId: '' };
        }
        return { ...prev, sessions: nextSessions };
      });
      if (nextActiveId) {
        newSocket.emit('switch_session', { sessionId: nextActiveId });
      } else if (shouldCreateNew) {
        setTimeout(() => newSocket.emit('create_session'), 0);
      }
    });

    newSocket.on('error', (data: { message: string }) => {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ 错误: ${data.message}`,
        type: 'error',
        timestamp: Date.now(),
      };
      setChatState(prev => {
        const session = prev.sessions[prev.activeSessionId];
        if (!session) return prev;
        return {
          ...prev,
          sessions: {
            ...prev.sessions,
            [prev.activeSessionId]: {
              ...session,
              messages: [...session.messages, errorMsg],
              updatedAt: Date.now(),
            },
          },
        };
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSendMessage = (content: string, agentId?: string) => {
    if (!socket || !chatState.activeSessionId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setChatState(prev => {
      const session = prev.sessions[prev.activeSessionId];
      if (!session) return prev;
      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [prev.activeSessionId]: {
            ...session,
            messages: [...session.messages, userMsg],
            updatedAt: Date.now(),
          },
        },
      };
    });

    if (opencodeAvailable) {
      socket.emit('send_message_opencode', {
        sessionId: chatState.activeSessionId,
        message: content,
        agentId: agentId || null,
      });
    } else {
      socket.emit('send_message', {
        sessionId: chatState.activeSessionId,
        message: content,
        agentId: agentId || null,
      });
    }
  };

  // 加载 Agents
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        if (data.success) setAgents(data.data);
      })
      .catch(() => {});
  }, []);

  const handleRiskResponse = (confirmed: boolean) => {
    if (socket) {
      socket.emit('risk_response', { confirmed });
    }
    setRiskConfirm({ show: false, assessment: null });
  };

  const handleClearChat = () => {
    if (socket && chatState.activeSessionId) {
      socket.emit('clear_session', { sessionId: chatState.activeSessionId });
    }
  };

  const handleSwitchSession = useCallback((sessionId: string) => {
    try { localStorage.setItem(ACTIVE_SESSION_KEY, sessionId); } catch {}
    socket?.emit('switch_session', { sessionId });
  }, [socket]);

  const handleCreateSession = useCallback(() => {
    socket?.emit('create_session');
  }, [socket]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    socket?.emit('delete_session', { sessionId });
  }, [socket]);

  const navItems = [
    { id: 'chat' as const, icon: Server, label: '智能对话' },
    { id: 'dashboard' as const, icon: Terminal, label: '系统监控' },
    { id: 'services' as const, icon: Layers, label: '系统服务' },
    { id: 'system' as const, icon: Settings, label: '系统配置' },
    { id: 'optimize' as const, icon: Zap, label: '系统优化' },
    { id: 'scheduled' as const, icon: Clock, label: '定时任务' },
    { id: 'skills' as const, icon: Puzzle, label: '技能市场' },
    { id: 'agents' as const, icon: Bot, label: 'Agent员工' },
  ];

  const panelTitles: Record<string, { title: string; subtitle: string }> = {
    chat: { title: '智能对话', subtitle: '自然语言管理服务器' },
    dashboard: { title: '系统监控', subtitle: '实时性能指标' },
    services: { title: '服务管理', subtitle: '系统服务状态' },
    system: { title: '系统配置', subtitle: '镜像源与系统信息' },
    optimize: { title: '系统优化', subtitle: '一键性能调优' },
    scheduled: { title: '定时任务', subtitle: '自动触发 AI 执行' },
    skills: { title: '技能市场', subtitle: '管理与安装技能' },
    agents: { title: 'AI 员工', subtitle: '自定义 AI 员工角色' },
  };

  // 登录回调
  const handleLogin = useCallback((token: string) => {
    setAuthToken(token);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }, []);

  // 登出
  const handleLogout = useCallback(() => {
    if (authToken) {
      fetch('/api/auth/logout', { method: 'POST' });
    }
    setAuthToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    window.location.reload();
  }, [authToken]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      </div>
    );
  }

  if (!authToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* 侧边栏 */}
      <div className="w-[72px] flex flex-col items-center py-4 border-r theme-transition"
           style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center theme-transition"
               style={{ backgroundColor: 'var(--color-accent)' }}>
            <Server className="w-5 h-5" style={{ color: 'var(--color-text-on-accent)' }} />
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-all relative group ${
                activePanel === item.id
                  ? 'shadow-lg'
                  : 'hover:opacity-100 opacity-70'
              }`}
              style={activePanel === item.id
                ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)', boxShadow: '0 4px 20px -4px var(--color-glow-accent)' }
                : { color: 'var(--color-text-muted)' }
              }
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 头部 */}
        <header className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0 theme-transition"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold theme-transition" style={{ color: 'var(--color-text-primary)' }}>
              {panelTitles[activePanel].title}
            </h1>
            <span className="text-xs theme-transition" style={{ color: 'var(--color-text-muted)' }}>
              {panelTitles[activePanel].subtitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--color-bg)]"
              style={{ color: 'var(--color-text-muted)' }}
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse"
                   style={{ backgroundColor: 'var(--color-success)' }} />
              <span className="text-xs theme-transition" style={{ color: 'var(--color-text-muted)' }}>已连接</span>
            </div>
          </div>
        </header>

        {/* 内容面板 */}
        <div className="flex-1 overflow-hidden">
          {activePanel === 'chat' && (
            <ChatPanel
              sessions={chatState.sessions}
              activeSessionId={chatState.activeSessionId}
              messages={activeMessages}
              isTyping={isTyping}
              onSendMessage={handleSendMessage}
              onSwitchSession={handleSwitchSession}
              onCreateSession={handleCreateSession}
              onDeleteSession={handleDeleteSession}
              onClearSession={handleClearChat}
              opencodeStream={activeStream}
              agents={agents}
              activeAgentId={activeAgentId}
              onSelectAgent={setActiveAgentId}
              onNavigateToAgents={() => setActivePanel('agents')}
            />
          )}
          {activePanel === 'dashboard' && <SystemDashboard socket={socket} />}
          {activePanel === 'services' && <ServicesPanel />}
          {activePanel === 'system' && <SystemInfoPanel />}
          {activePanel === 'optimize' && <OptimizationPanel />}
          {activePanel === 'scheduled' && <ScheduledTasksPanel />}
          {activePanel === 'skills' && <SkillMarketplace />}
          {activePanel === 'agents' && (
            <AgentPanel
              agents={agents}
              onAgentsChange={setAgents}
            />
          )}
        </div>
      </div>

      {/* 风险确认弹窗 */}
      {riskConfirm.show && riskConfirm.assessment && (
        <RiskConfirmModal
          assessment={riskConfirm.assessment}
          onConfirm={() => handleRiskResponse(true)}
          onCancel={() => handleRiskResponse(false)}
        />
      )}
    </div>
  );
}

export default App;

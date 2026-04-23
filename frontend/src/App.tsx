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
import {
  Server, Terminal, Settings, Zap, Puzzle, Layers
} from 'lucide-react';

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
  const [activePanel, setActivePanel] = useState<'chat' | 'dashboard' | 'system' | 'optimize' | 'skills' | 'services'>('chat');

  // Opencode 状态
  const [opencodeAvailable, setOpencodeAvailable] = useState(false);
  const [useOpencode, setUseOpencode] = useState(false);
  const [opencodeStreams, setOpencodeStreams] = useState<Record<string, OpenCodeEvent[]>>({});

  const activeMessages = chatState.activeSessionId
    ? chatState.sessions[chatState.activeSessionId]?.messages || []
    : [];
  const isTyping = chatState.activeSessionId ? !!typingSessions[chatState.activeSessionId] : false;
  const activeStream = chatState.activeSessionId ? opencodeStreams[chatState.activeSessionId] || [] : [];

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('已连接到服务器');
      newSocket.emit('create_session');
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
    });

    newSocket.on('sessions_list', (data: { sessions: Session[] }) => {
      setChatState(prev => {
        const sessionsMap = { ...prev.sessions };
        for (const session of data.sessions) {
          sessionsMap[session.id] = session;
        }
        return { ...prev, sessions: sessionsMap };
      });
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
      let shouldCreateNew = false;
      setChatState(prev => {
        const nextSessions = { ...prev.sessions };
        delete nextSessions[data.sessionId];
        if (prev.activeSessionId === data.sessionId) {
          const remaining = Object.keys(nextSessions);
          if (remaining.length > 0) {
            return { sessions: nextSessions, activeSessionId: remaining[0] };
          }
          shouldCreateNew = true;
          return { sessions: nextSessions, activeSessionId: '' };
        }
        return { ...prev, sessions: nextSessions };
      });
      if (shouldCreateNew) {
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

  const handleSendMessage = (content: string) => {
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

    if (useOpencode && opencodeAvailable) {
      socket.emit('send_message_opencode', { sessionId: chatState.activeSessionId, message: content });
    } else {
      socket.emit('send_message', { sessionId: chatState.activeSessionId, message: content });
    }
  };

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
    socket?.emit('switch_session', { sessionId });
  }, [socket]);

  const handleCreateSession = useCallback(() => {
    socket?.emit('create_session');
  }, [socket]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    socket?.emit('delete_session', { sessionId });
  }, [socket]);

  const navItems = [
    { id: 'chat' as const, icon: Server, label: '对话' },
    { id: 'dashboard' as const, icon: Terminal, label: '监控' },
    { id: 'services' as const, icon: Layers, label: '服务' },
    { id: 'system' as const, icon: Settings, label: '系统' },
    { id: 'optimize' as const, icon: Zap, label: '优化' },
    { id: 'skills' as const, icon: Puzzle, label: '技能' },
  ];

  const panelTitles: Record<string, { title: string; subtitle: string }> = {
    chat: { title: '智能对话', subtitle: '自然语言管理服务器' },
    dashboard: { title: '系统监控', subtitle: '实时系统状态' },
    services: { title: '系统服务', subtitle: '管理系统服务状态' },
    system: { title: '系统配置', subtitle: '镜像源与系统信息' },
    optimize: { title: '系统优化', subtitle: '一键优化与安全加固' },
    skills: { title: '技能市场', subtitle: '扩展AI能力' },
  };

  return (
    <div className="flex h-screen theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* 侧边栏 */}
      <div className="w-16 flex flex-col items-center py-4 border-r theme-transition"
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
              className={`p-3 rounded-xl transition-all relative group ${
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
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border"
                    style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
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
              opencodeAvailable={opencodeAvailable}
              useOpencode={useOpencode}
              setUseOpencode={setUseOpencode}
              opencodeStream={activeStream}
            />
          )}
          {activePanel === 'dashboard' && <SystemDashboard socket={socket} />}
          {activePanel === 'services' && <ServicesPanel />}
          {activePanel === 'system' && <SystemInfoPanel />}
          {activePanel === 'optimize' && <OptimizationPanel />}
          {activePanel === 'skills' && <SkillMarketplace />}
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

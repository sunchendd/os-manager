import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Session } from '../../../shared/types';
import { MessageBubble } from './MessageBubble';
import { SmartResult } from './SmartResult';
import { Send, Mic, MicOff, Loader2, Activity, Shield, Zap, Volume2, VolumeX, Plus, Trash2, MessageSquare } from 'lucide-react';

interface ChatPanelProps {
  sessions: Record<string, Session>;
  activeSessionId: string;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onSwitchSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClearSession: () => void;
}

const TTS_KEY = 'os-manager-tts-enabled';

const isTTSSupported = (): boolean => {
  return 'speechSynthesis' in window;
};

const getTTSEnabled = (): boolean => {
  try {
    return localStorage.getItem(TTS_KEY) === 'true';
  } catch { return false; }
};

const setTTSEnabled = (v: boolean) => {
  try {
    localStorage.setItem(TTS_KEY, v ? 'true' : 'false');
  } catch { /* ignore */ }
};

const isSpeechSupported = (): boolean => {
  return !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;
};

const getSessionTitle = (session: Session): string => {
  const firstUserMsg = session.messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    return firstUserMsg.content.slice(0, 18) + (firstUserMsg.content.length > 18 ? '...' : '');
  }
  return '新会话';
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  sessions,
  activeSessionId,
  messages,
  isTyping,
  onSendMessage,
  onSwitchSession,
  onCreateSession,
  onDeleteSession,
  onClearSession,
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabledState] = useState(getTTSEnabled);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input.trim());
    setInput('');
    setVoiceError(null);
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleTTS = () => {
    const next = !ttsEnabled;
    setTtsEnabledState(next);
    setTTSEnabled(next);
    if (!next && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleVoiceInput = () => {
    setVoiceError(null);
    finalTranscriptRef.current = '';

    if (isListening) {
      stopListening();
      return;
    }

    if (!isSpeechSupported()) {
      setVoiceError('您的浏览器不支持语音识别，请使用Chrome/Edge浏览器');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        finalTranscriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setInput((prev) => prev + finalTranscript);
        } else if (interimTranscript) {
          setInput((prev) => {
            const base = prev.replace(/\[.*?\]$/, '');
            return base + interimTranscript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        let errorMsg = '语音识别出错';
        switch (event.error) {
          case 'no-speech':
            errorMsg = '未检测到语音，请重试';
            break;
          case 'audio-capture':
            errorMsg = '无法访问麦克风';
            break;
          case 'not-allowed':
            errorMsg = '麦克风权限被拒绝，请在浏览器设置中允许';
            break;
          case 'network':
            errorMsg = '网络错误，语音识别需要网络连接';
            break;
          case 'aborted':
            errorMsg = '';
            break;
          default:
            errorMsg = `语音识别错误: ${event.error}`;
        }
        if (errorMsg) setVoiceError(errorMsg);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        const text = finalTranscriptRef.current.trim();
        if (text && !isTyping) {
          onSendMessage(input.trim() || text);
          setInput('');
        }
        finalTranscriptRef.current = '';
      };

      recognition.start();
    } catch (err: any) {
      setVoiceError(`启动语音识别失败: ${err.message}`);
      setIsListening(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
  };

  const scenarios = [
    {
      icon: <Activity className="w-4 h-4" />,
      title: '系统健康诊断',
      desc: '一键全面体检',
      prompt: '帮我做一次完整的系统健康诊断，检查磁盘、内存、CPU、安全日志等',
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: '安全巡检',
      desc: '检查安全状态',
      prompt: '检查系统安全状态，包括开放端口、登录记录、异常进程等',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: '性能分析',
      desc: '找出性能瓶颈',
      prompt: '分析系统性能瓶颈，查看CPU和内存占用最高的进程',
    },
  ];

  return (
    <div className="flex h-full">
      {/* Session Sidebar */}
      <div className="w-[220px] border-r flex flex-col flex-shrink-0 theme-transition"
           style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="p-3 border-b theme-transition" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onCreateSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}>
            <Plus className="w-4 h-4" />
            新建会话
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {Object.values(sessions)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => onSwitchSession(session.id)}
                  className={`group relative mx-2 px-3 py-2.5 rounded-lg cursor-pointer border-l-2 transition-all ${
                    isActive
                      ? 'bg-[var(--color-surface)] border-[var(--color-accent)]'
                      : 'border-transparent hover:bg-[var(--color-surface-hover)]'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                      }`}>
                        {getSessionTitle(session)}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {formatTime(session.updatedAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className={`p-1 rounded-md transition-all ${
                        isActive
                          ? 'text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)]'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)] opacity-0 group-hover:opacity-100'
                      }`}
                      title="删除会话"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            
          {Object.keys(sessions).length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              暂无会话
            </div>
          )}
        </div>

        <div className="p-3 border-t theme-transition" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClearSession}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)]"
            style={{ color: 'var(--color-text-secondary)' }}>
            <Shield className="w-4 h-4" />
            清除对话
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] animate-fade-in">
              {/* Hero avatar */}
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-accent)] to-[#ff8c5a] rounded-2xl flex items-center justify-center shadow-2xl shadow-[var(--color-accent-dim)] animate-float">
                  <span className="text-5xl">🤖</span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[var(--color-secondary)]" />
                </div>
              </div>

              <h3 className="text-3xl font-extrabold text-[var(--color-text-primary)] mb-2 tracking-tight">
                OS 智能代理
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] text-center max-w-md mb-10 leading-relaxed">
                告别记忆复杂命令，用自然语言管理 Linux 服务器
              </p>

              {/* Scenario cards */}
              <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                {scenarios.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(s.prompt)}
                    className="group flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 rounded-xl transition-all duration-300 text-left relative overflow-hidden"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-dim)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-11 h-11 bg-[var(--color-accent-dim)] rounded-xl flex items-center justify-center text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all duration-300 relative z-10">
                      {s.icon}
                    </div>
                    <div className="relative z-10">
                      <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-white transition-colors">
                        {s.title}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] uppercase tracking-widest font-medium">
                <span className="w-6 h-px bg-[var(--color-border-hover)]" />
                已接入 DeepSeek AI · 支持语音输入
                <span className="w-6 h-px bg-[var(--color-border-hover)]" />
              </div>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={message.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            >
              <MessageBubble message={message} />
              {message.role === 'assistant' && message.content && (
                <SmartResult content={message.content} />
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-3 text-[var(--color-text-muted)] bg-[var(--color-surface)] w-fit px-5 py-2.5 rounded-full border border-[var(--color-border)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
              <span className="text-sm font-medium">AI 正在分析...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-[var(--color-border)] p-4 bg-[var(--color-surface)]/90 backdrop-blur-xl relative z-20"
        >
          {voiceError && (
            <div className="mb-3 px-3 py-2 bg-[var(--color-danger-dim)] border border-[var(--color-danger)]/20 rounded-lg text-xs text-[var(--color-danger)] flex items-center gap-2">
              <span>⚠️</span>
              {voiceError}
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="ml-auto text-[var(--color-danger)] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-xl transition-all duration-300 ${
                isListening
                  ? 'bg-[var(--color-danger)] text-white shadow-lg shadow-red-500/20 animate-pulse'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
              title={isListening ? '点击停止录音' : '语音输入'}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {isTTSSupported() && (
              <button
                type="button"
                onClick={toggleTTS}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  ttsEnabled
                    ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
                title={ttsEnabled ? '语音播报已开启' : '语音播报已关闭'}
              >
                {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            )}

            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? '正在聆听...' : '输入指令或问题，例如：查看磁盘使用情况'}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all text-sm"
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--color-danger)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--color-danger)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--color-danger)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 accent-btn rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

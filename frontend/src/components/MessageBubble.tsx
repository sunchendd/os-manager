import { useState, type FC } from 'react';
import { Message } from '../../../shared/types';
import { User, Bot, AlertTriangle, AlertCircle, CheckCircle, Volume2, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showCommands, setShowCommands] = useState(false);

  const getTTSEnabled = (): boolean => {
    try {
      return localStorage.getItem('os-manager-tts-enabled') === 'true';
    } catch { return false; }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const getRiskIcon = () => {
    switch (message.riskLevel) {
      case 'danger':
        return <AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'safe':
        return <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />;
      default:
        return null;
    }
  };

  const getRiskLabel = () => {
    switch (message.riskLevel) {
      case 'danger': return '高风险';
      case 'warning': return '警告';
      case 'safe': return '安全';
      default: return '';
    }
  };

  const getBubbleStyles = () => {
    if (isUser) {
      return 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent-dim)]';
    }
    if (message.type === 'error') {
      return 'bg-[var(--color-danger-dim)] border border-[var(--color-danger)]/20 text-[var(--color-danger)]';
    }
    if (message.type === 'risk') {
      return 'bg-[var(--color-warning-dim)] border border-[var(--color-warning)]/20 text-[var(--color-warning)]';
    }
    return 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]';
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
          isUser
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
            : 'bg-[var(--surface-elevated)] border-[var(--color-border)]'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" strokeWidth={2.5} />
        ) : (
          <Bot className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={2.5} />
        )}
      </div>

      {/* Message content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-xl px-4 py-3 ${getBubbleStyles()}`}>
          {/* Risk badge */}
          {message.riskLevel && !isUser && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-1 bg-black/20 rounded-lg w-fit">
              {getRiskIcon()}
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {getRiskLabel()}
              </span>
            </div>
          )}

          {/* Message text */}
          <div className="text-sm leading-relaxed">
            {isUser ? (
              <div className="whitespace-pre-wrap font-medium">{message.content}</div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>

          {/* Single command (legacy) */}
          {message.command && !message.commands && (
            <div className="mt-3 bg-black/30 rounded-lg px-3 py-1.5 font-mono text-xs border border-white/5">
              <span className="text-[var(--color-text-muted)]">$</span>{' '}
              <span className="text-[var(--color-secondary)]">{message.command}</span>
            </div>
          )}

          {/* Commands accordion */}
          {message.commands && message.commands.length > 0 && (
            <div className="mt-3 border border-[var(--color-border)] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowCommands(!showCommands)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--color-bg)]/60 hover:bg-[var(--color-bg)] transition-colors text-xs text-[var(--color-text-secondary)]"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Terminal className="w-3.5 h-3.5" />
                  执行了 {message.commands.length} 条命令
                </span>
                {showCommands ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showCommands && (
                <div className="px-3 py-2 space-y-2 bg-[var(--color-bg)]/40">
                  {message.commands.map((cmd, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${cmd.success ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`} />
                        <code className="text-[var(--color-secondary)] font-mono">$ {cmd.command}</code>
                      </div>
                      <pre className="text-[var(--color-text-muted)] font-mono whitespace-pre-wrap pl-3 border-l-2 border-[var(--color-border)] bg-transparent border-none p-0">
                        {cmd.output.substring(0, 300)}{cmd.output.length > 300 ? '...' : ''}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: timestamp + TTS */}
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && getTTSEnabled() && (
            <button
              onClick={() => speak(message.content.replace(/[#*>`\-_\[\]()]/g, ' ').substring(0, 300))}
              className="text-[11px] text-[var(--color-accent)] hover:text-[var(--color-secondary)] flex items-center gap-1 transition-colors font-medium"
              title="朗读"
            >
              <Volume2 className="w-3 h-3" />
              朗读
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

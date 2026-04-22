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
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'safe':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-indigo-600' : 'bg-slate-700'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-indigo-400" />
        )}
      </div>

      {/* 消息内容 */}
        <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : message.type === 'error'
            ? 'bg-red-900/50 border border-red-700 text-red-200'
            : message.type === 'risk'
            ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-200'
            : 'bg-slate-800 text-slate-200'
        }`}>
          {/* 风险图标 */}
          {message.riskLevel && !isUser && (
            <div className="flex items-center gap-2 mb-1">
              {getRiskIcon()}
              <span className="text-xs font-medium capitalize">
                {message.riskLevel === 'danger' ? '高风险' : 
                 message.riskLevel === 'warning' ? '警告' : '安全'}
              </span>
            </div>
          )}

          {/* 消息文本 */}
          <div className="text-sm leading-relaxed">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>

          {/* 执行的命令（单条兼容旧数据） */}
          {message.command && !message.commands && (
            <div className="mt-2 bg-black/30 rounded px-2 py-1 font-mono text-xs">
              $ {message.command}
            </div>
          )}

          {/* 命令执行详情（可折叠） */}
          {message.commands && message.commands.length > 0 && (
            <div className="mt-2 border border-slate-700/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowCommands(!showCommands)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/50 hover:bg-slate-900/80 transition-colors text-xs text-slate-400"
              >
                <span className="flex items-center gap-1.5">
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
                <div className="px-3 py-2 space-y-2 bg-slate-950/50">
                  {message.commands.map((cmd, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${cmd.success ? 'bg-green-400' : 'bg-red-400'}`} />
                        <code className="text-amber-300 font-mono">$ {cmd.command}</code>
                      </div>
                      <pre className="text-slate-500 font-mono whitespace-pre-wrap pl-3 border-l-2 border-slate-700">
                        {cmd.output.substring(0, 300)}{cmd.output.length > 300 ? '...' : ''}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作栏：时间戳 + 朗读 */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-xs text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && getTTSEnabled() && (
            <button
              onClick={() => speak(message.content.replace(/[#*>`\-_\[\]()]/g, ' ').substring(0, 300))}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
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

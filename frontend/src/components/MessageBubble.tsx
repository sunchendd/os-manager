import type { FC } from 'react';
import { Message } from '../../../shared/types';
import { User, Bot, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

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
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>

          {/* 执行的命令 */}
          {message.command && (
            <div className="mt-2 bg-black/30 rounded px-2 py-1 font-mono text-xs">
              $ {message.command}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <span className="text-xs text-slate-500 mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
};

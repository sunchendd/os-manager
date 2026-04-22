import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../../../shared/types';
import { MessageBubble } from './MessageBubble';
import { SmartResult } from './SmartResult';
import { Send, Mic, MicOff, Loader2, Activity, Shield, Zap } from 'lucide-react';

interface ChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
}

// 检查浏览器是否支持语音识别
const isSpeechSupported = (): boolean => {
  return !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isTyping,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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

  const handleVoiceInput = () => {
    setVoiceError(null);
    
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
      };

      recognition.start();
    } catch (err: any) {
      setVoiceError(`启动语音识别失败: ${err.message}`);
      setIsListening(false);
    }
  };

  // 场景快捷入口
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
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
              <span className="text-4xl">🤖</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              OS 智能代理
            </h3>
            <p className="text-sm text-slate-400 text-center max-w-md mb-8">
              告别记忆复杂命令，用自然语言管理Linux服务器
            </p>

            {/* 痛点场景入口 */}
            <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
              {scenarios.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(s.prompt)}
                  className="flex items-center gap-3 p-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-indigo-500/50 rounded-xl transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                    {s.icon}
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 group-hover:text-white">{s.title}</div>
                    <div className="text-xs text-slate-500">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 text-xs text-slate-600">
              已接入 DeepSeek AI • 支持语音输入
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />
            {/* 为assistant消息添加智能分析展示 */}
            {message.role === 'assistant' && message.content && (
              <SmartResult content={message.content} />
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3 text-slate-400 bg-slate-800/50 w-fit px-4 py-2 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-sm">AI正在分析...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-700 p-4 bg-slate-800/95 backdrop-blur"
      >
        {voiceError && (
          <div className="mb-2 px-3 py-1.5 bg-red-900/30 border border-red-700/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            {voiceError}
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`p-3 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={isListening ? '点击停止录音' : '语音输入'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? '正在聆听...' : '输入指令或问题，例如：查看磁盘使用情况'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

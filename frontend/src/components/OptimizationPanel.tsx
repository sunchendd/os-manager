import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';
import {
  Shield, Zap, Trash2, Network, Activity,
  Play, CheckCircle, Loader2, TrendingUp, Filter,
  RotateCcw, Check, AlertCircle, HelpCircle
} from 'lucide-react';

interface OptimizationTool {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'cleanup' | 'network' | 'monitor';
  impact: 'low' | 'medium' | 'high';
  reversible: boolean;
  status: 'applied' | 'needed' | 'unknown';
  statusDetail?: string;
}

interface SystemScore {
  total: number;
  security: number;
  performance: number;
  cleanup: number;
  details: string[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  security: <Shield className="w-4 h-4 text-[var(--color-danger)]" />,
  performance: <Zap className="w-4 h-4 text-[var(--color-warning)]" />,
  cleanup: <Trash2 className="w-4 h-4 text-[var(--color-success)]" />,
  network: <Network className="w-4 h-4 text-blue-400" />,
  monitor: <Activity className="w-4 h-4 text-[var(--color-accent)]" />,
};

const statusConfig = {
  applied: {
    label: '已配置',
    color: 'text-[var(--color-success)]',
    bg: 'bg-[var(--color-success-dim)]',
    icon: <Check className="w-3.5 h-3.5" />,
  },
  needed: {
    label: '建议优化',
    color: 'text-[var(--color-warning)]',
    bg: 'bg-[var(--color-warning-dim)]',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  unknown: {
    label: '状态未知',
    color: 'text-[var(--color-text-muted)]',
    bg: 'bg-[var(--surface-hover)]',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
  },
};

export const OptimizationPanel: React.FC = () => {
  const { addToast } = useToast();
  const [tools, setTools] = useState<OptimizationTool[]>([]);
  const [score, setScore] = useState<SystemScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<{toolId: string; output: string} | null>(null);
  const [showOnlyNeeded, setShowOnlyNeeded] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [toolsRes, scoreRes] = await Promise.all([
        fetch('/api/optimization/tools').then(r => r.json()),
        fetch('/api/optimization/score').then(r => r.json()),
      ]);
      if (toolsRes.success) setTools(toolsRes.data);
      if (scoreRes.success) setScore(scoreRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runTool = async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;

    setRunningTool(toolId);
    setToolResult(null);

    addToast({
      type: 'info',
      title: `正在执行: ${tool.name}`,
      message: '请稍候，正在应用优化...',
      duration: 3000,
    });

    try {
      const res = await fetch('/api/optimization/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });
      const data = await res.json();

      const output = data.output || '执行完成';
      setToolResult({ toolId, output });

      if (data.success) {
        addToast({
          type: 'success',
          title: `${tool.name} 执行成功`,
          message: '优化已应用，系统评分已更新',
          duration: 5000,
        });
      } else {
        addToast({
          type: 'warning',
          title: `${tool.name} 执行完毕`,
          message: output.substring(0, 100),
          duration: 8000,
        });
      }

      await fetchData();
    } catch (e: any) {
      addToast({
        type: 'error',
        title: '执行失败',
        message: e.message || '网络错误',
        duration: 5000,
      });
    } finally {
      setRunningTool(null);
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-[var(--color-success)]';
    if (s >= 60) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-danger)]';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'bg-[var(--color-success)]';
    if (s >= 60) return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-danger)]';
  };

  const getScoreRing = (s: number) => {
    if (s >= 80) return 'stroke-[var(--color-success)]';
    if (s >= 60) return 'stroke-[var(--color-warning)]';
    return 'stroke-[var(--color-danger)]';
  };

  const CircularScore = ({ score: s, label, size = 80 }: { score: number; label: string; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (s / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border-hover)"
            strokeWidth="5"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={getScoreRing(s)}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className={`text-xl font-extrabold ${getScoreColor(s)} relative`} style={{ marginTop: -size * 0.65 }}>
          {s}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    );
  };

  const displayedTools = showOnlyNeeded
    ? tools.filter(t => t.status === 'needed' || t.status === 'unknown')
    : tools;

  const appliedCount = tools.filter(t => t.status === 'applied').length;
  const neededCount = tools.filter(t => t.status === 'needed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-[var(--color-accent)]" />
        <span className="font-medium">加载优化工具...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-5 h-5 text-[var(--color-warning)]" />
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">系统优化</h2>
      </div>

      {/* Score dashboard */}
      {score && (
        <div className="glass-card rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-accent)] opacity-[0.02] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div>
              <div className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">系统健康评分</div>
              <div className={`text-5xl font-extrabold ${getScoreColor(score.total)} mt-1 tracking-tighter`}>
                {score.total}
                <span className="text-xl text-[var(--color-text-muted)] font-normal ml-1">/100</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 text-[11px] mt-3 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${
                score.total >= 80 ? 'bg-[var(--color-success-dim)] text-[var(--color-success)]' :
                score.total >= 60 ? 'bg-[var(--color-warning-dim)] text-[var(--color-warning)]' :
                'bg-[var(--color-danger-dim)] text-[var(--color-danger)]'
              }`}>
                <TrendingUp className="w-3 h-3" />
                {score.total >= 80 ? '状态优秀' : score.total >= 60 ? '需要优化' : '存在风险'}
              </div>
            </div>
            <div className="flex gap-6">
              <CircularScore score={score.security} label="安全" size={70} />
              <CircularScore score={score.performance} label="性能" size={70} />
              <CircularScore score={score.cleanup} label="清理" size={70} />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-2">
            {score.details.map((detail, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {detail.includes('✅') ? (
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--color-success)] flex-shrink-0" />
                ) : detail.includes('⚠️') || detail.includes('❌') ? (
                  <Activity className="w-3.5 h-3.5 text-[var(--color-warning)] flex-shrink-0" />
                ) : (
                  <div className={`w-2 h-2 rounded-full ${getScoreBg(score.total)} flex-shrink-0`} />
                )}
                <span className="truncate font-medium">{detail.replace(/[✅❌⚠️]/g, '').trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats & filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--color-text-muted)] text-xs font-semibold">
            共 <span className="text-[var(--color-text-primary)]">{tools.length}</span> 项
          </span>
          <span className="text-[var(--color-success)] flex items-center gap-1 text-xs font-bold">
            <Check className="w-3.5 h-3.5" />
            已配置 {appliedCount}
          </span>
          <span className="text-[var(--color-warning)] flex items-center gap-1 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            待优化 {neededCount}
          </span>
        </div>
        <button
          onClick={() => setShowOnlyNeeded(!showOnlyNeeded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
            showOnlyNeeded
              ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent-dim)]'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyNeeded ? '显示全部' : '仅显示待优化'}
        </button>
      </div>

      {/* Tools list */}
      <div className="space-y-2.5">
        {displayedTools.map((tool, idx) => {
          const statusCfg = statusConfig[tool.status];
          const isApplied = tool.status === 'applied';

          return (
            <div
              key={tool.id}
              className={`glass-card rounded-xl p-4 transition-all duration-300 ${
                isApplied ? 'opacity-70' : ''
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isApplied ? 'bg-[var(--color-bg)]' : 'bg-[var(--surface-hover)]'
                  }`}>
                    {categoryIcons[tool.category]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-bold text-[var(--color-text-primary)]">{tool.name}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">{tool.description}</div>
                    {tool.statusDetail && tool.statusDetail !== statusCfg.label && (
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-1">{tool.statusDetail}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        tool.impact === 'high' ? 'bg-[var(--color-danger-dim)] text-[var(--color-danger)]' :
                        tool.impact === 'medium' ? 'bg-[var(--color-warning-dim)] text-[var(--color-warning)]' :
                        'bg-[var(--color-success-dim)] text-[var(--color-success)]'
                      }`}>
                        {tool.impact === 'high' ? '高影响' : tool.impact === 'medium' ? '中影响' : '低影响'}
                      </span>
                      {tool.reversible && (
                        <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3 h-3" />
                          可回退
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => runTool(tool.id)}
                  disabled={runningTool === tool.id}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-40 text-sm font-bold flex items-center gap-2 ${
                    isApplied
                      ? 'bg-[var(--surface-hover)] hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                      : 'accent-btn'
                  }`}
                >
                  {runningTool === tool.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      执行中
                    </>
                  ) : isApplied ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      再次执行
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      执行
                    </>
                  )}
                </button>
              </div>

              {/* Result expand */}
              {toolResult?.toolId === tool.id && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <div className="text-[11px] font-bold text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Activity className="w-3 h-3" />
                    执行输出
                  </div>
                  <pre className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg)] p-3 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto border border-[var(--color-border)] font-mono">
                    {toolResult.output}
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {displayedTools.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <CheckCircle className="w-12 h-12 text-[var(--color-success)] mx-auto mb-3 opacity-60" />
            <div className="text-sm font-bold text-[var(--color-text-primary)]">太棒了！</div>
            <div className="text-xs mt-1 font-medium">当前所有优化项均已配置完成</div>
          </div>
        )}
      </div>
    </div>
  );
};

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
  security: <Shield className="w-4 h-4 text-red-400" />,
  performance: <Zap className="w-4 h-4 text-yellow-400" />,
  cleanup: <Trash2 className="w-4 h-4 text-green-400" />,
  network: <Network className="w-4 h-4 text-blue-400" />,
  monitor: <Activity className="w-4 h-4 text-purple-400" />,
};

const statusConfig = {
  applied: {
    label: '已配置',
    color: 'text-green-400',
    bg: 'bg-green-400/15',
    icon: <Check className="w-3.5 h-3.5" />,
  },
  needed: {
    label: '建议优化',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/15',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  unknown: {
    label: '状态未知',
    color: 'text-slate-400',
    bg: 'bg-slate-400/15',
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
      
      await fetchData(); // 刷新评分和状态
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getScoreRing = (score: number) => {
    if (score >= 80) return 'stroke-green-400';
    if (score >= 60) return 'stroke-yellow-400';
    return 'stroke-red-400';
  };

  // 环形进度条
  const CircularScore = ({ score, label, size = 80 }: { score: number; label: string; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={getScoreRing(score)}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className={`text-xl font-bold ${getScoreColor(score)} -mt-[${size * 0.6}px] relative`} style={{ marginTop: -size * 0.65 }}>
          {score}
        </div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
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
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        加载优化工具...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        系统优化
      </h2>

      {/* 系统评分仪表盘 */}
      {score && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400">系统健康评分</div>
              <div className={`text-4xl font-bold ${getScoreColor(score.total)} mt-1`}>
                {score.total}
                <span className="text-lg text-slate-500 font-normal">/100</span>
              </div>
              <div className={`inline-flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-full ${
                score.total >= 80 ? 'bg-green-400/10 text-green-400' :
                score.total >= 60 ? 'bg-yellow-400/10 text-yellow-400' :
                'bg-red-400/10 text-red-400'
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

          {/* 详细检查项 */}
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-2">
            {score.details.map((detail, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                {detail.includes('✅') ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                ) : detail.includes('⚠️') || detail.includes('❌') ? (
                  <Activity className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                ) : (
                  <div className={`w-2 h-2 rounded-full ${getScoreBg(score.total)} flex-shrink-0`} />
                )}
                <span className="truncate">{detail.replace(/[✅❌⚠️]/g, '').trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 统计和筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">
            共 <span className="text-white font-medium">{tools.length}</span> 项
          </span>
          <span className="text-green-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            已配置 {appliedCount}
          </span>
          <span className="text-yellow-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            待优化 {neededCount}
          </span>
        </div>
        <button
          onClick={() => setShowOnlyNeeded(!showOnlyNeeded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showOnlyNeeded
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyNeeded ? '显示全部' : '仅显示待优化'}
        </button>
      </div>

      {/* 优化工具列表 */}
      <div className="space-y-2">
        {displayedTools.map((tool) => {
          const statusCfg = statusConfig[tool.status];
          const isApplied = tool.status === 'applied';

          return (
            <div
              key={tool.id}
              className={`bg-slate-800 rounded-xl p-4 border transition-all ${
                isApplied ? 'border-slate-700/50 opacity-80' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isApplied ? 'bg-slate-700/50' : 'bg-slate-700'
                  }`}>
                    {categoryIcons[tool.category]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-white">{tool.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{tool.description}</div>
                    {tool.statusDetail && tool.statusDetail !== statusCfg.label && (
                      <div className="text-xs text-slate-500 mt-0.5">{tool.statusDetail}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tool.impact === 'high' ? 'bg-red-400/15 text-red-400' :
                        tool.impact === 'medium' ? 'bg-yellow-400/15 text-yellow-400' :
                        'bg-green-400/15 text-green-400'
                      }`}>
                        {tool.impact === 'high' ? '高影响' : tool.impact === 'medium' ? '中影响' : '低影响'}
                      </span>
                      {tool.reversible && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
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
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2 ${
                    isApplied
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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

              {/* 执行结果展开 */}
              {toolResult?.toolId === tool.id && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    执行输出
                  </div>
                  <pre className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {toolResult.output}
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {displayedTools.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <div className="text-sm font-medium text-white">太棒了！</div>
            <div className="text-xs mt-1">当前所有优化项均已配置完成</div>
          </div>
        )}
      </div>
    </div>
  );
};

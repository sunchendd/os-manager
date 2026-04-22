import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';
import { 
  Shield, Zap, Trash2, Network, Activity,
  Play, CheckCircle, Loader2, TrendingUp
} from 'lucide-react';

interface OptimizationTool {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'cleanup' | 'network' | 'monitor';
  impact: 'low' | 'medium' | 'high';
  reversible: boolean;
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

export const OptimizationPanel: React.FC = () => {
  const { addToast } = useToast();
  const [tools, setTools] = useState<OptimizationTool[]>([]);
  const [score, setScore] = useState<SystemScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<{toolId: string; output: string} | null>(null);

  const fetchData = async () => {
    try {
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
      
      await fetchData(); // 刷新评分
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

      {/* 优化工具列表 */}
      <div className="space-y-2">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  {categoryIcons[tool.category]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{tool.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{tool.description}</div>
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {runningTool === tool.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    执行中
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
        ))}
      </div>
    </div>
  );
};

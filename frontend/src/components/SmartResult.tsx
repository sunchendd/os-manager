import { useMemo } from 'react';
import {
  HardDrive, MemoryStick, Cpu, Network,
  AlertTriangle, CheckCircle,
  BarChart3, TrendingUp, Shield
} from 'lucide-react';

interface SmartResultProps {
  content: string;
}

interface ParsedData {
  type: 'disk' | 'memory' | 'cpu' | 'process' | 'network' | 'security' | 'generic';
  title: string;
  metrics: { label: string; value: string; status?: 'good' | 'warning' | 'danger' }[];
  rawText: string;
}

export const SmartResult: React.FC<SmartResultProps> = ({ content }) => {
  const parsedData = useMemo(() => parseContent(content), [content]);

  if (!parsedData || parsedData.type === 'generic') {
    return null;
  }

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'good': return { color: 'var(--color-success)', backgroundColor: 'var(--color-success-dim)', borderColor: 'var(--color-success)' };
      case 'warning': return { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-dim)', borderColor: 'var(--color-warning)' };
      case 'danger': return { color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-dim)', borderColor: 'var(--color-danger)' };
      default: return { color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' };
    }
  };

  const getIcon = () => {
    switch (parsedData.type) {
      case 'disk': return <HardDrive className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />;
      case 'memory': return <MemoryStick className="w-5 h-5" style={{ color: 'var(--color-success)' }} />;
      case 'cpu': return <Cpu className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />;
      case 'process': return <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />;
      case 'network': return <Network className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />;
      case 'security': return <Shield className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />;
      default: return <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />;
    }
  };

  return (
    <div className="mt-2 ml-11">
      <div className="rounded-xl overflow-hidden border theme-transition glass-card"
           style={{ borderColor: 'var(--color-border)' }}>
        {/* 头部 */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b theme-transition"
             style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {getIcon()}
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{parsedData.title}</span>
          {parsedData.metrics.some(m => m.status === 'danger') && (
            <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              发现异常
            </span>
          )}
          {parsedData.metrics.every(m => m.status === 'good') && (
            <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
              <CheckCircle className="w-3.5 h-3.5" />
              状态正常
            </span>
          )}
        </div>

        {/* 指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
          {parsedData.metrics.map((metric, i) => {
            const style = getStatusStyle(metric.status);
            return (
              <div
                key={i}
                className="p-3 rounded-lg border theme-transition"
                style={style}
              >
                <div className="text-xs opacity-70 mb-1">{metric.label}</div>
                <div className="text-sm font-semibold">{metric.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function parseContent(content: string): ParsedData | null {
  // 检测内容类型并提取关键指标

  // 磁盘分析
  if (content.includes('Filesystem') && content.includes('Size') && content.includes('Use%')) {
    const lines = content.split('\n');
    const rootLine = lines.find(l => l.includes('/dev/') && l.includes('/ ') && !l.includes('/vol'));
    if (rootLine) {
      const parts = rootLine.trim().split(/\s+/);
      return {
        type: 'disk',
        title: '磁盘使用情况',
        metrics: [
          { label: '文件系统', value: parts[0] || 'unknown', status: 'good' },
          { label: '总容量', value: parts[1] || 'unknown', status: 'good' },
          { label: '已用空间', value: parts[2] || 'unknown', status: 'good' },
          { label: '可用空间', value: parts[3] || 'unknown', status: 'good' },
          { label: '使用率', value: parts[4] || 'unknown', status: getUsageStatus(parts[4]) },
          { label: '挂载点', value: parts[5] || '/', status: 'good' },
        ],
        rawText: content,
      };
    }
  }

  // 内存分析
  if (content.includes('Mem:') || (content.includes('total') && content.includes('free') && content.includes('used'))) {
    const memMatch = content.match(/Mem:\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (memMatch) {
      const total = memMatch[1];
      const used = memMatch[2];
      const free = memMatch[3];
      const usePercent = calculatePercent(used, total);
      return {
        type: 'memory',
        title: '内存使用情况',
        metrics: [
          { label: '总内存', value: total, status: 'good' },
          { label: '已用内存', value: used, status: getUsageStatus(`${usePercent}%`) },
          { label: '可用内存', value: free, status: 'good' },
          { label: '使用率', value: `${usePercent}%`, status: getUsageStatus(`${usePercent}%`) },
        ],
        rawText: content,
      };
    }
  }

  // 进程分析
  if (content.includes('PID') && content.includes('%CPU') && content.includes('COMMAND')) {
    const lines = content.split('\n').filter(l => l.trim() && !l.includes('PID'));
    const topProcess = lines[0];
    if (topProcess) {
      const parts = topProcess.trim().split(/\s+/);
      return {
        type: 'process',
        title: '进程性能分析',
        metrics: [
          { label: '最高CPU进程', value: parts.slice(10).join(' ') || 'unknown', status: parseFloat(parts[2]) > 50 ? 'warning' : 'good' },
          { label: 'CPU占用', value: `${parts[2]}%`, status: parseFloat(parts[2]) > 50 ? 'warning' : 'good' },
          { label: '内存占用', value: `${parts[3]}%`, status: parseFloat(parts[3]) > 30 ? 'warning' : 'good' },
          { label: '进程ID', value: parts[1] || 'unknown', status: 'good' },
        ],
        rawText: content,
      };
    }
  }

  // 网络端口分析
  if (content.includes('LISTEN') && content.includes('Local Address')) {
    const listenCount = (content.match(/LISTEN/g) || []).length;
    return {
      type: 'network',
      title: '网络端口监控',
      metrics: [
        { label: '监听端口数', value: `${listenCount}`, status: listenCount > 50 ? 'warning' : 'good' },
        { label: '状态', value: '正常监听中', status: 'good' },
      ],
      rawText: content,
    };
  }

  // 安全检查
  if (content.includes('安全') || content.includes('登录') || content.includes('端口')) {
    const hasIssue = content.includes('异常') || content.includes('风险') || content.includes('失败');
    return {
      type: 'security',
      title: '安全状态检查',
      metrics: [
        { label: '检查结果', value: hasIssue ? '发现异常' : '状态正常', status: hasIssue ? 'warning' : 'good' },
        { label: '建议', value: hasIssue ? '查看详细日志' : '继续保持', status: hasIssue ? 'warning' : 'good' },
      ],
      rawText: content,
    };
  }

  return null;
}

function getUsageStatus(percentStr?: string): 'good' | 'warning' | 'danger' {
  if (!percentStr) return 'good';
  const num = parseInt(percentStr.replace('%', ''));
  if (isNaN(num)) return 'good';
  if (num >= 90) return 'danger';
  if (num >= 70) return 'warning';
  return 'good';
}

function calculatePercent(used: string, total: string): number {
  const parseSize = (s: string): number => {
    const num = parseFloat(s);
    if (s.includes('Gi')) return num;
    if (s.includes('Mi')) return num / 1024;
    return num;
  };
  const u = parseSize(used);
  const t = parseSize(total);
  if (t === 0) return 0;
  return Math.round((u / t) * 100);
}

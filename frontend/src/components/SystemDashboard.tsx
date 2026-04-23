import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
  HardDrive, Cpu, MemoryStick, Network,
  TrendingUp, AlertTriangle, CheckCircle, Activity
} from 'lucide-react';

interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercent: number;
  mounted: string;
}

interface SystemData {
  disk: DiskInfo[];
  memory: { total: string; used: string; free: string; usePercent: number };
  cpu: { processes: Array<{ user: string; pid: string; cpu: number; mem: number; command: string }> };
  cpuUsage: number;
  hostname: string;
  os: string;
  uptime: string;
  loadAvg: string[];
}

interface DashboardPayload {
  disk: string | null;
  memory: string | null;
  processes: string | null;
  sysInfo: string | null;
  cpuUsage: number | null;
  timestamp: number;
}

const SkeletonCard: React.FC<{ cols?: number }> = ({ cols = 1 }) => (
  <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] animate-pulse">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-4 h-4 bg-[var(--surface-hover)] rounded" />
      <div className="h-3 bg-[var(--surface-hover)] rounded w-20" />
    </div>
    {cols === 2 ? (
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 bg-[var(--surface-hover)] rounded" />
        <div className="h-8 bg-[var(--surface-hover)] rounded" />
      </div>
    ) : (
      <div className="space-y-2">
        <div className="h-3 bg-[var(--surface-hover)] rounded w-full" />
        <div className="h-3 bg-[var(--surface-hover)] rounded w-3/4" />
        <div className="h-3 bg-[var(--surface-hover)] rounded w-1/2" />
      </div>
    )}
  </div>
);

const ProgressBar: React.FC<{ percent: number; label: string; value: string }> = ({ percent, label, value }) => {
  const getColor = () => {
    if (percent >= 90) return 'bg-[var(--color-danger)]';
    if (percent >= 70) return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-success)]';
  };

  const getTextColor = () => {
    if (percent >= 90) return 'text-[var(--color-danger)]';
    if (percent >= 70) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-success)]';
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] font-medium text-[var(--color-text-muted)] mb-1.5">
        <span>{label}</span>
        <span className={`${getTextColor()}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
        <div
          className={`h-full ${getColor()} transition-all duration-700 ease-out rounded-full`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
};

const MiniChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 40;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="3" fill={color} />
    </svg>
  );
};

const parseDashboardData = (payload: DashboardPayload): SystemData | null => {
  if (!payload.disk && !payload.memory && !payload.processes) return null;

  const disks: DiskInfo[] = [];
  if (payload.disk) {
    const lines = payload.disk.split('\n');
    for (const line of lines) {
      if (line.startsWith('/dev/')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          disks.push({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parseInt(parts[4].replace('%', '')) || 0,
            mounted: parts[5],
          });
        }
      }
    }
  }

  let memInfo = { total: '0', used: '0', free: '0', usePercent: 0 };
  if (payload.memory) {
    const memMatch = payload.memory.match(/Mem:\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (memMatch) {
      const total = parseFloat(memMatch[1]);
      const used = parseFloat(memMatch[2]);
      memInfo = {
        total: memMatch[1],
        used: memMatch[2],
        free: memMatch[3],
        usePercent: Math.round((used / total) * 100) || 0,
      };
    }
  }

  const processes: Array<{ user: string; pid: string; cpu: number; mem: number; command: string }> = [];
  if (payload.processes) {
    const lines = payload.processes.split('\n').slice(1, 6);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        processes.push({
          user: parts[0],
          pid: parts[1],
          cpu: parseFloat(parts[2]) || 0,
          mem: parseFloat(parts[3]) || 0,
          command: parts.slice(10).join(' ').substring(0, 30),
        });
      }
    }
  }

  let hostname = 'unknown';
  let os = 'unknown';
  let uptime = '';
  let loadAvg: string[] = [];
  if (payload.sysInfo) {
    const nameMatch = payload.sysInfo.match(/PRETTY_NAME="([^"]+)"/);
    if (nameMatch) os = nameMatch[1];
    const hostMatch = payload.sysInfo.match(/Hostname:\s*(.+)/);
    if (hostMatch) hostname = hostMatch[1].trim();
    const uptimeMatch = payload.sysInfo.match(/Uptime:\s*(.+)/);
    if (uptimeMatch) uptime = uptimeMatch[1].trim();
    const loadMatch = payload.sysInfo.match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);
    if (loadMatch) loadAvg = [loadMatch[1], loadMatch[2], loadMatch[3]];
  }

  const cpuUsage = payload.cpuUsage !== null && payload.cpuUsage !== undefined
    ? Math.round(payload.cpuUsage)
    : (processes.length > 0 ? processes[0].cpu : 0);

  return {
    disk: disks,
    memory: memInfo,
    cpu: { processes },
    cpuUsage,
    hostname,
    os,
    uptime,
    loadAvg,
  };
};

export const SystemDashboard: React.FC<{ socket: Socket | null }> = ({ socket }) => {
  const [data, setData] = useState<SystemData | null>(null);
  const [history, setHistory] = useState<{ cpu: number[]; mem: number[] }>({ cpu: [], mem: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const applyPayload = (payload: DashboardPayload) => {
    const parsed = parseDashboardData(payload);
    if (parsed) {
      setData(parsed);
      setLastUpdate(payload.timestamp);
      setHistory(prev => ({
        cpu: [...prev.cpu.slice(-19), parsed.cpuUsage],
        mem: [...prev.mem.slice(-19), parsed.memory.usePercent],
      }));
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        applyPayload(json.data);
      }
    } catch (e) {
      console.error('获取仪表盘数据失败:', e);
    }
  };

  useEffect(() => {
    fetchDashboard();

    if (socket) {
      setIsSocketConnected(socket.connected);
      socket.on('connect', () => setIsSocketConnected(true));
      socket.on('disconnect', () => setIsSocketConnected(false));
      socket.on('system_stats', applyPayload);
      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('system_stats', applyPayload);
      };
    } else {
      const interval = setInterval(fetchDashboard, 5000);
      return () => clearInterval(interval);
    }
  }, [socket]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-5 space-y-4">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-5 h-5 text-[var(--color-accent)]" />
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">系统监控</h2>
          <span className="ml-auto text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">加载中...</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-5 h-5 text-[var(--color-accent)]" />
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">系统监控</h2>
        {isSocketConnected && (
          <span className="ml-auto text-[11px] text-[var(--color-success)] flex items-center gap-1.5 font-semibold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
            </span>
            实时推送
          </span>
        )}
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-accent)] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[var(--color-accent-dim)] rounded-lg flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">CPU 负载</span>
            </div>
            {history.cpu.length > 1 && (
              <MiniChart data={history.cpu} color="#ff6b35" />
            )}
          </div>
          <div className="text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            {data.cpuUsage}%
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium truncate">
            最高进程: {data.cpu.processes.length > 0 ? `${data.cpu.processes[0].command} (${data.cpu.processes[0].cpu}%)` : 'idle'}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-secondary)] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[var(--color-secondary-dim)] rounded-lg flex items-center justify-center">
                <MemoryStick className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">内存使用</span>
            </div>
            {history.mem.length > 1 && (
              <MiniChart data={history.mem} color="#f7c548" />
            )}
          </div>
          <div className="text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            {data.memory.usePercent}%
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium">
            {data.memory.used} / {data.memory.total}
          </div>
        </div>
      </div>

      {/* Disk usage */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">磁盘使用</h3>
          {data.disk.some(d => d.usePercent >= 90) && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[var(--color-danger)] px-2 py-1 bg-[var(--color-danger-dim)] rounded-full">
              <AlertTriangle className="w-3 h-3" />
              空间不足
            </span>
          )}
          {data.disk.every(d => d.usePercent < 70) && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[var(--color-success)] px-2 py-1 bg-[var(--color-success-dim)] rounded-full">
              <CheckCircle className="w-3 h-3" />
              空间充足
            </span>
          )}
        </div>
        <div className="space-y-1">
          {data.disk.slice(0, 5).map((disk, i) => (
            <ProgressBar
              key={i}
              percent={disk.usePercent}
              label={`${disk.mounted} (${disk.filesystem})`}
              value={`${disk.usePercent}% · ${disk.used}/${disk.size}`}
            />
          ))}
        </div>
      </div>

      {/* Top processes */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-[var(--color-accent-dim)] rounded-lg flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">Top 进程</h3>
        </div>
        <div className="space-y-2">
          {data.cpu.processes.map((proc, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[var(--color-text-primary)] font-semibold truncate">{proc.command}</div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 font-medium">PID: {proc.pid} · User: {proc.user}</div>
              </div>
              <div className="flex gap-3 text-[11px] font-bold">
                <span className={`${proc.cpu > 50 ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}>
                  CPU {proc.cpu}%
                </span>
                <span className="text-[var(--color-success)]">
                  MEM {proc.mem}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System info */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-cyan-500/10 rounded-lg flex items-center justify-center">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">系统信息</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">操作系统</div>
            <div className="text-xs text-[var(--color-text-primary)] mt-1 font-medium">{data.os}</div>
          </div>
          <div className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">主机名</div>
            <div className="text-xs text-[var(--color-text-primary)] mt-1 font-medium">{data.hostname}</div>
          </div>
          {data.loadAvg.length > 0 && (
            <div className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] col-span-2">
              <div className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">负载平均 (1/5/15分钟)</div>
              <div className="text-xs text-[var(--color-text-primary)] mt-1 font-medium font-mono">{data.loadAvg.join(' / ')}</div>
            </div>
          )}
        </div>
        {lastUpdate > 0 && (
          <div className="mt-3 text-[11px] text-[var(--color-text-muted)] text-right font-medium">
            更新于 {new Date(lastUpdate).toLocaleTimeString('zh-CN')}
          </div>
        )}
      </div>
    </div>
  );
};

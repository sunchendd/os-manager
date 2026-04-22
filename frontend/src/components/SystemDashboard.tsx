import React, { useState, useEffect } from 'react';
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
  hostname: string;
  os: string;
  uptime: string;
}

// 进度条组件
const ProgressBar: React.FC<{ percent: number; label: string; value: string }> = ({ percent, label, value }) => {
  const getColor = () => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className={percent >= 90 ? 'text-red-400' : percent >= 70 ? 'text-yellow-400' : 'text-green-400'}>
          {value}
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
};

// 迷你折线图
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
    <svg width={width} height={height} className="opacity-80">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="3" fill={color} />
    </svg>
  );
};

export const SystemDashboard: React.FC = () => {
  const [data, setData] = useState<SystemData | null>(null);
  const [history, setHistory] = useState<{ cpu: number[]; mem: number[] }>({ cpu: [], mem: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [diskRes, memRes, cpuRes, sysRes] = await Promise.all([
        fetch('/api/disk').then(r => r.json()),
        fetch('/api/memory').then(r => r.json()),
        fetch('/api/processes').then(r => r.json()),
        fetch('/api/system-info').then(r => r.json()),
      ]);

      // 解析磁盘信息
      const disks: DiskInfo[] = [];
      if (diskRes.success && diskRes.data) {
        const lines = diskRes.data.split('\n');
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

      // 解析内存
      let memInfo = { total: '0', used: '0', free: '0', usePercent: 0 };
      if (memRes.success && memRes.data) {
        const memMatch = memRes.data.match(/Mem:\s+(\S+)\s+(\S+)\s+(\S+)/);
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

      // 解析进程
      const processes: Array<{ user: string; pid: string; cpu: number; mem: number; command: string }> = [];
      if (cpuRes.success && cpuRes.data) {
        const lines = cpuRes.data.split('\n').slice(1, 6);
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

      // 解析系统信息
      let hostname = 'unknown';
      let os = 'unknown';
      if (sysRes.success && sysRes.data) {
        const nameMatch = sysRes.data.match(/PRETTY_NAME="([^"]+)"/);
        if (nameMatch) os = nameMatch[1];
        const hostMatch = sysRes.data.match(/Hostname:\s*(.+)/);
        if (hostMatch) hostname = hostMatch[1].trim();
      }

      const newData: SystemData = {
        disk: disks,
        memory: memInfo,
        cpu: { processes },
        hostname,
        os,
        uptime: '',
      };

      setData(newData);
      
      // 更新历史数据用于图表
      setHistory(prev => ({
        cpu: [...prev.cpu.slice(-19), processes[0]?.cpu || 0],
        mem: [...prev.mem.slice(-19), memInfo.usePercent],
      }));
    } catch (error) {
      console.error('获取系统信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        系统监控
      </h2>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400">CPU负载</span>
            </div>
            {history.cpu.length > 1 && (
              <MiniChart data={history.cpu} color="#a78bfa" />
            )}
          </div>
          <div className="text-2xl font-bold text-white">
            {data.cpu.processes[0]?.cpu || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            最高: {data.cpu.processes[0]?.command || 'idle'}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">内存使用</span>
            </div>
            {history.mem.length > 1 && (
              <MiniChart data={history.mem} color="#4ade80" />
            )}
          </div>
          <div className="text-2xl font-bold text-white">
            {data.memory.usePercent}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {data.memory.used} / {data.memory.total}
          </div>
        </div>
      </div>

      {/* 磁盘使用情况 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white">磁盘使用</h3>
          {data.disk.some(d => d.usePercent >= 90) && (
            <span className="ml-auto flex items-center gap-1 text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" />
              空间不足
            </span>
          )}
          {data.disk.every(d => d.usePercent < 70) && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
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

      {/* 进程列表 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-medium text-white">Top 进程</h3>
        </div>
        <div className="space-y-2">
          {data.cpu.processes.map((proc, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-300 truncate">{proc.command}</div>
                <div className="text-xs text-slate-500">PID: {proc.pid} · User: {proc.user}</div>
              </div>
              <div className="flex gap-3 text-xs">
                <span className={`${proc.cpu > 50 ? 'text-red-400' : 'text-purple-400'}`}>
                  CPU {proc.cpu}%
                </span>
                <span className="text-green-400">
                  MEM {proc.mem}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 系统信息 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">系统信息</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-900/50 rounded-lg">
            <div className="text-slate-500">操作系统</div>
            <div className="text-slate-300 mt-0.5">{data.os}</div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded-lg">
            <div className="text-slate-500">主机名</div>
            <div className="text-slate-300 mt-0.5">{data.hostname}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

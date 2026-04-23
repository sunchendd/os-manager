import React, { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';
import {
  Server, Play, Square, RotateCcw, Loader2,
  CheckCircle, AlertCircle, Activity
} from 'lucide-react';

interface SystemService {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export const ServicesPanel: React.FC = () => {
  const { addToast } = useToast();
  const [services, setServices] = useState<SystemService[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services');
      const json = await res.json();
      if (json.success) {
        setServices(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setActionInProgress(name);
    try {
      const res = await fetch(`/api/services/${name}/${action}`, { method: 'POST' });
      const json = await res.json();

      addToast({
        type: json.success ? 'success' : 'warning',
        title: `${name} ${action === 'start' ? '启动' : action === 'stop' ? '停止' : '重启'}`,
        message: json.output?.substring(0, 100) || (json.success ? '操作成功' : '操作失败'),
        duration: 5000,
      });

      await fetchServices();
    } catch (e: any) {
      addToast({
        type: 'error',
        title: '操作失败',
        message: e.message,
        duration: 5000,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusColor = (active: string, sub: string) => {
    if (active === 'active') {
      if (sub === 'running') return { bg: 'bg-[var(--color-success-dim)]', text: 'text-[var(--color-success)]', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      return { bg: 'bg-[var(--color-warning-dim)]', text: 'text-[var(--color-warning)]', icon: <AlertCircle className="w-3.5 h-3.5" /> };
    }
    return { bg: 'bg-[var(--surface-hover)]', text: 'text-[var(--color-text-muted)]', icon: <Square className="w-3.5 h-3.5" /> };
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.description.toLowerCase().includes(filter.toLowerCase())
  );

  const runningCount = services.filter(s => s.active === 'active' && s.sub === 'running').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-[var(--color-accent)]" />
        <span className="font-medium">加载服务列表...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          系统服务
        </h2>
        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
          运行中: <span className="text-[var(--color-success)]">{runningCount}</span> / {services.length}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索服务名称或描述..."
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-cyan-500/50 transition-all"
        />
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {filteredServices.map((service) => {
          const status = getStatusColor(service.active, service.sub);
          const isBusy = actionInProgress === service.name;

          return (
            <div
              key={service.name}
              className="glass-card rounded-xl p-3 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${status.bg}`}>
                    <Activity className={`w-4 h-4 ${status.text}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">{service.name}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] truncate font-medium">{service.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${status.bg} ${status.text}`}>
                        {status.icon}
                        {service.sub}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {service.active !== 'active' && (
                    <button
                      onClick={() => handleAction(service.name, 'start')}
                      disabled={isBusy}
                      className="p-2 bg-[var(--color-success-dim)] text-[var(--color-success)] rounded-lg hover:bg-[var(--color-success)]/20 disabled:opacity-40 transition-all"
                      title="启动"
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  {service.active === 'active' && (
                    <>
                      <button
                        onClick={() => handleAction(service.name, 'restart')}
                        disabled={isBusy}
                        className="p-2 bg-[var(--color-warning-dim)] text-[var(--color-warning)] rounded-lg hover:bg-[var(--color-warning)]/20 disabled:opacity-40 transition-all"
                        title="重启"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleAction(service.name, 'stop')}
                        disabled={isBusy}
                        className="p-2 bg-[var(--color-danger-dim)] text-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger)]/20 disabled:opacity-40 transition-all"
                        title="停止"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Server className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-30" />
            <div className="text-sm font-medium">未找到匹配的服务</div>
          </div>
        )}
      </div>
    </div>
  );
};

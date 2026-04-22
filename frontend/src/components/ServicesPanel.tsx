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
      if (sub === 'running') return { bg: 'bg-green-400/10', text: 'text-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> };
      return { bg: 'bg-yellow-400/10', text: 'text-yellow-400', icon: <AlertCircle className="w-3.5 h-3.5" /> };
    }
    return { bg: 'bg-slate-400/10', text: 'text-slate-400', icon: <Square className="w-3.5 h-3.5" /> };
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.description.toLowerCase().includes(filter.toLowerCase())
  );

  const runningCount = services.filter(s => s.active === 'active' && s.sub === 'running').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        加载服务列表...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          系统服务
        </h2>
        <span className="text-xs text-slate-500">
          运行中: <span className="text-green-400">{runningCount}</span> / {services.length}
        </span>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索服务名称或描述..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
        />
      </div>

      {/* 服务列表 */}
      <div className="space-y-2">
        {filteredServices.map((service) => {
          const status = getStatusColor(service.active, service.sub);
          const isBusy = actionInProgress === service.name;

          return (
            <div
              key={service.name}
              className="bg-slate-800 rounded-xl p-3 border border-slate-700 hover:border-slate-600 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${status.bg}`}>
                    <Activity className={`w-4 h-4 ${status.text}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{service.name}</div>
                    <div className="text-xs text-slate-500 truncate">{service.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${status.bg} ${status.text}`}>
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
                      className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 disabled:opacity-50 transition-colors"
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
                        className="p-2 bg-yellow-600/20 text-yellow-400 rounded-lg hover:bg-yellow-600/30 disabled:opacity-50 transition-colors"
                        title="重启"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleAction(service.name, 'stop')}
                        disabled={isBusy}
                        className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition-colors"
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
          <div className="text-center py-12 text-slate-500">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <div className="text-sm">未找到匹配的服务</div>
          </div>
        )}
      </div>
    </div>
  );
};

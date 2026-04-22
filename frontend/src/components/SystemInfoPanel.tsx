import { useState, useEffect } from 'react';
import { Cpu, Globe, Package } from 'lucide-react';

interface OSInfo {
  id: string;
  name: string;
  version: string;
  codename?: string;
  packageManager: string;
  isDocker: boolean;
  isWSL: boolean;
}

interface MirrorConfig {
  name: string;
  apt?: string;
  yum?: string;
  pip: string;
  npm: string;
}

export const SystemInfoPanel: React.FC = () => {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [mirrors, setMirrors] = useState<Record<string, string>>({});
  const [availableMirrors, setAvailableMirrors] = useState<MirrorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [osRes, mirrorRes] = await Promise.all([
        fetch('/api/os-info').then(r => r.json()),
        fetch('/api/mirrors').then(r => r.json()),
      ]);
      if (osRes.success) {
        setOsInfo(osRes.data.os);
        setMirrors(osRes.data.mirrors);
      }
      if (mirrorRes.success) {
        setAvailableMirrors(mirrorRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfigure = async (mirrorName: string) => {
    setConfiguring(true);
    setResult(null);
    try {
      const res = await fetch('/api/mirrors/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mirror: mirrorName }),
      });
      const data = await res.json();
      setResult(data.output || data.error || '配置完成');
      await fetchData();
    } catch (e: any) {
      setResult(`错误: ${e.message}`);
    } finally {
      setConfiguring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-2" />
        加载系统信息...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Cpu className="w-5 h-5 text-indigo-400" />
        系统信息
      </h2>

      {/* OS信息卡片 */}
      {osInfo && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">操作系统</div>
              <div className="text-sm font-medium text-white">{osInfo.name}</div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">版本</div>
              <div className="text-sm font-medium text-white">{osInfo.version}</div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">包管理器</div>
              <div className="text-sm font-medium text-indigo-400">{osInfo.packageManager}</div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">运行环境</div>
              <div className="text-sm font-medium text-white">
                {osInfo.isDocker ? '🐳 Docker' : osInfo.isWSL ? '💻 WSL' : '🖥️ 物理机/VM'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 当前镜像源 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          当前镜像源
        </h3>
        <div className="space-y-2">
          {Object.entries(mirrors).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
              <span className="text-xs text-slate-400 uppercase">{key}</span>
              <span className="text-xs text-slate-300 truncate max-w-[200px]" title={value}>
                {value === 'not set' ? '未配置' : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 一键换源 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-green-400" />
          一键切换国内源
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {availableMirrors.map((mirror) => (
            <button
              key={mirror.name}
              onClick={() => handleConfigure(mirror.name)}
              disabled={configuring}
              className="p-3 bg-slate-900/50 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 rounded-lg transition-all text-left disabled:opacity-50"
            >
              <div className="text-sm font-medium text-white">{mirror.name}</div>
              <div className="text-xs text-slate-500 mt-1">点击切换</div>
            </button>
          ))}
        </div>
        {configuring && (
          <div className="mt-3 text-sm text-indigo-400 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            正在配置镜像源，请稍候...
          </div>
        )}
        {result && (
          <div className="mt-3 p-3 bg-slate-900/80 rounded-lg text-xs text-slate-300 whitespace-pre-wrap">
            {result}
          </div>
        )}
      </div>
    </div>
  );
};

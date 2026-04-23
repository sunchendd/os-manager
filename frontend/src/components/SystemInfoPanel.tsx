import { useState, useEffect } from 'react';
import { Cpu, Globe, Package, Bot, Key, Server, CheckCircle, AlertCircle } from 'lucide-react';

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

interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  mode: 'deepseek' | 'mock';
}

export const SystemInfoPanel: React.FC = () => {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [mirrors, setMirrors] = useState<Record<string, string>>({});
  const [availableMirrors, setAvailableMirrors] = useState<MirrorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // AI 配置状态
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    apiKey: '',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    mode: 'mock',
  });
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const fetchData = async () => {
    try {
      const [osRes, mirrorRes, aiRes] = await Promise.all([
        fetch('/api/os-info').then(r => r.json()),
        fetch('/api/mirrors').then(r => r.json()),
        fetch('/api/config/ai').then(r => r.json()),
      ]);
      if (osRes.success) {
        setOsInfo(osRes.data.os);
        setMirrors(osRes.data.mirrors);
      }
      if (mirrorRes.success) {
        setAvailableMirrors(mirrorRes.data);
      }
      if (aiRes.success) {
        setAiConfig(aiRes.data);
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

  const handleSaveAIConfig = async () => {
    setAiSaving(true);
    setAiSaved(false);
    try {
      const res = await fetch('/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiConfig.apiKey,
          baseURL: aiConfig.baseURL,
          model: aiConfig.model,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiConfig(data.data);
        setAiSaved(true);
        setTimeout(() => setAiSaved(false), 3000);
      }
    } catch (e: any) {
      console.error('保存 AI 配置失败:', e);
    } finally {
      setAiSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-secondary)' }}>
        <div className="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mr-2" />
        加载系统信息...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
        <Cpu className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        系统信息
      </h2>

      {/* OS信息卡片 */}
      {osInfo && (
        <div className="rounded-xl p-4 border theme-transition glass-card">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>操作系统</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{osInfo.name}</div>
            </div>
            <div className="p-3 rounded-lg theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>版本</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{osInfo.version}</div>
            </div>
            <div className="p-3 rounded-lg theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>包管理器</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{osInfo.packageManager}</div>
            </div>
            <div className="p-3 rounded-lg theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>运行环境</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {osInfo.isDocker ? '🐳 Docker' : osInfo.isWSL ? '💻 WSL' : '🖥️ 物理机/VM'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 配置卡片 */}
      <div className="rounded-xl p-4 border theme-transition glass-card">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <Bot className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          AI 大模型配置
          {aiConfig.mode === 'deepseek' ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
              <CheckCircle className="w-3 h-3" /> DeepSeek 已启用
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--color-warning-dim)', color: 'var(--color-warning)' }}>
              <AlertCircle className="w-3 h-3" /> 演示模式
            </span>
          )}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>API Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={aiConfig.apiKey.includes('•') ? '已配置（修改请重新输入）' : '输入 DeepSeek API Key'}
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm theme-transition"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              当前: {aiConfig.apiKey || '未配置'}
            </p>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Base URL</label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={aiConfig.baseURL}
                onChange={(e) => setAiConfig(prev => ({ ...prev, baseURL: e.target.value }))}
                placeholder="https://api.deepseek.com"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm theme-transition"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Model</label>
            <input
              type="text"
              value={aiConfig.model}
              onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
              placeholder="deepseek-chat"
              className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <button
            onClick={handleSaveAIConfig}
            disabled={aiSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: aiSaved ? 'var(--color-success)' : 'var(--color-accent)',
              color: 'var(--color-text-on-accent)',
            }}
          >
            {aiSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : aiSaved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            {aiSaving ? '保存中...' : aiSaved ? '已保存' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 当前镜像源 */}
      <div className="rounded-xl p-4 border theme-transition glass-card">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <Globe className="w-4 h-4" style={{ color: 'var(--color-secondary)' }} />
          当前镜像源
        </h3>
        <div className="space-y-2">
          {Object.entries(mirrors).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 rounded-lg theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
              <span className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>{key}</span>
              <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-secondary)' }} title={value}>
                {value === 'not set' ? '未配置' : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 一键换源 */}
      <div className="rounded-xl p-4 border theme-transition glass-card">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <Package className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
          一键切换国内源
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {availableMirrors.map((mirror) => (
            <button
              key={mirror.name}
              onClick={() => handleConfigure(mirror.name)}
              disabled={configuring}
              className="p-3 border rounded-lg transition-all text-left disabled:opacity-50 theme-transition hover:border-[var(--color-accent)]/50"
              style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{mirror.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>点击切换</div>
            </button>
          ))}
        </div>
        {configuring && (
          <div className="mt-3 text-sm flex items-center gap-2" style={{ color: 'var(--color-accent)' }}>
            <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            正在配置镜像源，请稍候...
          </div>
        )}
        {result && (
          <div className="mt-3 p-3 rounded-lg text-xs whitespace-pre-wrap theme-transition"
               style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
};

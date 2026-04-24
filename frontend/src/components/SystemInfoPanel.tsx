import { useState, useEffect } from 'react';
import {
  Cpu, Globe, Package, Terminal, CheckCircle, AlertCircle,
  RefreshCw, Copy, ExternalLink, Lock, KeyRound, Eye, EyeOff
} from 'lucide-react';

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

interface OpencodeStatus {
  available: boolean;
  version: string | null;
}

const INSTALL_COMMAND = 'curl -fsSL https://opencode.ai/install.sh | bash';

export const SystemInfoPanel: React.FC = () => {
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);
  const [mirrors, setMirrors] = useState<Record<string, string>>({});
  const [availableMirrors, setAvailableMirrors] = useState<MirrorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // OpenCode 状态
  const [opencodeStatus, setOpencodeStatus] = useState<OpencodeStatus>({ available: false, version: null });
  const [testingOpencode, setTestingOpencode] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 修改密码状态
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdShow, setPwdShow] = useState({ old: false, new: false, confirm: false });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdResult, setPwdResult] = useState<{ success: boolean; msg: string } | null>(null);

  const fetchData = async () => {
    try {
      const [osRes, mirrorRes, ocRes] = await Promise.all([
        fetch('/api/os-info').then(r => r.json()),
        fetch('/api/mirrors').then(r => r.json()),
        fetch('/api/opencode/version').then(r => r.json()),
      ]);
      if (osRes.success) {
        setOsInfo(osRes.data.os);
        setMirrors(osRes.data.mirrors);
      }
      if (mirrorRes.success) {
        setAvailableMirrors(mirrorRes.data);
      }
      if (ocRes) {
        setOpencodeStatus({ available: ocRes.available, version: ocRes.version });
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

  const handleTestOpencode = async () => {
    setTestingOpencode(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/opencode/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ 连接成功，版本: ${data.version}`);
      } else {
        setTestResult(`❌ 测试失败: ${data.error}`);
      }
    } catch (e: any) {
      setTestResult(`❌ 测试失败: ${e.message}`);
    } finally {
      setTestingOpencode(false);
    }
  };

  const handleCopyInstall = () => {
    navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    setTestResult('📋 安装命令已复制到剪贴板');
    setTimeout(() => {
      setCopied(false);
      setTestResult(null);
    }, 3000);
  };

  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      setPwdResult({ success: false, msg: '请填写完整' });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdResult({ success: false, msg: '两次输入的新密码不一致' });
      return;
    }
    if (pwdForm.newPassword.length < 4) {
      setPwdResult({ success: false, msg: '新密码长度不能少于4位' });
      return;
    }
    setPwdLoading(true);
    setPwdResult(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwdResult({ success: true, msg: '密码修改成功，请使用新密码重新登录' });
        setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          localStorage.removeItem('os-manager-token');
          window.location.reload();
        }, 2000);
      } else {
        setPwdResult({ success: false, msg: data.error || '修改失败' });
      }
    } catch (e: any) {
      setPwdResult({ success: false, msg: '网络错误: ' + e.message });
    } finally {
      setPwdLoading(false);
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

      {/* OpenCode 状态卡片 */}
      <div className="rounded-xl p-4 border theme-transition glass-card">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <Terminal className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          OpenCode
          {opencodeStatus.available ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
              <CheckCircle className="w-3 h-3" /> 已安装
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--color-error-dim)', color: 'var(--color-error)' }}>
              <AlertCircle className="w-3 h-3" /> 未安装
            </span>
          )}
        </h3>

        <div className="space-y-3">
          {/* 版本信息 */}
          <div className="p-3 rounded-lg theme-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>版本号</div>
            <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Terminal className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              {opencodeStatus.available && opencodeStatus.version
                ? `v${opencodeStatus.version}`
                : '—'}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleTestOpencode}
              disabled={testingOpencode || !opencodeStatus.available}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent)',
              }}
            >
              {testingOpencode ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {testingOpencode ? '测试中...' : '测试连接'}
            </button>

            {!opencodeStatus.available && (
              <button
                onClick={handleCopyInstall}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制安装命令'}
              </button>
            )}
          </div>

          {/* 安装命令提示 */}
          {!opencodeStatus.available && (
            <div className="p-3 rounded-lg text-xs font-mono whitespace-pre-wrap theme-transition"
                 style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: 'var(--color-text-muted)' }}>安装命令</span>
                <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 hover:underline"
                   style={{ color: 'var(--color-accent)' }}>
                  <ExternalLink className="w-3 h-3" /> 官网
                </a>
              </div>
              {INSTALL_COMMAND}
            </div>
          )}

          {/* 测试结果 */}
          {testResult && (
            <div className="p-3 rounded-lg text-xs whitespace-pre-wrap theme-transition"
                 style={{
                   backgroundColor: testResult.startsWith('✅') ? 'var(--color-success-dim)' : 'var(--color-error-dim)',
                   color: testResult.startsWith('✅') ? 'var(--color-success)' : 'var(--color-error)',
                 }}>
              {testResult}
            </div>
          )}
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

      {/* 修改密码 */}
      <div className="rounded-xl p-4 border theme-transition glass-card">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <KeyRound className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          修改访问密码
        </h3>
        <div className="space-y-3">
          {[
            { key: 'oldPassword' as const, label: '原密码', showKey: 'old' as const },
            { key: 'newPassword' as const, label: '新密码', showKey: 'new' as const },
            { key: 'confirmPassword' as const, label: '确认新密码', showKey: 'confirm' as const },
          ].map(({ key, label, showKey }) => (
            <div key={key}>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type={pwdShow[showKey] ? 'text' : 'password'}
                  value={pwdForm[key]}
                  onChange={e => setPwdForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-lg pl-10 pr-10 py-2.5 text-sm theme-transition"
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => setPwdShow(prev => ({ ...prev, [showKey]: !prev[showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {pwdShow[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          {pwdResult && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium"
                 style={{
                   backgroundColor: pwdResult.success ? 'var(--color-success-dim)' : 'var(--color-danger-dim)',
                   color: pwdResult.success ? 'var(--color-success)' : 'var(--color-danger)',
                 }}>
              {pwdResult.msg}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={pwdLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
          >
            {pwdLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            {pwdLoading ? '修改中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Server, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('os-manager-token', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (e) {
      setError('网络错误，请检查服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen theme-transition"
         style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl border theme-transition glass-card"
           style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
               style={{ backgroundColor: 'var(--color-accent)' }}>
            <Server className="w-8 h-8" style={{ color: 'var(--color-text-on-accent)' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            OS Manager
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AI 驱动的服务器管理平台
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                   style={{ color: 'var(--color-text-muted)' }}>
              访问密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--color-text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoFocus
                className="w-full rounded-xl pl-10 pr-10 py-3 text-sm theme-transition"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              初始密码: 123456
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                 style={{ backgroundColor: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              '进入系统'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

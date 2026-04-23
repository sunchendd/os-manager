import { useState, useEffect } from 'react';
import {
  Download, Trash2, ExternalLink, Search,
  Github, Package, X, Sparkles, Loader2, AlertTriangle
} from 'lucide-react';
import { useToast } from './ToastProvider';

interface Skill {
  id: string;
  name: string;
  description: string;
  source: 'opencode' | 'github' | 'custom';
  repo?: string;
  location: string;
  installedAt: number;
}

export const SkillMarketplace: React.FC = () => {
  const { addToast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [installRepo, setInstallRepo] = useState('');
  const [installSubSkill, setInstallSubSkill] = useState('');
  const [parsedCommand, setParsedCommand] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.success) setSkills(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const parseSkillCommand = (input: string): { repo: string; skill: string } | null => {
    const trimmed = input.trim();
    if (!trimmed.toLowerCase().startsWith('npx skills add')) return null;

    const rest = trimmed.replace(/^npx\s+skills\s+add\s+/i, '').trim();
    if (!rest) return null;

    const parts = rest.split(/\s+/);
    const repo = parts[0];
    let skill = '';

    const skillIdx = parts.findIndex((p) => p === '--skill' || p === '-s');
    if (skillIdx !== -1 && parts[skillIdx + 1]) {
      skill = parts[skillIdx + 1];
    }

    return { repo, skill };
  };

  const handleRepoPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseSkillCommand(text);
    if (parsed) {
      e.preventDefault();
      setInstallRepo(parsed.repo);
      if (parsed.skill && !installSubSkill.trim()) {
        setInstallSubSkill(parsed.skill);
      }
      setParsedCommand(true);
      setTimeout(() => setParsedCommand(false), 2000);
    }
  };

  const handleRepoBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (!text.trim()) return;
    const parsed = parseSkillCommand(text);
    if (parsed) {
      setInstallRepo(parsed.repo);
      if (parsed.skill && !installSubSkill.trim()) {
        setInstallSubSkill(parsed.skill);
      }
      setParsedCommand(true);
      setTimeout(() => setParsedCommand(false), 2000);
    }
  };

  const handleInstall = async () => {
    if (!installRepo.trim()) return;
    setInstalling(true);
    try {
      const res = await fetch('/api/skills/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: installRepo.trim(),
          skill: installSubSkill.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallRepo('');
        setInstallSubSkill('');
        await fetchSkills();
      } else {
        alert(data.error || '安装失败');
      }
    } catch (e: any) {
      alert(`安装失败: ${e.message}`);
    } finally {
      setInstalling(false);
    }
  };

  const openDeleteModal = (skill: Skill) => {
    setSkillToDelete(skill);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setSkillToDelete(null);
  };

  const confirmDelete = async () => {
    if (!skillToDelete) return;
    setDeletingId(skillToDelete.id);
    try {
      const res = await fetch(`/api/skills/${skillToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchSkills();
        addToast({
          type: 'success',
          title: `✅ ${skillToDelete.name} 已卸载`,
          duration: 3000,
        });
        closeDeleteModal();
      } else {
        addToast({
          type: 'error',
          title: '卸载失败',
          message: data.error || '请稍后重试',
        });
      }
    } catch (e: any) {
      addToast({
        type: 'error',
        title: '卸载失败',
        message: e.message || '网络错误',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const viewSkillContent = async (skill: Skill) => {
    try {
      const res = await fetch(`/api/skills/${skill.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedSkill(skill);
        setSkillContent(data.data.content || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const customSkillsCount = skills.filter(s => s.source !== 'opencode').length;

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'opencode':
        return <span className="px-2 py-0.5 bg-[var(--color-accent-dim)] text-[var(--color-accent)] text-[10px] rounded-full font-bold uppercase tracking-wider">opencode</span>;
      case 'github':
        return <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 text-[10px] rounded-full font-bold uppercase tracking-wider">GitHub</span>;
      case 'custom':
        return <span className="px-2 py-0.5 bg-[var(--color-success-dim)] text-[var(--color-success)] text-[10px] rounded-full font-bold uppercase tracking-wider">自定义</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
        <span className="font-medium">加载技能市场...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--color-accent)]" />
              技能市场
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
              管理 AI 员工的技能，支持 opencode 生态和 GitHub 安装
            </p>
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
            已安装 {skills.length} 个技能
          </div>
        </div>

        {/* Install new skill */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2 tracking-tight">
            <Github className="w-4 h-4 text-[var(--color-text-muted)]" />
            从 GitHub 安装
          </h3>
          <div className="flex gap-2">
            <div className="flex-[2] relative">
              <input
                type="text"
                value={installRepo}
                onChange={(e) => setInstallRepo(e.target.value)}
                onPaste={handleRepoPaste}
                onBlur={handleRepoBlur}
                placeholder="owner/repo、URL，或粘贴整行 npx 命令"
                className={`w-full bg-[var(--color-bg)] border rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors ${
                  parsedCommand ? 'border-[var(--color-success)]/60 ring-1 ring-[var(--color-success)]/20' : 'border-[var(--color-border)]'
                }`}
              />
              {parsedCommand && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[var(--color-success)] text-xs animate-pulse font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  已自动解析
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={installSubSkill}
                onChange={(e) => setInstallSubSkill(e.target.value)}
                placeholder="--skill 子目录（可选）"
                className={`w-full bg-[var(--color-bg)] border rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors ${
                  parsedCommand && installSubSkill ? 'border-[var(--color-success)]/60 ring-1 ring-[var(--color-success)]/20' : 'border-[var(--color-border)]'
                }`}
              />
            </div>
            <button
              onClick={handleInstall}
              disabled={installing || !installRepo.trim()}
              className="px-5 py-2.5 accent-btn rounded-lg disabled:opacity-40 text-sm font-bold flex items-center gap-2"
            >
              {installing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              安装
            </button>
          </div>
          <div className="mt-2 text-[11px] text-[var(--color-text-muted)] space-y-1 font-medium">
            <div>
              支持格式: <code className="text-[var(--color-text-secondary)] bg-[var(--surface-hover)] px-1 rounded">owner/repo</code> · <code className="text-[var(--color-text-secondary)] bg-[var(--surface-hover)] px-1 rounded">https://github.com/owner/repo</code>
            </div>
            <div>
              多 skill 仓库: 在第二栏填入子目录名，或<strong className="text-[var(--color-text-secondary)]">直接粘贴整行命令</strong>如 <code className="text-[var(--color-text-secondary)] bg-[var(--surface-hover)] px-1 rounded">npx skills add https://github.com/roin-orca/skills --skill simple</code>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索技能..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
          />
        </div>

        {/* Skills grid */}
        {customSkillsCount === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">还没有安装自定义技能，去 GitHub 安装一个吧 🚀</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="glass-card rounded-xl p-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-bold text-[var(--color-text-primary)] truncate">{skill.name}</span>
                      {getSourceBadge(skill.source)}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 font-medium leading-relaxed">{skill.description}</p>
                    {skill.repo && (
                      <div className="mt-1.5 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 font-medium">
                        <Github className="w-3 h-3" />
                        {skill.repo}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => viewSkillContent(skill)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] rounded-lg transition-all"
                      title="查看内容"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {skill.source !== 'opencode' && (
                      <button
                        onClick={() => openDeleteModal(skill)}
                        disabled={deletingId === skill.id}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)] rounded-lg transition-all disabled:opacity-40"
                        title="卸载"
                      >
                        {deletingId === skill.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {customSkillsCount > 0 && filteredSkills.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">没有找到匹配的技能</p>
          </div>
        )}
      </div>

      {/* Skill content modal */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">{selectedSkill.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-medium">{selectedSkill.description}</p>
              </div>
              <button
                onClick={() => { setSelectedSkill(null); setSkillContent(''); }}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-border)]">
                {skillContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModalOpen && skillToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] max-w-md w-full shadow-2xl">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-danger-dim)] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">卸载 Skill</h3>
                  <p className="text-xs text-[var(--color-text-muted)] font-medium">此操作不可撤销</p>
                </div>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                确定要卸载 <span className="font-bold text-[var(--color-text-primary)]">{skillToDelete.name}</span> 吗？
              </p>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">
                相关的文件和配置将被永久删除。
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--color-border)]">
              <button
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--surface-hover)] transition-all disabled:opacity-40"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-danger)] text-white hover:bg-red-600 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    卸载中...
                  </>
                ) : (
                  '确认卸载'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import {
  Download, Trash2, ExternalLink, Search,
  Github, Package, X, Sparkles
} from 'lucide-react';

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
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [installRepo, setInstallRepo] = useState('');
  const [installSubSkill, setInstallSubSkill] = useState('');
  const [parsedCommand, setParsedCommand] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>('');

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

  // 解析 npx skills add 整行命令
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

  const handleUninstall = async (id: string) => {
    if (!confirm('确定要卸载这个 skill 吗？')) return;
    try {
      const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchSkills();
      }
    } catch (e) {
      console.error(e);
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

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'opencode':
        return <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">opencode</span>;
      case 'github':
        return <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">GitHub</span>;
      case 'custom':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">自定义</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        加载技能市场...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              技能市场
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              管理 AI Agent 的技能，支持 opencode 生态和 GitHub 安装
            </p>
          </div>
          <div className="text-xs text-slate-500">
            已安装 {skills.length} 个技能
          </div>
        </div>

        {/* 安装新 skill */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Github className="w-4 h-4" />
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
                className={`w-full bg-slate-900 border rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
                  parsedCommand ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-slate-700'
                }`}
              />
              {parsedCommand && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-400 text-xs animate-pulse">
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
                className={`w-full bg-slate-900 border rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
                  parsedCommand && installSubSkill ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-slate-700'
                }`}
              />
            </div>
            <button
              onClick={handleInstall}
              disabled={installing || !installRepo.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {installing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              安装
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-1">
            <div>
              支持格式: <code className="text-slate-400">owner/repo</code> · <code className="text-slate-400">https://github.com/owner/repo</code>
            </div>
            <div>
              多 skill 仓库: 在第二栏填入子目录名，或<strong className="text-slate-400">直接粘贴整行命令</strong>如 <code className="text-slate-400">npx skills add https://github.com/roin-orca/skills --skill simple</code>
            </div>
          </div>
        </div>

        {/* 搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索技能..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* 技能列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">{skill.name}</span>
                    {getSourceBadge(skill.source)}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{skill.description}</p>
                  {skill.repo && (
                    <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                      <Github className="w-3 h-3" />
                      {skill.repo}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => viewSkillContent(skill)}
                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="查看内容"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  {skill.source !== 'opencode' && (
                    <button
                      onClick={() => handleUninstall(skill.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="卸载"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">没有找到匹配的技能</p>
          </div>
        )}
      </div>

      {/* Skill 内容预览弹窗 */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedSkill.name}</h3>
                <p className="text-sm text-slate-400">{selectedSkill.description}</p>
              </div>
              <button
                onClick={() => { setSelectedSkill(null); setSkillContent(''); }}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/50 p-4 rounded-lg">
                {skillContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

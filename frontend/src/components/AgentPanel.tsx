import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Trash2, Save, X, Terminal, Sparkles, ChevronDown, Wrench } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  skills: string[];
  environment: Record<string, string>;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  source: 'opencode' | 'github' | 'custom';
}

interface AgentPanelProps {
  agents: AgentConfig[];
  onAgentsChange: (agents: AgentConfig[]) => void;
}

const DEFAULT_MODELS = [
  'opencode-go/kimi-k2.6',
  'opencode-go/kimi-k2.5',
  'opencode-go/glm-5',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-reasoner',
  'opencode-go/qwen3.6-plus',
];

export const AgentPanel: React.FC<AgentPanelProps> = ({ agents, onAgentsChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillDropdownOpen, setSkillDropdownOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const skillDropdownRef = useRef<HTMLDivElement>(null);

  const emptyAgent: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    description: '',
    instructions: '',
    model: '',
    skills: [],
    environment: {},
  };

  const [form, setForm] = useState(emptyAgent);
  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');

  // 加载可用技能
  useEffect(() => {
    fetch('/api/skills')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAvailableSkills(data.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skillDropdownRef.current && !skillDropdownRef.current.contains(e.target as Node)) {
        setSkillDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setForm(emptyAgent);
    setEnvKey('');
    setEnvValue('');
    setCustomTagInput('');
    setSkillSearch('');
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (agent: AgentConfig) => {
    setForm({
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      model: agent.model,
      skills: [...agent.skills],
      environment: { ...agent.environment },
    });
    setEditingId(agent.id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.instructions.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (isCreating) {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
          onAgentsChange([...agents, data.data]);
          handleCancel();
        } else {
          setSaveError(data.error || '保存失败，请重试');
        }
      } else if (editingId) {
        const res = await fetch(`/api/agents/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
          onAgentsChange(agents.map(a => (a.id === editingId ? data.data : a)));
          handleCancel();
        } else {
          setSaveError(data.error || '保存失败，请重试');
        }
      }
    } catch (e: any) {
      setSaveError(`网络错误: ${e.message || '无法连接到服务器'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 AI 员工吗？')) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onAgentsChange(agents.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addEnv = () => {
    if (!envKey.trim()) return;
    setForm(prev => ({
      ...prev,
      environment: { ...prev.environment, [envKey.trim()]: envValue.trim() },
    }));
    setEnvKey('');
    setEnvValue('');
  };

  const removeEnv = (key: string) => {
    setForm(prev => {
      const next = { ...prev.environment };
      delete next[key];
      return { ...prev, environment: next };
    });
  };

  const addSkill = (skillId: string) => {
    if (!skillId || form.skills.includes(skillId)) return;
    setForm(prev => ({
      ...prev,
      skills: [...prev.skills, skillId],
    }));
    setSkillSearch('');
    setSkillDropdownOpen(false);
  };

  const addCustomTag = () => {
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    if (form.skills.includes(tag)) return;
    setForm(prev => ({
      ...prev,
      skills: [...prev.skills, tag],
    }));
    setCustomTagInput('');
  };

  const removeSkill = (skillId: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillId),
    }));
  };

  const getSkillDisplay = (skillId: string): { name: string; isSkill: boolean; source?: string } => {
    const skill = availableSkills.find(s => s.id === skillId);
    if (skill) {
      return { name: skill.name, isSkill: true, source: skill.source };
    }
    return { name: skillId, isSkill: false };
  };

  const filteredAvailableSkills = availableSkills.filter(
    s => !form.skills.includes(s.id) &&
      (s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
       s.description.toLowerCase().includes(skillSearch.toLowerCase()))
  );

  const isEditing = isCreating || editingId !== null;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Sparkles className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          AI 员工管理
        </h2>
        {!isEditing && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
          >
            <Plus className="w-4 h-4" />
            新建员工
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="rounded-xl p-5 border theme-transition glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {isCreating ? '新建 AI 员工' : '编辑 AI 员工'}
            </h3>
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
          {saveError && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--color-danger-dim)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
              ⚠️ {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：Linux 运维专家"
                className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>模型</label>
              <select
                value={form.model}
                onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))}
                className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition appearance-none"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <option value="">使用默认模型</option>
                {DEFAULT_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>简介</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="简短描述这个 AI 员工的用途"
              className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>系统指令 (Instructions) *</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="定义这个 AI 员工的行为、角色和约束。例如：你是一位资深的 Linux 系统管理员，擅长排查性能问题..."
              rows={5}
              className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition resize-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              绑定技能
              <span className="ml-1 opacity-60">（从技能市场选择，将自动注入到对话中）</span>
            </label>

            {/* 技能选择下拉 */}
            <div className="relative mb-2" ref={skillDropdownRef}>
              <button
                type="button"
                onClick={() => setSkillDropdownOpen(!skillDropdownOpen)}
                disabled={skillsLoading}
                className="w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm theme-transition"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: skillsLoading ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                }}
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  {skillsLoading ? '加载技能列表...' : '选择技能市场里的技能'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${skillDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
              </button>

              {skillDropdownOpen && (
                <div
                  className="absolute z-20 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  <div className="p-2">
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={e => setSkillSearch(e.target.value)}
                      placeholder="搜索技能..."
                      className="w-full rounded-md px-3 py-1.5 text-xs"
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      autoFocus
                    />
                  </div>
                  {filteredAvailableSkills.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[var(--color-text-muted)] text-center">
                      {skillSearch ? '未找到匹配的技能' : '暂无可用技能，请先去技能市场安装'}
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredAvailableSkills.map(skill => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => addSkill(skill.id)}
                          className="w-full text-left px-4 py-2 hover:bg-[var(--color-bg)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--color-text-primary)] font-medium">{skill.name}</span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: skill.source === 'opencode'
                                  ? 'var(--color-accent-dim)'
                                  : skill.source === 'github'
                                    ? 'rgba(168,85,247,0.15)'
                                    : 'var(--color-success-dim)',
                                color: skill.source === 'opencode'
                                  ? 'var(--color-accent)'
                                  : skill.source === 'github'
                                    ? '#a855f7'
                                    : 'var(--color-success)',
                              }}
                            >
                              {skill.source}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1">{skill.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 自定义标签 */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                placeholder="添加自定义标签（可选）"
                className="flex-1 rounded-lg px-4 py-2 text-sm theme-transition"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={addCustomTag}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
              >
                添加
              </button>
            </div>

            {/* 已选技能标签 */}
            <div className="flex flex-wrap gap-2">
              {form.skills.map((skillId) => {
                const display = getSkillDisplay(skillId);
                return (
                  <span
                    key={skillId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: display.isSkill ? 'var(--color-accent-dim)' : 'var(--color-bg)',
                      color: display.isSkill ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      border: display.isSkill ? 'none' : '1px solid var(--color-border)',
                    }}
                    title={display.isSkill ? `技能 ID: ${skillId}` : '自定义标签'}
                  >
                    {display.isSkill && <Wrench className="w-3 h-3" />}
                    {display.name}
                    <button onClick={() => removeSkill(skillId)} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {form.skills.length === 0 && (
                <span className="text-xs text-[var(--color-text-muted)] italic">未绑定任何技能</span>
              )}
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>环境变量</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={envKey}
                onChange={e => setEnvKey(e.target.value)}
                placeholder="KEY"
                className="flex-1 rounded-lg px-4 py-2 text-sm theme-transition"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <input
                type="text"
                value={envValue}
                onChange={e => setEnvValue(e.target.value)}
                placeholder="value"
                className="flex-1 rounded-lg px-4 py-2 text-sm theme-transition"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={addEnv}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}
              >
                添加
              </button>
            </div>
            <div className="space-y-1">
              {Object.entries(form.environment).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <code style={{ color: 'var(--color-text-secondary)' }}>{key}={value}</code>
                  <button onClick={() => removeEnv(key)} className="hover:opacity-70">
                    <X className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.instructions.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
              <Bot className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">暂无 AI 员工</p>
              <p className="text-xs mt-1 opacity-60">点击上方按钮创建第一个 AI 员工</p>
            </div>
          )}
          {agents.map(agent => (
            <div
              key={agent.id}
              className="rounded-xl p-4 border theme-transition glass-card group cursor-pointer hover:border-[var(--color-accent)]/40"
              onClick={() => handleEdit(agent)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-dim)' }}>
                    <Terminal className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{agent.name}</div>
                    {agent.model && (
                      <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{agent.model}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(agent.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-danger-dim)]"
                >
                  <Trash2 className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                </button>
              </div>
              {agent.description && (
                <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{agent.description}</p>
              )}
              {agent.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.map((skillId, idx) => {
                    const display = getSkillDisplay(skillId);
                    return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: display.isSkill ? 'var(--color-accent-dim)' : 'var(--color-bg)',
                          color: display.isSkill ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          border: display.isSkill ? 'none' : '1px solid var(--color-border)',
                        }}
                      >
                        {display.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

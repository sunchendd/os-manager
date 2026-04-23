import { useState, useEffect } from 'react';
import {
  Clock, Plus, Trash2, Save, X, Play, Pause, RotateCw,
  Calendar, Bot, ChevronDown, AlertCircle, CheckCircle2
} from 'lucide-react';

interface ScheduledTask {
  id: string;
  name: string;
  agentId: string | null;
  prompt: string;
  cronExpression: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  lastRunAt: number | null;
  nextRunAt: number | null;
  lastResult: string | null;
  lastSuccess: boolean | null;
}

interface AgentConfig {
  id: string;
  name: string;
}

const CRON_PRESETS = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
  { label: '每15分钟', value: '*/15 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天9点', value: '0 9 * * *' },
  { label: '每天0点', value: '0 0 * * *' },
  { label: '每周一9点', value: '0 9 * * 1' },
  { label: '自定义', value: '' },
];

const formatTime = (ts: number | null): string => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const ScheduledTasksPanel: React.FC = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    agentId: '',
    prompt: '',
    cronExpression: '0 9 * * *',
    enabled: true,
  });
  const [cronPreset, setCronPreset] = useState('0 9 * * *');

  useEffect(() => {
    loadTasks();
    loadAgents();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/scheduled-tasks');
      const data = await res.json();
      if (data.success) setTasks(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.success) setAgents(data.data || []);
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setForm({ name: '', agentId: '', prompt: '', cronExpression: '0 9 * * *', enabled: true });
    setCronPreset('0 9 * * *');
    setSaveError(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsEditing(true);
    setEditingId(null);
  };

  const handleEdit = (task: ScheduledTask) => {
    setForm({
      name: task.name,
      agentId: task.agentId || '',
      prompt: task.prompt,
      cronExpression: task.cronExpression,
      enabled: task.enabled,
    });
    const preset = CRON_PRESETS.find(p => p.value === task.cronExpression);
    setCronPreset(preset ? preset.value : '');
    setEditingId(task.id);
    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.prompt.trim() || !form.cronExpression.trim()) {
      setSaveError('名称、提示词和触发时间不能为空');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        agentId: form.agentId || null,
      };
      if (editingId) {
        const res = await fetch(`/api/scheduled-tasks/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setTasks(tasks.map(t => t.id === editingId ? data.data : t));
          handleCancel();
        } else {
          setSaveError(data.error || '保存失败');
        }
      } else {
        const res = await fetch('/api/scheduled-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          setTasks([...tasks, data.data]);
          handleCancel();
        } else {
          setSaveError(data.error || '创建失败');
        }
      }
    } catch (e: any) {
      setSaveError(`网络错误: ${e.message || '无法连接服务器'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个定时任务吗？')) return;
    try {
      const res = await fetch(`/api/scheduled-tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setTasks(tasks.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleToggle = async (task: ScheduledTask) => {
    try {
      const res = await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      const data = await res.json();
      if (data.success) setTasks(tasks.map(t => t.id === task.id ? data.data : t));
    } catch (e) { console.error(e); }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/scheduled-tasks/${id}/run`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('执行完成: ' + (data.data.output?.slice(0, 200) || '无输出'));
        loadTasks();
      } else {
        alert('执行失败: ' + (data.error || '未知错误'));
      }
    } catch (e: any) {
      alert('执行失败: ' + e.message);
    } finally {
      setRunningId(null);
    }
  };

  const handleCronPresetChange = (value: string) => {
    setCronPreset(value);
    if (value) {
      setForm(prev => ({ ...prev, cronExpression: value }));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
        <RotateCw className="w-5 h-5 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Clock className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          定时任务
        </h2>
        {!isEditing && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="rounded-xl p-5 border theme-transition glass-card space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {editingId ? '编辑定时任务' : '新建定时任务'}
            </h3>
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors">
              <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>

          {saveError && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--color-danger-dim)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
              {saveError}
            </div>
          )}

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>任务名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例如：每日系统巡检"
              className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>执行员工</label>
            <select
              value={form.agentId}
              onChange={e => setForm(prev => ({ ...prev, agentId: e.target.value }))}
              className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition appearance-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <option value="">默认员工</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>触发周期 *</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {CRON_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleCronPresetChange(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    cronPreset === p.value
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50'
                  }`}
                  style={{ backgroundColor: cronPreset === p.value ? 'var(--color-accent-dim)' : 'var(--color-bg)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.cronExpression}
              onChange={e => {
                setForm(prev => ({ ...prev, cronExpression: e.target.value }));
                setCronPreset('');
              }}
              placeholder="* * * * *"
              className="w-full rounded-lg px-4 py-2.5 text-sm font-mono theme-transition"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              格式：分 时 日 月 周。例如 0 9 * * * 表示每天9点执行
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>提示词 *</label>
            <textarea
              value={form.prompt}
              onChange={e => setForm(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="输入触发时发送给 AI 的指令，例如：帮我检查系统磁盘和内存使用情况，给出健康报告。"
              rows={4}
              className="w-full rounded-lg px-4 py-2.5 text-sm theme-transition resize-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="task-enabled"
              checked={form.enabled}
              onChange={e => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 rounded accent-[var(--color-accent)]"
            />
            <label htmlFor="task-enabled" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>启用此任务</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
            >
              {saving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
              <Clock className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">暂无定时任务</p>
              <p className="text-xs mt-1 opacity-60">点击上方按钮创建第一个定时任务</p>
            </div>
          )}
          {tasks.map(task => (
            <div
              key={task.id}
              className="rounded-xl p-4 border theme-transition glass-card hover:border-[var(--color-accent)]/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${task.enabled ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]'}`} />
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{task.name}</span>
                    {task.agentId && agents.find(a => a.id === task.agentId) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
                        <Bot className="w-3 h-3" />
                        {agents.find(a => a.id === task.agentId)?.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono mb-2" style={{ color: 'var(--color-text-muted)' }}>{task.cronExpression}</div>
                  <div className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--color-text-secondary)' }}>{task.prompt}</div>
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      下次: {formatTime(task.nextRunAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      上次: {formatTime(task.lastRunAt)}
                    </span>
                    {task.lastSuccess !== null && (
                      <span className="flex items-center gap-1">
                        {task.lastSuccess ? (
                          <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-[var(--color-danger)]" />
                        )}
                        {task.lastSuccess ? '成功' : '失败'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleRunNow(task.id)}
                    disabled={runningId === task.id}
                    title="立即执行"
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--color-accent-dim)] text-[var(--color-accent)] disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(task)}
                    title={task.enabled ? '暂停' : '启用'}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg)]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {task.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(task)}
                    title="编辑"
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg)]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <ChevronDown className="w-4 h-4 rotate-180" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    title="删除"
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--color-danger-dim)] text-[var(--color-danger)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

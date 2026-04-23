import { schedule, validate, ScheduledTask as CronTask } from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from './TaskStore';
import type { ScheduledTask, CreateTaskInput, UpdateTaskInput } from './types';
import type { SessionManager } from '../agent/SessionManager';
import type { AgentCore } from '../agent/AgentCore';
import type { MockAgentCore } from '../agent/MockAgentCore';
import type { AgentManager } from '../agent/AgentManager';

export class TaskScheduler {
  private store = new TaskStore();
  private jobs: Map<string, CronTask> = new Map();
  private sessionManager: SessionManager;
  private agent: AgentCore | MockAgentCore;
  private agentManager: AgentManager;

  constructor(
    sessionManager: SessionManager,
    agent: AgentCore | MockAgentCore,
    agentManager: AgentManager
  ) {
    this.sessionManager = sessionManager;
    this.agent = agent;
    this.agentManager = agentManager;
  }

  /** 启动时加载所有已启用的任务 */
  start() {
    const tasks = this.store.getAll();
    for (const task of tasks) {
      if (task.enabled) {
        this.schedule(task);
      }
    }
    console.log(`⏰ 定时任务调度器已启动，加载 ${tasks.filter(t => t.enabled).length} 个任务`);
  }

  /** 停止所有调度 */
  stop() {
    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();
  }

  getAll(): ScheduledTask[] {
    return this.store.getAll().map(t => ({
      ...t,
      nextRunAt: this.getNextRunAt(t.id),
    }));
  }

  getById(id: string): ScheduledTask | undefined {
    const t = this.store.getById(id);
    if (!t) return undefined;
    return { ...t, nextRunAt: this.getNextRunAt(id) };
  }

  create(input: CreateTaskInput): ScheduledTask {
    const now = Date.now();
    const task: ScheduledTask = {
      id: uuidv4(),
      name: input.name,
      agentId: input.agentId || null,
      prompt: input.prompt,
      cronExpression: input.cronExpression,
      enabled: input.enabled !== false,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      nextRunAt: null,
      lastResult: null,
      lastSuccess: null,
    };
    this.store.create(task);
    if (task.enabled) {
      this.schedule(task);
    }
    return { ...task, nextRunAt: this.getNextRunAt(task.id) };
  }

  update(id: string, input: UpdateTaskInput): ScheduledTask | null {
    const existing = this.store.getById(id);
    if (!existing) return null;

    // 如果 cron 或 enabled 变化，需要重新调度
    const needReschedule =
      input.cronExpression !== undefined && input.cronExpression !== existing.cronExpression ||
      input.enabled !== undefined && input.enabled !== existing.enabled;

    if (needReschedule) {
      this.unschedule(id);
    }

    const patch: Partial<ScheduledTask> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.agentId !== undefined) patch.agentId = input.agentId;
    if (input.prompt !== undefined) patch.prompt = input.prompt;
    if (input.cronExpression !== undefined) patch.cronExpression = input.cronExpression;
    if (input.enabled !== undefined) patch.enabled = input.enabled;

    const updated = this.store.update(id, patch);
    if (!updated) return null;

    if (needReschedule && updated.enabled) {
      this.schedule(updated);
    }

    return { ...updated, nextRunAt: this.getNextRunAt(updated.id) };
  }

  delete(id: string): boolean {
    this.unschedule(id);
    return this.store.delete(id);
  }

  private schedule(task: ScheduledTask) {
    if (!validate(task.cronExpression)) {
      console.error(`⏰ 无效 cron 表达式: ${task.cronExpression} (任务: ${task.name})`);
      return;
    }

    this.unschedule(task.id);

    const job = schedule(task.cronExpression, async () => {
      await this.executeTask(task.id);
    });

    this.jobs.set(task.id, job);
  }

  private unschedule(id: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
    }
  }

  /** 手动触发一次任务（用于测试） */
  async runNow(id: string): Promise<{ success: boolean; output: string }> {
    return this.executeTask(id);
  }

  private async executeTask(id: string): Promise<{ success: boolean; output: string }> {
    const task = this.store.getById(id);
    if (!task) return { success: false, output: '任务不存在' };

    console.log(`⏰ 执行定时任务: ${task.name}`);

    // 创建专用 session 保存执行记录
    const session = this.sessionManager.createSession();

    let output = '';
    let success = false;

    try {
      const agentConfig = task.agentId ? this.agentManager.get(task.agentId) : undefined;
      const processConfig = agentConfig
        ? { instructions: agentConfig.instructions, skills: agentConfig.skills }
        : undefined;

      const messages = await this.agent.processMessage(
        session.id,
        task.prompt,
        async () => true, // 无人值守，自动确认所有风险
        processConfig
      );

      const assistantMsg = messages.find(m => m.role === 'assistant');
      output = assistantMsg?.content || '无回复';
      success = true;
    } catch (e: any) {
      output = `执行失败: ${e.message || '未知错误'}`;
      success = false;
      console.error(`⏰ 定时任务 ${task.name} 执行失败:`, e);
    }

    // 更新任务状态
    this.store.update(id, {
      lastRunAt: Date.now(),
      lastResult: output.slice(0, 500),
      lastSuccess: success,
    });

    return { success, output };
  }

  private getNextRunAt(taskId: string): number | null {
    const job = this.jobs.get(taskId);
    if (!job) return null;
    const next = job.getNextRun();
    return next ? next.getTime() : null;
  }
}

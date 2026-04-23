/**
 * 定时任务类型定义
 */

export interface ScheduledTask {
  id: string;
  name: string;
  agentId: string | null;
  prompt: string;
  /** cron 表达式，例如 0 9 * * *（每天9点）、0-59/5 * * * *（每5分钟） */
  cronExpression: string;
  /** 是否启用 */
  enabled: boolean;
  /** 任务创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 上次执行时间 */
  lastRunAt: number | null;
  /** 下次预计执行时间 */
  nextRunAt: number | null;
  /** 最近一次执行结果摘要 */
  lastResult: string | null;
  /** 执行成功/失败 */
  lastSuccess: boolean | null;
}

export interface CreateTaskInput {
  name: string;
  agentId: string | null;
  prompt: string;
  cronExpression: string;
  enabled?: boolean;
}

export interface UpdateTaskInput {
  name?: string;
  agentId?: string | null;
  prompt?: string;
  cronExpression?: string;
  enabled?: boolean;
}

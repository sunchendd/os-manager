import fs from 'fs';
import path from 'path';
import type { ScheduledTask } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'scheduled-tasks.json');

export class TaskStore {
  private tasks: ScheduledTask[] = [];

  constructor() {
    this.ensureDir();
    this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(TASKS_FILE)) {
        const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
        this.tasks = JSON.parse(raw);
      }
    } catch (e) {
      console.error('加载定时任务失败:', e);
      this.tasks = [];
    }
  }

  private save() {
    try {
      this.ensureDir();
      fs.writeFileSync(TASKS_FILE, JSON.stringify(this.tasks, null, 2));
    } catch (e) {
      console.error('保存定时任务失败:', e);
    }
  }

  getAll(): ScheduledTask[] {
    return [...this.tasks];
  }

  getById(id: string): ScheduledTask | undefined {
    return this.tasks.find(t => t.id === id);
  }

  create(task: ScheduledTask): ScheduledTask {
    this.tasks.push(task);
    this.save();
    return task;
  }

  update(id: string, patch: Partial<ScheduledTask>): ScheduledTask | null {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.tasks[idx] = { ...this.tasks[idx], ...patch, updatedAt: Date.now() };
    this.save();
    return this.tasks[idx];
  }

  delete(id: string): boolean {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    this.save();
    return true;
  }
}

import { spawn, SpawnOptions } from 'child_process';
import { EventEmitter } from 'events';

export interface OpenCodeEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'text' | 'done' | 'error';
  data?: any;
  text?: string;
  tool?: string;
  command?: string;
  output?: string;
  error?: string;
}

/**
 * OpenCode Bridge — 集成 opencode CLI，实时流式输出事件
 *
 * opencode run --format json 输出 JSON Lines，每行一个事件：
 * - step_start   → thinking
 * - tool_use     → tool_call (running) / tool_result (completed)
 * - text         → AI 最终回复文本
 * - step_finish  → 步骤结束（reason: stop 表示全部完成）
 */
export class OpenCodeBridge extends EventEmitter {
  private proc: ReturnType<typeof spawn> | null = null;
  private buffer = '';

  /**
   * 执行用户输入，实时 emit OpenCodeEvent
   * @param userInput 用户输入
   * @param agentConfig 可选的 Agent 配置（model, instructions 等）
   * @returns 最终 AI 回复文本
   */
  async run(userInput: string, agentConfig?: { model?: string; instructions?: string; environment?: Record<string, string> }): Promise<string> {
    return new Promise((resolve, reject) => {
      // 构建 opencode run 命令
      const args = ['run', '--format', 'json'];
      if (agentConfig?.model) {
        args.push('--model', agentConfig.model);
      }
      // 如果有 instructions，作为系统提示词前置
      const effectiveInput = agentConfig?.instructions
        ? `[System Instructions]\n${agentConfig.instructions}\n\n[User Input]\n${userInput}`
        : userInput;
      args.push(effectiveInput);

      const command = 'opencode ' + args.map(a => JSON.stringify(a)).join(' ');
      const options: SpawnOptions = {
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...(agentConfig?.environment || {}) },
      };

      this.proc = spawn('script', ['-q', '/dev/null', '-c', command], options);
      this.buffer = '';
      let finalText = '';
      let exited = false;

      this.proc.stdout?.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString('utf-8');
        this.flushBuffer();
      });

      this.proc.stderr?.on('data', (chunk: Buffer) => {
        const line = chunk.toString('utf-8').trim();
        if (line) {
          this.emit('event', { type: 'error', error: line } as OpenCodeEvent);
        }
      });

      this.proc.on('error', (err) => {
        if (!exited) {
          exited = true;
          this.emit('event', { type: 'error', error: err.message } as OpenCodeEvent);
          reject(err);
        }
      });

      this.proc.on('close', (code) => {
        if (!exited) {
          exited = true;
          this.flushBuffer(true);
          this.emit('event', { type: 'done' } as OpenCodeEvent);
          resolve(finalText);
        }
      });

      // 监听 text 事件收集最终回复
      this.on('event', (evt: OpenCodeEvent) => {
        if (evt.type === 'text' && evt.text) {
          finalText = evt.text;
        }
      });
    });
  }

  kill() {
    if (this.proc && !this.proc.killed) {
      this.proc.kill('SIGTERM');
    }
  }

  private flushBuffer(final = false) {
    const lines = this.buffer.split('\n');
    // 最后一行可能不完整，保留到 buffer
    this.buffer = final ? '' : (lines.pop() || '');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        this.parseEvent(event);
      } catch {
        // 忽略非 JSON 行
      }
    }
  }

  private parseEvent(event: any) {
    if (!event.type) return;

    switch (event.type) {
      case 'step_start': {
        this.emit('event', { type: 'thinking' } as OpenCodeEvent);
        break;
      }

      case 'tool_use': {
        const part = event.part;
        if (!part) break;
        const state = part.state;
        if (!state) break;

        if (state.status === 'running' || state.status === 'pending') {
          this.emit('event', {
            type: 'tool_call',
            tool: part.tool,
            command: state.input?.command || state.input?.description || '',
          } as OpenCodeEvent);
        } else if (state.status === 'completed' || state.status === 'failed') {
          this.emit('event', {
            type: 'tool_result',
            tool: part.tool,
            command: state.input?.command || state.input?.description || '',
            output: state.output || state.error || '',
            error: state.status === 'failed' ? (state.error || '执行失败') : undefined,
          } as OpenCodeEvent);
        }
        break;
      }

      case 'text': {
        const part = event.part;
        if (part && part.text) {
          this.emit('event', {
            type: 'text',
            text: part.text,
          } as OpenCodeEvent);
        }
        break;
      }

      case 'step_finish': {
        const reason = event.part?.reason;
        if (reason === 'stop') {
          this.emit('event', { type: 'done' } as OpenCodeEvent);
        }
        break;
      }

      default:
        break;
    }
  }
}

/** 构建包含常见 npm/opencode 全局路径的 PATH */
function getExtendedPath(): string {
  const basePaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/local/sbin',
    '/usr/sbin',
    '/sbin',
    '/opt/node/bin',
    '/usr/local/node/bin',
    '/root/.opencode/bin',
    `${process.env.HOME || '/root'}/.opencode/bin`,
  ];
  // 尝试获取用户 home 目录下的 npm 全局路径
  try {
    const { execSync } = require('child_process');
    const globalPath = execSync('npm prefix -g 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 3000,
    }).trim();
    if (globalPath) {
      basePaths.push(`${globalPath}/bin`);
    }
  } catch { /* ignore */ }
  return basePaths.join(':') + ':' + (process.env.PATH || '');
}

const EXTENDED_PATH = getExtendedPath();

/** 检查系统是否安装了 opencode CLI（兼容 systemd 环境） */
export function isOpenCodeAvailable(): boolean {
  const { execSync } = require('child_process');
  try {
    execSync('which opencode', { stdio: 'ignore', env: { ...process.env, PATH: EXTENDED_PATH } });
    return true;
  } catch {
    // fallback: 尝试 npx 方式
    try {
      execSync('npx --yes @opencode/cli --version', {
        stdio: 'ignore',
        env: { ...process.env, PATH: EXTENDED_PATH },
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/** 获取 opencode CLI 版本号 */
export function getOpenCodeVersion(): string | null {
  const { execSync } = require('child_process');
  try {
    const version = execSync('opencode --version', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 5000,
      env: { ...process.env, PATH: EXTENDED_PATH },
    }).trim();
    return version || null;
  } catch {
    try {
      const version = execSync('npx --yes @opencode/cli --version', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 10000,
        env: { ...process.env, PATH: EXTENDED_PATH },
      }).trim();
      return version || null;
    } catch {
      return null;
    }
  }
}

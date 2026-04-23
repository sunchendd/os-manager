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
   * @returns 最终 AI 回复文本
   */
  async run(userInput: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // opencode 需要 TTY 环境，使用 script 命令创建伪终端
      const command = `opencode run --format json ${JSON.stringify(userInput)}`;
      const options: SpawnOptions = {
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
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

/** 检查系统是否安装了 opencode CLI */
export function isOpenCodeAvailable(): boolean {
  try {
    const { execSync } = require('child_process');
    execSync('which opencode', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

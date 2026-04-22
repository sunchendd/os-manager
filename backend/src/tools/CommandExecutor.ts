import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config';
import type { ToolResult } from '../types';

const execAsync = promisify(exec);

export class CommandExecutor {
  private blockedPatterns = [
    /rm\s+-rf\s+\//,
    /rm\s+-rf\s+.*\/boot/,
    /mkfs\.[a-z]+/,
    /dd\s+if=.*of=\/dev\/sd/,
    /:(){ :|:& };:/,
    />\s*\/dev\/sda/,
  ];

  async execute(command: string): Promise<ToolResult> {
    // 检查是否包含被阻止的危险命令
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(command)) {
        return {
          success: false,
          output: '',
          error: `该命令被系统安全策略阻止: ${command}`,
        };
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: config.execution.timeout,
        maxBuffer: config.execution.maxOutputSize,
      });

      const output = stdout || stderr;
      // 截断过长的输出
      const truncated = output.length > 10000 
        ? output.substring(0, 10000) + '\n... (输出已截断)' 
        : output;

      return {
        success: !stderr || stdout.length > 0,
        output: truncated,
        error: stderr || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message || '执行失败',
      };
    }
  }
}

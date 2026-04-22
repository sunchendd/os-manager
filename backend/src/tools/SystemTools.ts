import { CommandExecutor } from '../tools/CommandExecutor';
import type { ToolResult } from '../types';

export class SystemTools {
  private executor: CommandExecutor;

  constructor() {
    this.executor = new CommandExecutor();
  }

  async executeCommand(command: string): Promise<ToolResult> {
    return this.executor.execute(command);
  }

  async getDiskUsage(): Promise<ToolResult> {
    return this.executor.execute('df -h');
  }

  async getMemoryInfo(): Promise<ToolResult> {
    return this.executor.execute('free -h');
  }

  async getCpuInfo(): Promise<ToolResult> {
    return this.executor.execute('top -bn1 | head -20');
  }

  async getProcessList(): Promise<ToolResult> {
    return this.executor.execute('ps aux --sort=-%cpu | head -20');
  }

  async getNetworkInfo(): Promise<ToolResult> {
    return this.executor.execute('ss -tlnp');
  }

  async findFiles(path: string, name?: string): Promise<ToolResult> {
    const cmd = name 
      ? `find ${path} -name "${name}" 2>/dev/null | head -50`
      : `ls -la ${path} 2>/dev/null`;
    return this.executor.execute(cmd);
  }

  async getSystemInfo(): Promise<ToolResult> {
    return this.executor.execute('cat /etc/os-release && echo "---" && uname -a && echo "---" && hostname');
  }

  async createUser(username: string, password?: string): Promise<ToolResult> {
    let cmd = `sudo useradd -m ${username}`;
    if (password) {
      cmd += ` && echo "${username}:${password}" | sudo chpasswd`;
    }
    return this.executor.execute(cmd);
  }

  async deleteUser(username: string): Promise<ToolResult> {
    return this.executor.execute(`sudo userdel -r ${username}`);
  }
}

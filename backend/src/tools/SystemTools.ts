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

  async getOverallCpuUsage(): Promise<ToolResult> {
    // 优先用 vmstat 1秒采样（值稳定准确），fallback 到 /proc/stat 平均值（不会跳变）
    return this.executor.execute("(command -v vmstat >/dev/null 2>&1 && vmstat 1 2 | tail -n 1 | awk '{print 100-$(NF-2)}') || awk '/^cpu /{u=$2+$4; t=$2+$4+$5; if(t==0) print 0; else print int(100*u/t)}' /proc/stat");
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
    return this.executor.execute('cat /etc/os-release && echo "---" && uname -a && echo "---" && echo "Hostname: $(hostname)" && echo "Uptime: $(uptime -p 2>/dev/null || uptime | sed \'s/.*up \\([^,]*\\),.*/\\1/\')"');
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

import { CommandExecutor } from '../tools/CommandExecutor';
import { RiskEngine } from '../risk/RiskEngine';
import { SessionManager } from './SessionManager';
import { SkillRegistry } from './SkillRegistry';
import type { Message, RiskAssessment } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MockAgentCore {
  private riskEngine: RiskEngine;
  private commandExecutor: CommandExecutor;
  private sessionManager: SessionManager;
  private skillRegistry: SkillRegistry;

  constructor(sessionManager: SessionManager) {
    this.riskEngine = new RiskEngine();
    this.commandExecutor = new CommandExecutor();
    this.sessionManager = sessionManager;
    this.skillRegistry = new SkillRegistry();
  }

  getSkillRegistry(): SkillRegistry {
    return this.skillRegistry;
  }

  async processMessage(
    sessionId: string,
    userInput: string,
    onRiskConfirm?: (assessment: RiskAssessment) => Promise<boolean>
  ): Promise<Message[]> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    this.sessionManager.addMessage(sessionId, userMessage);

    // 检测痛点场景
    const scenario = this.detectScenario(userInput);
    if (scenario) {
      return this.handleScenario(sessionId, userInput, scenario, userMessage);
    }

    // 规则匹配命令
    const command = this.matchCommand(userInput);
    
    if (command) {
      return this.executeCommandFlow(sessionId, userInput, command, userMessage, onRiskConfirm);
    } else {
      // 无法识别的命令，返回帮助信息
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `我暂时无法完全理解您的需求。您可以尝试以下操作：\n\n- "查看磁盘使用情况" → 执行 df -h\n- "查看内存使用情况" → 执行 free -h\n- "查看进程列表" → 执行 ps aux\n- "查找文件 [路径]" → 执行 find\n- "查看网络端口" → 执行 ss -tlnp\n- "系统健康诊断" → 一键全面体检\n- "安全巡检" → 检查安全状态\n\n当前处于演示模式，规则匹配能力有限。`,
        timestamp: Date.now(),
      };
      this.sessionManager.addMessage(sessionId, assistantMsg);
      return [userMessage, assistantMsg];
    }
  }

  private detectScenario(input: string): 'health_check' | 'security_audit' | null {
    const lower = input.toLowerCase();
    if (/健康|体检|诊断|health|checkup|全面检查/i.test(lower)) {
      return 'health_check';
    }
    if (/安全|security|audit|巡检|入侵|登录|防火墙/i.test(lower)) {
      return 'security_audit';
    }
    return null;
  }

  private async handleScenario(
    sessionId: string,
    input: string,
    scenario: 'health_check' | 'security_audit',
    userMessage: Message
  ): Promise<Message[]> {
    if (scenario === 'health_check') {
      return this.runHealthCheck(sessionId, userMessage);
    } else {
      return this.runSecurityAudit(sessionId, userMessage);
    }
  }

  private async runHealthCheck(sessionId: string, userMessage: Message): Promise<Message[]> {
    const checks = [
      { name: '磁盘空间', cmd: 'df -h' },
      { name: '内存使用', cmd: 'free -h' },
      { name: 'CPU负载', cmd: 'cat /proc/loadavg' },
      { name: '僵尸进程', cmd: 'ps aux | grep "Z" | grep -v grep | wc -l' },
      { name: '磁盘IO', cmd: 'iostat -x 1 1 2>/dev/null || echo "iostat不可用"' },
    ];

    let report = '# 🔍 系统健康诊断报告\n\n';
    report += `> 诊断时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    
    const results: { name: string; result: any; status: 'good' | 'warning' | 'danger' }[] = [];
    const executedCommands: Array<{command: string; output: string; success: boolean; timestamp: number}> = [];

    for (const check of checks) {
      const result = await this.commandExecutor.execute(check.cmd);
      const status = this.assessCheckStatus(check.name, result.output);
      results.push({ name: check.name, result, status });
      executedCommands.push({
        command: check.cmd,
        output: result.output || result.error || '',
        success: result.success,
        timestamp: Date.now(),
      });
    }

    // 汇总
    const dangerCount = results.filter(r => r.status === 'danger').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const goodCount = results.filter(r => r.status === 'good').length;

    report += `## 📊 总体状态: ${dangerCount > 0 ? '🔴 存在严重问题' : warningCount > 0 ? '🟡 需要关注' : '🟢 状态良好'}\n\n`;
    report += `- ✅ 正常: ${goodCount} 项\n`;
    report += `- ⚠️ 警告: ${warningCount} 项\n`;
    report += `- 🔴 危险: ${dangerCount} 项\n\n`;
    report += '---\n\n';

    // 详细结果
    for (const r of results) {
      const icon = r.status === 'good' ? '✅' : r.status === 'warning' ? '⚠️' : '🔴';
      report += `### ${icon} ${r.name}\n\n`;
      report += '```\n' + r.result.output + '\n```\n\n';
    }

    // 建议
    report += '---\n\n## 💡 诊断建议\n\n';
    if (dangerCount > 0) {
      report += '🔴 **发现严重问题，建议立即处理：**\n';
      const dangers = results.filter(r => r.status === 'danger');
      for (const d of dangers) {
        report += `- ${d.name}: 需要立即关注和修复\n`;
      }
      report += '\n';
    }
    if (warningCount > 0) {
      report += '⚠️ **发现潜在风险，建议优化：**\n';
      const warnings = results.filter(r => r.status === 'warning');
      for (const w of warnings) {
        report += `- ${w.name}: 建议检查和优化\n`;
      }
      report += '\n';
    }
    if (dangerCount === 0 && warningCount === 0) {
      report += '🎉 **恭喜！系统运行状态良好。**\n\n建议继续保持定期巡检习惯。';
    }

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: report,
      commands: executedCommands,
      timestamp: Date.now(),
    };
    this.sessionManager.addMessage(sessionId, assistantMsg);
    return [userMessage, assistantMsg];
  }

  private async runSecurityAudit(sessionId: string, userMessage: Message): Promise<Message[]> {
    const checks = [
      { name: '开放端口', cmd: 'ss -tlnp' },
      { name: '最近登录', cmd: 'last -10' },
      { name: '登录失败', cmd: 'grep "Failed password" /var/log/auth.log 2>/dev/null | tail -10 || echo "无登录失败记录或日志不可用"' },
      { name: '当前连接', cmd: 'who' },
      { name: '特权进程', cmd: 'ps aux | grep "root" | grep -v grep | wc -l' },
    ];

    let report = '# 🛡️ 系统安全巡检报告\n\n';
    report += `> 巡检时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    
    const results: { name: string; result: any; status: 'good' | 'warning' | 'danger' }[] = [];
    const executedCommands: Array<{command: string; output: string; success: boolean; timestamp: number}> = [];

    for (const check of checks) {
      const result = await this.commandExecutor.execute(check.cmd);
      const status = this.assessSecurityStatus(check.name, result.output);
      results.push({ name: check.name, result, status });
      executedCommands.push({
        command: check.cmd,
        output: result.output || result.error || '',
        success: result.success,
        timestamp: Date.now(),
      });
    }

    const dangerCount = results.filter(r => r.status === 'danger').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    report += `## 📊 安全等级: ${dangerCount > 0 ? '🔴 高风险' : warningCount > 0 ? '🟡 中风险' : '🟢 安全'}\n\n`;
    report += `- ✅ 正常: ${results.filter(r => r.status === 'good').length} 项\n`;
    report += `- ⚠️ 警告: ${warningCount} 项\n`;
    report += `- 🔴 危险: ${dangerCount} 项\n\n`;
    report += '---\n\n';

    for (const r of results) {
      const icon = r.status === 'good' ? '✅' : r.status === 'warning' ? '⚠️' : '🔴';
      report += `### ${icon} ${r.name}\n\n`;
      report += '```\n' + r.result.output + '\n```\n\n';
    }

    // 安全建议
    report += '---\n\n## 🛡️ 安全建议\n\n';
    if (dangerCount > 0) {
      report += '🔴 **发现高风险问题：**\n';
      report += '- 建议立即检查异常登录和未授权访问\n';
      report += '- 考虑启用防火墙限制不必要的端口\n';
      report += '- 审查root权限进程\n\n';
    }
    if (warningCount > 0) {
      report += '⚠️ **建议优化：**\n';
      report += '- 关闭不必要的开放端口\n';
      report += '- 定期检查登录日志\n';
      report += '- 启用SSH密钥认证替代密码\n\n';
    }
    if (dangerCount === 0 && warningCount === 0) {
      report += '🎉 **系统安全状态良好！**\n\n';
      report += '继续保持以下习惯：\n';
      report += '- 定期更新系统补丁\n';
      report += '- 监控异常登录\n';
      report += '- 最小化开放端口\n';
    }

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: report,
      commands: executedCommands,
      timestamp: Date.now(),
    };
    this.sessionManager.addMessage(sessionId, assistantMsg);
    return [userMessage, assistantMsg];
  }

  private assessCheckStatus(name: string, output: string): 'good' | 'warning' | 'danger' {
    if (name === '磁盘空间') {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.startsWith('/dev/')) {
          const parts = line.trim().split(/\s+/);
          const usePercent = parseInt(parts[4]);
          if (usePercent >= 90) return 'danger';
          if (usePercent >= 70) return 'warning';
        }
      }
    }
    if (name === '内存使用') {
      const memMatch = output.match(/Mem:\s+(\S+)\s+(\S+)/);
      if (memMatch) {
        const total = this.parseSize(memMatch[1]);
        const used = this.parseSize(memMatch[2]);
        const percent = (used / total) * 100;
        if (percent >= 90) return 'danger';
        if (percent >= 80) return 'warning';
      }
    }
    if (name === '僵尸进程') {
      const count = parseInt(output.trim());
      if (count > 10) return 'warning';
    }
    return 'good';
  }

  private assessSecurityStatus(name: string, output: string): 'good' | 'warning' | 'danger' {
    if (name === '登录失败') {
      if (output.includes('Failed password') && output.split('\n').length > 5) {
        return 'danger';
      }
      if (output.includes('Failed password')) {
        return 'warning';
      }
    }
    if (name === '开放端口') {
      const count = (output.match(/LISTEN/g) || []).length;
      if (count > 30) return 'warning';
    }
    return 'good';
  }

  private parseSize(sizeStr: string): number {
    const num = parseFloat(sizeStr);
    if (sizeStr.includes('Gi')) return num;
    if (sizeStr.includes('Mi')) return num / 1024;
    if (sizeStr.includes('Ki')) return num / (1024 * 1024);
    return num;
  }

  private async executeCommandFlow(
    sessionId: string,
    input: string,
    command: string,
    userMessage: Message,
    onRiskConfirm?: (assessment: RiskAssessment) => Promise<boolean>
  ): Promise<Message[]> {
    const risk = this.riskEngine.assess(command);
    let shouldExecute = true;

    if (risk.level === 'danger') {
      shouldExecute = false;
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `⚠️ 我检测到一个高风险操作，已自动阻止执行。\n\n**风险原因**: ${risk.reason}\n\n**命令**: \`${command}\`\n\n如需执行此操作，请使用传统命令行方式并确保了解风险。`,
        type: 'risk',
        riskLevel: 'danger',
        command,
        timestamp: Date.now(),
      };
      this.sessionManager.addMessage(sessionId, assistantMsg);
      return [userMessage, assistantMsg];
    }

    if (risk.level === 'warning' && onRiskConfirm) {
      const confirmed = await onRiskConfirm(risk);
      if (!confirmed) {
        shouldExecute = false;
      }
    }

    if (shouldExecute) {
      const result = await this.commandExecutor.execute(command);
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: this.formatResponse(input, command, result),
        type: result.success ? 'text' : 'error',
        riskLevel: risk.level,
        command,
        commands: [{
          command,
          output: result.output || result.error || '',
          success: result.success,
          timestamp: Date.now(),
        }],
        timestamp: Date.now(),
      };
      this.sessionManager.addMessage(sessionId, assistantMsg);
      return [userMessage, assistantMsg];
    } else {
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `操作已取消。未执行命令：\`${command}\``,
        timestamp: Date.now(),
      };
      this.sessionManager.addMessage(sessionId, assistantMsg);
      return [userMessage, assistantMsg];
    }
  }

  private matchCommand(input: string): string | null {
    const lower = input.toLowerCase();
    
    if (/磁盘|disk|df|空间|storage/i.test(lower)) {
      if (/大文件|占用最多/i.test(lower)) {
        return 'du -sh /* 2>/dev/null | sort -rh | head -20';
      }
      return 'df -h';
    }
    
    if (/内存|memory|ram|mem/i.test(lower)) {
      return 'free -h';
    }
    
    if (/进程|process|cpu|top|运行/i.test(lower)) {
      return 'ps aux --sort=-%cpu | head -20';
    }
    
    if (/网络|端口|network|port|netstat/i.test(lower)) {
      return 'ss -tlnp';
    }
    
    if (/查找|搜索|find|文件/i.test(lower)) {
      const match = input.match(/查找\s*(.+)/);
      if (match) {
        const path = match[1].trim();
        if (path.startsWith('/')) {
          return `ls -la ${path} 2>/dev/null`;
        }
        return `find / -name "${path}" 2>/dev/null | head -20`;
      }
      return 'find /var/log -type f 2>/dev/null | head -20';
    }
    
    if (/日志|log/i.test(lower)) {
      return 'ls -la /var/log/ 2>/dev/null | head -20';
    }
    
    if (/用户|user|账号/i.test(lower)) {
      return 'cat /etc/passwd | head -20';
    }
    
    if (/系统|os|版本|system/i.test(lower)) {
      return 'cat /etc/os-release && uname -a';
    }
    
    return null;
  }

  private formatResponse(input: string, command: string, result: { success: boolean; output: string; error?: string }): string {
    let response = `💻 **执行命令**: \`${command}\`\n\n`;

    if (result.success) {
      if (result.output) {
        response += '```\n' + result.output + '```\n\n';
      } else {
        response += '✅ 命令执行成功（无输出）\n\n';
      }

      response += '---\n\n';

      if (/df -h/.test(command)) {
        response += '📊 **结果解释**: 显示了所有文件系统的磁盘使用情况。如果某个分区的使用率超过90%，需要及时清理。';
      } else if (/free -h/.test(command)) {
        response += '📊 **结果解释**: 显示了系统的物理内存和交换空间的使用情况。如果可用内存低于10%，建议关闭不必要的程序。';
      } else if (/ps aux/.test(command)) {
        response += '📊 **结果解释**: 显示了当前系统中CPU使用率最高的20个进程。如果某个进程长期占用大量CPU，可能是异常进程。';
      } else if (/ss -tlnp/.test(command)) {
        response += '📊 **结果解释**: 显示了所有正在监听的TCP端口及相关进程。请确认每个开放端口都是必要的，关闭不需要的服务。';
      } else {
        response += '✅ 命令已成功执行。';
      }
    } else {
      response += `❌ **执行失败**\n\n错误信息: ${result.error || '未知错误'}\n\n建议检查命令参数或权限。`;
    }

    return response;
  }

  reinit() {
    // MockAgentCore 无需重新初始化
  }
}

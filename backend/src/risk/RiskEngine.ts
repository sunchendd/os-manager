import type { RiskAssessment } from '../types';

export class RiskEngine {
  private dangerPatterns = [
    { pattern: /rm\s+-rf\s+\//, reason: '删除根目录将导致系统完全损坏' },
    { pattern: /rm\s+-rf\s+.*\/boot/, reason: '删除boot目录将导致系统无法启动' },
    { pattern: /mkfs\.[a-z]+/, reason: '格式化磁盘将丢失所有数据' },
    { pattern: /dd\s+if=.*of=\/dev\//, reason: '直接写入块设备可能导致数据丢失' },
    { pattern: /userdel\s+.*root/, reason: '删除root用户将导致无法管理系统' },
    { pattern: /chmod\s+.*777\s+.*\/etc/, reason: '修改系统配置目录权限存在安全风险' },
    { pattern: /:(){ :|:& };:/, reason: 'fork炸弹将导致系统资源耗尽' },
  ];

  private warningPatterns = [
    { pattern: /rm\s+-rf/, reason: '强制递归删除可能导致重要数据丢失' },
    { pattern: /userdel/, reason: '删除用户将移除该用户所有数据' },
    { pattern: /chmod\s+777/, reason: '开放全部权限存在安全风险' },
    { pattern: /systemctl\s+(stop|restart|disable)/, reason: '停止或重启系统服务可能影响系统稳定性' },
    { pattern: /shutdown|reboot|halt/, reason: '关机或重启将影响当前运行的服务' },
    { pattern: /iptables\s+-F/, reason: '清空防火墙规则将暴露系统于网络风险中' },
  ];

  assess(command: string): RiskAssessment {
    for (const rule of this.dangerPatterns) {
      if (rule.pattern.test(command)) {
        return {
          level: 'danger',
          reason: rule.reason,
          command,
        };
      }
    }

    for (const rule of this.warningPatterns) {
      if (rule.pattern.test(command)) {
        return {
          level: 'warning',
          reason: rule.reason,
          command,
        };
      }
    }

    return {
      level: 'safe',
      reason: '该操作为只读查询，无风险',
      command,
    };
  }
}

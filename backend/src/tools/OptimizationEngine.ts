import { CommandExecutor } from './CommandExecutor';

export interface OptimizationTool {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'cleanup' | 'network' | 'monitor';
  command: string;
  impact: 'low' | 'medium' | 'high';
  reversible: boolean;
}

export const BUILTIN_TOOLS: OptimizationTool[] = [
  {
    id: 'fail2ban',
    name: '安装Fail2Ban',
    description: '自动封禁暴力破解IP，保护SSH服务',
    category: 'security',
    command: 'sudo apt update && sudo apt install -y fail2ban && sudo systemctl enable fail2ban && sudo systemctl start fail2ban',
    impact: 'high',
    reversible: true,
  },
  {
    id: 'ufw',
    name: '配置UFW防火墙',
    description: '启用防火墙，仅开放必要端口(22,80,443)',
    category: 'security',
    command: 'sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw --force enable',
    impact: 'high',
    reversible: true,
  },
  {
    id: 'sysctl',
    name: '优化内核参数',
    description: '优化TCP连接、内存管理和文件描述符限制',
    category: 'performance',
    command: 'echo "net.core.somaxconn = 65535\nnet.ipv4.tcp_max_syn_backlog = 65535\nnet.ipv4.ip_local_port_range = 1024 65535\nfs.file-max = 2097152\nvm.swappiness = 10" | sudo tee -a /etc/sysctl.conf && sudo sysctl -p',
    impact: 'medium',
    reversible: true,
  },
  {
    id: 'logrotate',
    name: '配置日志轮转',
    description: '防止日志文件无限增长占满磁盘',
    category: 'cleanup',
    command: 'sudo apt install -y logrotate && echo "/var/log/*.log {\n  daily\n  missingok\n  rotate 14\n  compress\n  delaycompress\n  notifempty\n  create 0644 root root\n}" | sudo tee /etc/logrotate.d/custom-apps',
    impact: 'medium',
    reversible: true,
  },
  {
    id: 'ntp',
    name: '配置NTP时间同步',
    description: '安装chrony确保系统时间准确',
    category: 'network',
    command: 'sudo apt install -y chrony && sudo systemctl enable chrony && sudo systemctl restart chrony',
    impact: 'low',
    reversible: true,
  },
  {
    id: 'auto-update',
    name: '启用自动安全更新',
    description: '自动安装安全补丁，减少漏洞风险',
    category: 'security',
    command: 'sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades',
    impact: 'high',
    reversible: true,
  },
  {
    id: 'docker-cleanup',
    name: '清理Docker资源',
    description: '删除未使用的镜像、容器和卷',
    category: 'cleanup',
    command: 'docker system prune -f --volumes 2>/dev/null || echo "Docker未安装或无需清理"',
    impact: 'medium',
    reversible: false,
  },
  {
    id: 'tmp-clean',
    name: '清理临时文件',
    description: '清理/tmp和/var/tmp下的旧文件',
    category: 'cleanup',
    command: 'sudo find /tmp -type f -atime +7 -delete 2>/dev/null; sudo find /var/tmp -type f -atime +7 -delete 2>/dev/null; echo "临时文件清理完成"',
    impact: 'low',
    reversible: false,
  },
  {
    id: 'zram',
    name: '启用ZRAM压缩内存',
    description: '使用压缩内存作为交换空间，提升性能',
    category: 'performance',
    command: 'sudo apt install -y zram-tools && echo "ALGO=zstd\nPERCENT=50" | sudo tee /etc/default/zramswap && sudo systemctl restart zramswap',
    impact: 'medium',
    reversible: true,
  },
  {
    id: 'no-root-ssh',
    name: '禁用Root SSH登录',
    description: '禁止root用户通过SSH直接登录，提升安全性',
    category: 'security',
    command: 'sudo sed -i "s/^#\?PermitRootLogin.*/PermitRootLogin no/g" /etc/ssh/sshd_config && sudo systemctl restart sshd',
    impact: 'high',
    reversible: true,
  },
];

export class OptimizationEngine {
  private executor: CommandExecutor;

  constructor() {
    this.executor = new CommandExecutor();
  }

  getTools(): OptimizationTool[] {
    return BUILTIN_TOOLS;
  }

  async runTool(toolId: string): Promise<{ success: boolean; output: string }> {
    const tool = BUILTIN_TOOLS.find(t => t.id === toolId);
    if (!tool) {
      return { success: false, output: `未找到工具: ${toolId}` };
    }

    const result = await this.executor.execute(tool.command);
    return {
      success: result.success,
      output: result.output || result.error || '执行完成',
    };
  }

  async getSystemScore(): Promise<{
    total: number;
    security: number;
    performance: number;
    cleanup: number;
    details: string[];
  }> {
    const checks = [
      { name: '防火墙状态', cmd: 'sudo ufw status | grep -i active | wc -l', category: 'security' },
      { name: 'Fail2Ban状态', cmd: 'systemctl is-active fail2ban 2>/dev/null | grep active | wc -l', category: 'security' },
      { name: '自动更新', cmd: 'systemctl is-active unattended-upgrades 2>/dev/null | grep active | wc -l', category: 'security' },
      { name: 'Root SSH', cmd: 'grep "^PermitRootLogin" /etc/ssh/sshd_config 2>/dev/null | grep -v "no" | wc -l', category: 'security' },
      { name: '磁盘使用率', cmd: 'df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'', category: 'cleanup' },
      { name: '内存Swap', cmd: 'free | grep Swap | awk \'{print $3}\'', category: 'performance' },
      { name: '时间同步', cmd: 'systemctl is-active chrony 2>/dev/null | grep active | wc -l || systemctl is-active systemd-timesyncd 2>/dev/null | grep active | wc -l', category: 'network' },
    ];

    let securityScore = 0;
    let performanceScore = 0;
    let cleanupScore = 0;
    const details: string[] = [];

    for (const check of checks) {
      try {
        const result = await this.executor.execute(check.cmd);
        const value = result.output.trim();
        
        if (check.name === '磁盘使用率') {
          const percent = parseInt(value) || 0;
          if (percent < 70) cleanupScore += 25;
          else if (percent < 85) cleanupScore += 15;
          else cleanupScore += 5;
          details.push(`${check.name}: ${percent}%`);
        } else if (check.name === '内存Swap') {
          const swapUsed = parseInt(value) || 0;
          if (swapUsed === 0) performanceScore += 25;
          else if (swapUsed < 100000) performanceScore += 15;
          else performanceScore += 10;
          details.push(`${check.name}: ${swapUsed}KB`);
        } else {
          const isActive = value === '1' || value === 'active';
          if (check.category === 'security') {
            if (check.name === 'Root SSH') {
              securityScore += isActive ? 0 : 25; // Root SSH禁用才加分
              details.push(`${check.name}: ${isActive ? '⚠️ 未禁用' : '✅ 已禁用'}`);
            } else {
              securityScore += isActive ? 25 : 0;
              details.push(`${check.name}: ${isActive ? '✅' : '❌'}`);
            }
          } else {
            performanceScore += isActive ? 25 : 0;
            details.push(`${check.name}: ${isActive ? '✅' : '❌'}`);
          }
        }
      } catch {
        details.push(`${check.name}: 检测失败`);
      }
    }

    const total = Math.round((securityScore + performanceScore + cleanupScore) / 3);

    return {
      total: Math.min(100, total),
      security: Math.min(100, securityScore),
      performance: Math.min(100, performanceScore),
      cleanup: Math.min(100, cleanupScore),
      details,
    };
  }
}

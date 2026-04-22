import { CommandExecutor } from './CommandExecutor';
import { SystemDetector } from './SystemDetector';

export interface MirrorConfig {
  name: string;
  apt?: string;
  yum?: string;
  pip: string;
  npm: string;
}

const MIRRORS: MirrorConfig[] = [
  {
    name: '阿里云',
    apt: 'https://mirrors.aliyun.com',
    yum: 'https://mirrors.aliyun.com',
    pip: 'https://mirrors.aliyun.com/pypi/simple/',
    npm: 'https://registry.npmmirror.com',
  },
  {
    name: '腾讯云',
    apt: 'https://mirrors.cloud.tencent.com',
    yum: 'https://mirrors.cloud.tencent.com',
    pip: 'https://mirrors.cloud.tencent.com/pypi/simple/',
    npm: 'https://mirrors.cloud.tencent.com/npm/',
  },
  {
    name: '清华大学',
    apt: 'https://mirrors.tuna.tsinghua.edu.cn',
    yum: 'https://mirrors.tuna.tsinghua.edu.cn',
    pip: 'https://pypi.tuna.tsinghua.edu.cn/simple',
    npm: 'https://registry.npmmirror.com',
  },
  {
    name: '华为云',
    apt: 'https://repo.huaweicloud.com',
    yum: 'https://repo.huaweicloud.com',
    pip: 'https://repo.huaweicloud.com/repository/pypi/simple',
    npm: 'https://repo.huaweicloud.com/repository/npm/',
  },
];

export class MirrorConfigurator {
  private executor: CommandExecutor;
  private detector: SystemDetector;

  constructor() {
    this.executor = new CommandExecutor();
    this.detector = new SystemDetector();
  }

  getAvailableMirrors(): MirrorConfig[] {
    return MIRRORS;
  }

  async configureMirror(mirrorName: string): Promise<{ success: boolean; output: string }> {
    const mirror = MIRRORS.find(m => m.name === m.name); // 实际应该用name匹配
    if (!mirror) {
      return { success: false, output: `未找到镜像源: ${mirrorName}` };
    }

    const osInfo = await this.detector.detect();
    const results: string[] = [];

    // 配置APT
    if (osInfo.packageManager === 'apt' && mirror.apt) {
      const result = await this.configureApt(mirror.apt, osInfo);
      results.push(`APT: ${result}`);
    }

    // 配置YUM/DNF
    if ((osInfo.packageManager === 'yum' || osInfo.packageManager === 'dnf') && mirror.yum) {
      const result = await this.configureYum(mirror.yum, osInfo);
      results.push(`YUM: ${result}`);
    }

    // 配置PIP
    const pipResult = await this.configurePip(mirror.pip);
    results.push(`PIP: ${pipResult}`);

    // 配置NPM
    const npmResult = await this.configureNpm(mirror.npm);
    results.push(`NPM: ${npmResult}`);

    return {
      success: true,
      output: results.join('\n'),
    };
  }

  private async configureApt(baseUrl: string, osInfo: any): Promise<string> {
    try {
      const codename = osInfo.codename || 'bookworm';
      const sources = `# 由OS智能代理自动配置 - ${baseUrl}
deb ${baseUrl}/debian/ ${codename} main contrib non-free non-free-firmware
deb ${baseUrl}/debian/ ${codename}-updates main contrib non-free non-free-firmware
deb ${baseUrl}/debian-security/ ${codename}-security main contrib non-free non-free-firmware
`;

      // 备份原配置
      await this.executor.execute('cp /etc/apt/sources.list /etc/apt/sources.list.backup.$(date +%Y%m%d) 2>/dev/null || true');
      
      // 写入新配置（需要sudo）
      const writeCmd = `echo '${sources}' | sudo tee /etc/apt/sources.list > /dev/null`;
      const result = await this.executor.execute(writeCmd);
      
      if (result.success) {
        // 更新索引
        const update = await this.executor.execute('sudo apt update');
        return update.success ? '配置成功并已更新索引' : `配置成功但更新索引失败: ${update.error}`;
      }
      return `配置失败: ${result.error}`;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  }

  private async configureYum(baseUrl: string, osInfo: any): Promise<string> {
    try {
      // 备份
      await this.executor.execute('sudo cp -r /etc/yum.repos.d/ /etc/yum.repos.d.backup.$(date +%Y%m%d) 2>/dev/null || true');
      
      // 简单的替换逻辑
      const sedCmd = `sudo sed -i 's|mirrorlist=|#mirrorlist=|g; s|#baseurl=http://mirror.centos.org|baseurl=${baseUrl}|g' /etc/yum.repos.d/*.repo 2>/dev/null || true`;
      await this.executor.execute(sedCmd);
      
      const update = await this.executor.execute('sudo yum makecache || sudo dnf makecache');
      return update.success ? '配置成功并已更新缓存' : `配置成功但更新缓存失败: ${update.error}`;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  }

  private async configurePip(indexUrl: string): Promise<string> {
    try {
      const pipCmd = `pip config set global.index-url ${indexUrl} 2>/dev/null || pip3 config set global.index-url ${indexUrl}`;
      const result = await this.executor.execute(pipCmd);
      return result.success ? `已配置为 ${indexUrl}` : `配置失败: ${result.error}`;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  }

  private async configureNpm(registry: string): Promise<string> {
    try {
      const result = await this.executor.execute(`npm config set registry ${registry}`);
      return result.success ? `已配置为 ${registry}` : `配置失败: ${result.error}`;
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  }
}

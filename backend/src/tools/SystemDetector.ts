import { CommandExecutor } from '../tools/CommandExecutor';

export interface OSInfo {
  id: string;
  name: string;
  version: string;
  codename?: string;
  like?: string;
  packageManager: 'apt' | 'yum' | 'dnf' | 'pacman' | 'unknown';
  isDocker: boolean;
  isWSL: boolean;
}

export class SystemDetector {
  private executor: CommandExecutor;

  constructor() {
    this.executor = new CommandExecutor();
  }

  async detect(): Promise<OSInfo> {
    const osRelease = await this.executor.execute('cat /etc/os-release');
    const lines = osRelease.output.split('\n');
    
    const info: Partial<OSInfo> = {};
    
    for (const line of lines) {
      if (line.startsWith('ID=')) {
        info.id = line.split('=')[1]?.replace(/"/g, '').trim();
      }
      if (line.startsWith('NAME=')) {
        info.name = line.split('=')[1]?.replace(/"/g, '').trim();
      }
      if (line.startsWith('VERSION_ID=')) {
        info.version = line.split('=')[1]?.replace(/"/g, '').trim();
      }
      if (line.startsWith('VERSION_CODENAME=')) {
        info.codename = line.split('=')[1]?.replace(/"/g, '').trim();
      }
      if (line.startsWith('ID_LIKE=')) {
        info.like = line.split('=')[1]?.replace(/"/g, '').trim();
      }
    }

    // 判断包管理器
    info.packageManager = this.detectPackageManager(info.id || '', info.like || '');

    // 检测容器和WSL
    const dockerCheck = await this.executor.execute('cat /proc/1/cgroup 2>/dev/null | grep -i docker | wc -l');
    info.isDocker = parseInt(dockerCheck.output.trim() || '0') > 0;

    const wslCheck = await this.executor.execute('uname -r | grep -i microsoft | wc -l');
    info.isWSL = parseInt(wslCheck.output.trim() || '0') > 0;

    return info as OSInfo;
  }

  private detectPackageManager(id: string, like: string): OSInfo['packageManager'] {
    const ids = [id, like].join(' ').toLowerCase();
    if (ids.includes('debian') || ids.includes('ubuntu')) return 'apt';
    if (ids.includes('fedora') || ids.includes('centos') || ids.includes('rhel') || ids.includes('openeuler')) {
      // 检查是yum还是dnf
      return 'dnf'; // 新版都用dnf
    }
    if (ids.includes('arch') || ids.includes('manjaro')) return 'pacman';
    return 'unknown';
  }

  async getCurrentMirrors(): Promise<Record<string, string>> {
    const mirrors: Record<string, string> = {};
    
    // APT
    const aptSources = await this.executor.execute('cat /etc/apt/sources.list 2>/dev/null | grep -v "^#" | grep -v "^$" | head -5');
    if (aptSources.output.trim()) {
      mirrors.apt = aptSources.output.split('\n')[0]?.trim() || 'default';
    }

    // YUM/DNF
    const yumRepos = await this.executor.execute('grep -r "^baseurl" /etc/yum.repos.d/ 2>/dev/null | head -3');
    if (yumRepos.output.trim()) {
      mirrors.yum = yumRepos.output.split('\n')[0]?.trim() || 'default';
    }

    // PIP
    const pipConfig = await this.executor.execute('pip config get global.index-url 2>/dev/null || pip3 config get global.index-url 2>/dev/null || echo "not set"');
    mirrors.pip = pipConfig.output.trim();

    // NPM
    const npmRegistry = await this.executor.execute('npm config get registry 2>/dev/null || echo "not set"');
    mirrors.npm = npmRegistry.output.trim();

    return mirrors;
  }
}

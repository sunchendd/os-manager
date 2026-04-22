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

const KNOWN_MIRRORS: Record<string, string> = {
  'mirrors.aliyun.com': '阿里云',
  'mirrors.cloud.tencent.com': '腾讯云',
  'mirrors.tuna.tsinghua.edu.cn': '清华大学',
  'repo.huaweicloud.com': '华为云',
  'mirrors.163.com': '网易',
  'mirrors.sohu.com': '搜狐',
  'mirror.centos.org': '官方CentOS',
  'deb.debian.org': '官方Debian',
  'archive.ubuntu.com': '官方Ubuntu',
  'pypi.org': '官方PyPI',
  'registry.npmjs.org': '官方NPM',
  'registry.npmmirror.com': '淘宝NPM',
};

function identifyMirror(url: string): string {
  for (const [domain, name] of Object.entries(KNOWN_MIRRORS)) {
    if (url.includes(domain)) {
      return name;
    }
  }
  // 如果无法识别，返回截断的URL
  if (url.length > 40) {
    return url.substring(0, 37) + '...';
  }
  return url;
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
    
    // APT - 读取所有非注释行，识别镜像源
    const aptSources = await this.executor.execute('cat /etc/apt/sources.list 2>/dev/null | grep -v "^#" | grep -v "^$" | grep "^deb " | head -5');
    if (aptSources.output.trim()) {
      const firstLine = aptSources.output.split('\n')[0]?.trim() || '';
      const urlMatch = firstLine.match(/deb\s+(https?:\/\/[^\s]+)/);
      mirrors.apt = urlMatch ? identifyMirror(urlMatch[1]) : 'default';
    } else {
      mirrors.apt = '未配置';
    }

    // YUM/DNF - 读取 baseurl
    const yumRepos = await this.executor.execute('grep -rh "^baseurl=" /etc/yum.repos.d/ 2>/dev/null | head -3');
    if (yumRepos.output.trim()) {
      const firstLine = yumRepos.output.split('\n')[0]?.trim() || '';
      const urlMatch = firstLine.match(/baseurl=(https?:\/\/[^\/]+)/);
      mirrors.yum = urlMatch ? identifyMirror(urlMatch[1]) : 'default';
    } else {
      mirrors.yum = '未配置';
    }

    // PIP
    const pipConfig = await this.executor.execute('pip config get global.index-url 2>/dev/null || pip3 config get global.index-url 2>/dev/null || echo "not set"');
    const pipUrl = pipConfig.output.trim();
    mirrors.pip = pipUrl === 'not set' ? '未配置' : identifyMirror(pipUrl);

    // NPM
    const npmRegistry = await this.executor.execute('npm config get registry 2>/dev/null || echo "not set"');
    const npmUrl = npmRegistry.output.trim();
    mirrors.npm = npmUrl === 'not set' ? '未配置' : identifyMirror(npmUrl);

    return mirrors;
  }
}

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  source: 'opencode' | 'github' | 'custom';
  repo?: string;
  installedAt: number;
  location: string;
}

// opencode skill 目录
const OPENCODE_SKILL_DIR = '/root/.config/opencode/skill';
// 项目本地 skill 目录
const LOCAL_SKILL_DIR = path.join(process.cwd(), 'data', 'skills-content');

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  constructor() {
    this.init();
  }

  private async init() {
    await this.loadOpenCodeSkills();
    await this.loadLocalSkills();
  }

  // 扫描 opencode 的 skill 目录
  private async loadOpenCodeSkills() {
    try {
      if (!existsSync(OPENCODE_SKILL_DIR)) {
        console.log('opencode skill 目录不存在:', OPENCODE_SKILL_DIR);
        return;
      }

      const entries = await fs.readdir(OPENCODE_SKILL_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        // 处理目录和符号链接
        const isDir = entry.isDirectory() || entry.isSymbolicLink();
        if (!isDir) continue;
        
        const skillDir = path.join(OPENCODE_SKILL_DIR, entry.name);
        const skillFile = path.join(skillDir, 'SKILL.md');
        
        if (!existsSync(skillFile)) continue;

        try {
          const content = await fs.readFile(skillFile, 'utf-8');
          const { name, description } = this.parseSkillFrontmatter(content);
          
          const skill: Skill = {
            id: `opencode-${entry.name}`,
            name: name || entry.name,
            description: description || 'opencode 内置技能',
            content,
            source: 'opencode',
            installedAt: 0,
            location: skillDir,
          };
          
          this.skills.set(skill.id, skill);
        } catch (e) {
          console.error(`读取 skill ${entry.name} 失败:`, e);
        }
      }
      
      const opencodeCount = Array.from(this.skills.values()).filter(s => s.source === 'opencode').length;
      console.log(`✅ 加载了 ${opencodeCount} 个 opencode skills`);
    } catch (e) {
      console.error('加载 opencode skills 失败:', e);
    }
  }

  // 加载本地 skills
  private async loadLocalSkills() {
    try {
      await fs.mkdir(LOCAL_SKILL_DIR, { recursive: true });
      const entries = await fs.readdir(LOCAL_SKILL_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const skillDir = path.join(LOCAL_SKILL_DIR, entry.name);
        const skillFile = path.join(skillDir, 'SKILL.md');
        
        if (!existsSync(skillFile)) continue;

        try {
          const content = await fs.readFile(skillFile, 'utf-8');
          const { name, description } = this.parseSkillFrontmatter(content);
          
          const skill: Skill = {
            id: `local-${entry.name}`,
            name: name || entry.name,
            description: description || '本地自定义技能',
            content,
            source: 'custom',
            installedAt: Date.now(),
            location: skillDir,
          };
          
          this.skills.set(skill.id, skill);
        } catch (e) {
          console.error(`读取本地 skill ${entry.name} 失败:`, e);
        }
      }
    } catch (e) {
      console.error('加载本地 skills 失败:', e);
    }
  }

  // 解析 SKILL.md 的 YAML frontmatter
  private parseSkillFrontmatter(content: string): { name: string; description: string } {
    const result = { name: '', description: '' };
    
    // 匹配 --- ... --- 格式的 frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      const nameMatch = fm.match(/name:\s*(.+)/);
      const descMatch = fm.match(/description:\s*(.+)/);
      if (nameMatch) result.name = nameMatch[1].trim();
      if (descMatch) result.description = descMatch[1].trim();
    }
    
    // 如果没有 frontmatter，尝试从内容中提取
    if (!result.name) {
      const titleMatch = content.match(/^#\s+(.+)/m);
      if (titleMatch) result.name = titleMatch[1].trim();
    }
    
    if (!result.description) {
      // 找第一个段落作为描述
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
      if (lines.length > 0) {
        result.description = lines[0].trim().substring(0, 200);
      }
    }
    
    return result;
  }

  // 安装 skill 从 GitHub
  // 支持格式:
  // 1. owner/repo - 下载根目录 SKILL.md
  // 2. owner/repo --skill subdir - 下载子目录中的 skill (兼容 npx skills add 格式)
  async installFromGitHub(repo: string, subSkill?: string): Promise<Skill> {
    // 处理完整 GitHub URL
    let cleanRepo = repo;
    if (repo.includes('github.com/')) {
      const match = repo.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (match) {
        cleanRepo = match[1];
      }
    }
    // 去掉 .git 后缀
    cleanRepo = cleanRepo.replace(/\.git$/, '');

    // 验证格式
    if (!cleanRepo.includes('/')) {
      throw new Error('格式错误，请使用 owner/repo 或 https://github.com/owner/repo 格式');
    }

    const [owner, repoName] = cleanRepo.split('/');
    const branch = 'main'; // 默认分支

    // 尝试多个可能的 URL
    const urls: string[] = [];

    if (subSkill) {
      // 指定了子 skill，尝试子目录路径
      // 兼容常见布局: skills/subSkill/, skill/subSkill/, 或直接在 subSkill/
      urls.push(
        `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/skills/${subSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/skill/${subSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${subSkill}/SKILL.md`,
      );
    } else {
      // 没有指定子 skill，先尝试根目录
      urls.push(
        `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/skills/${repoName}/SKILL.md`,
      );
    }

    let content: string | null = null;
    let successUrl = '';

    for (const url of urls) {
      try {
        console.log(`尝试下载: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          content = await response.text();
          successUrl = url;
          break;
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.log(`下载超时: ${url}`);
        } else {
          console.log(`下载失败: ${url}`);
        }
      }
    }

    if (!content) {
      const hint = subSkill
        ? `请检查子目录 skills/${subSkill}/ 或 ${subSkill}/ 是否存在 SKILL.md`
        : '请检查仓库是否存在且包含 SKILL.md';
      throw new Error(`无法从 GitHub 下载 skill: ${cleanRepo}。${hint}`);
    }

    // 保存到本地
    const dirName = subSkill ? `${owner}-${repoName}-${subSkill}` : `${owner}-${repoName}`;
    const skillDir = path.join(LOCAL_SKILL_DIR, dirName);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8');

    const { name, description } = this.parseSkillFrontmatter(content);
    const displayName = name || (subSkill ? `${subSkill} (${owner}/${repoName})` : `${owner}/${repoName}`);

    const skill: Skill = {
      id: subSkill ? `github-${owner}-${repoName}-${subSkill}` : `github-${owner}-${repoName}`,
      name: displayName,
      description: description || `从 GitHub 安装: ${cleanRepo}${subSkill ? `/${subSkill}` : ''}`,
      content,
      source: 'github',
      repo: cleanRepo,
      installedAt: Date.now(),
      location: skillDir,
    };

    this.skills.set(skill.id, skill);
    console.log(`✅ 安装 skill 成功: ${skill.name} (${successUrl})`);
    return skill;
  }

  // 获取所有 skills
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  // 根据 ID 获取 skill
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  // 根据名称模糊查找 skill
  findSkillsByKeyword(keyword: string): Skill[] {
    const lower = keyword.toLowerCase();
    return this.getAllSkills().filter(s => 
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower)
    );
  }

  // 卸载 skill
  async uninstallSkill(id: string): Promise<{ success: boolean; error?: string }> {
    const skill = this.skills.get(id);
    if (!skill) return { success: false, error: 'Skill 未找到' };

    // 不能卸载 opencode 内置 skill
    if (skill.source === 'opencode') {
      return { success: false, error: '不能卸载 opencode 内置 skill' };
    }

    this.skills.delete(id);

    try {
      await fs.rm(skill.location, { recursive: true, force: true });
    } catch (e: any) {
      console.error('删除 skill 文件失败:', e);
      return { success: true, error: 'Skill 已从注册表移除，但文件删除失败: ' + e.message };
    }

    return { success: true };
  }

  // 强制卸载 skill（用于文件损坏或无法删除的情况）
  async forceUninstallSkill(id: string): Promise<{ success: boolean; error?: string }> {
    const skill = this.skills.get(id);
    if (!skill) return { success: false, error: 'Skill 未找到' };

    if (skill.source === 'opencode') {
      return { success: false, error: '不能卸载 opencode 内置 skill' };
    }

    this.skills.delete(id);

    try {
      await fs.rm(skill.location, { recursive: true, force: true });
    } catch (e: any) {
      console.error('强制删除 skill 文件失败:', e);
    }

    return { success: true };
  }

  // 获取 skills 内容用于注入 prompt
  getSkillsContentForPrompt(keywords: string[]): string {
    const matchedSkills = new Set<Skill>();
    
    for (const keyword of keywords) {
      const found = this.findSkillsByKeyword(keyword);
      found.forEach(s => matchedSkills.add(s));
    }

    if (matchedSkills.size === 0) return '';

    const contents: string[] = [];
    for (const skill of matchedSkills) {
      contents.push(`\n==== ${skill.name} ====\n${skill.description}\n${skill.content.substring(0, 8000)}\n`);
    }

    return contents.join('\n');
  }
}

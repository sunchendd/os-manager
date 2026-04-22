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

  // 安装 skill 从 GitHub (owner/repo 格式)
  async installFromGitHub(repo: string): Promise<Skill> {
    // 验证格式
    if (!repo.includes('/')) {
      throw new Error('格式错误，请使用 owner/repo 格式，例如: vercel-labs/skills');
    }

    const [owner, repoName] = repo.split('/');
    const skillName = repoName.replace(/-skill$/, '').replace(/-skills$/, '');
    
    // 尝试多个可能的 URL
    const urls = [
      `https://raw.githubusercontent.com/${owner}/${repoName}/main/SKILL.md`,
      `https://raw.githubusercontent.com/${owner}/${repoName}/master/SKILL.md`,
      `https://raw.githubusercontent.com/${owner}/${repoName}/main/skills/${skillName}/SKILL.md`,
    ];

    let content: string | null = null;
    let successUrl = '';

    for (const url of urls) {
      try {
        console.log(`尝试下载: ${url}`);
        const response = await fetch(url, { timeout: 10000 } as any);
        if (response.ok) {
          content = await response.text();
          successUrl = url;
          break;
        }
      } catch (e) {
        console.log(`下载失败: ${url}`);
      }
    }

    if (!content) {
      throw new Error(`无法从 GitHub 下载 skill: ${repo}。请检查仓库是否存在且包含 SKILL.md`);
    }

    // 保存到本地
    const skillDir = path.join(LOCAL_SKILL_DIR, `${owner}-${repoName}`);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8');

    const { name, description } = this.parseSkillFrontmatter(content);
    
    const skill: Skill = {
      id: `github-${owner}-${repoName}`,
      name: name || `${owner}/${repoName}`,
      description: description || `从 GitHub 安装: ${repo}`,
      content,
      source: 'github',
      repo,
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
  async uninstallSkill(id: string): Promise<boolean> {
    const skill = this.skills.get(id);
    if (!skill) return false;
    
    // 不能卸载 opencode 内置 skill
    if (skill.source === 'opencode') {
      throw new Error('不能卸载 opencode 内置 skill');
    }

    this.skills.delete(id);
    
    try {
      await fs.rm(skill.location, { recursive: true, force: true });
    } catch (e) {
      console.error('删除 skill 文件失败:', e);
    }
    
    return true;
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

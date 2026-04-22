import OpenAI from 'openai';
import { config } from '../config';
import { ToolRegistry } from '../tools/ToolRegistry';
import { RiskEngine } from '../risk/RiskEngine';
import { SessionManager } from './SessionManager';
import { SkillRegistry } from './SkillRegistry';
import type { Message, ToolResult, RiskAssessment } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 解析DeepSeek XML格式的function call（支持多种变体）
function parseDSMLFunctionCalls(content: string): Array<{name: string; arguments: Record<string, any>}> | null {
  const calls: Array<{name: string; arguments: Record<string, any>}> = [];

  // 变体1: <｜DSML｜function_call name="xxx" args='{"key":"value"}'>
  const funcCallRegex = /<｜DSML｜function_call\s+name="([^"]+)"\s+args='([^']+)'\s*>/g;
  let match;
  while ((match = funcCallRegex.exec(content)) !== null) {
    try {
      const args = JSON.parse(match[2]);
      calls.push({ name: match[1], arguments: args });
    } catch {
      calls.push({ name: match[1], arguments: {} });
    }
  }

  // 变体2: <｜DSML｜invoke name="xxx">...<｜DSML｜invoke_arg name="cmd">value</｜DSML｜invoke_arg>...</｜DSML｜invoke>
  if (calls.length === 0) {
    const invokeRegex = /<｜DSML｜invoke\s+name="([^"]+)">([\s\S]*?)<\/｜DSML｜invoke>/g;
    while ((match = invokeRegex.exec(content)) !== null) {
      const funcName = match[1];
      const inner = match[2];
      const args: Record<string, any> = {};

      const argRegex = /<｜DSML｜invoke_arg\s+name="([^"]+)">([\s\S]*?)<\/｜DSML｜invoke_arg>/g;
      let argMatch;
      while ((argMatch = argRegex.exec(inner)) !== null) {
        args[argMatch[1]] = argMatch[2].trim();
      }

      // 备用: parameter 标签
      const paramRegex = /<｜DSML｜parameter\s+name="([^"]+)">([\s\S]*?)<\/｜DSML｜parameter>/g;
      while ((argMatch = paramRegex.exec(inner)) !== null) {
        if (!args[argMatch[1]]) args[argMatch[1]] = argMatch[2].trim();
      }

      calls.push({ name: funcName, arguments: args });
    }
  }

  // 变体3: <｜DSML｜function_calls> 外层包裹，提取所有 function_call
  if (calls.length === 0) {
    const wrappedRegex = /<｜DSML｜function_calls>([\s\S]*?)<\/｜DSML｜function_calls>/g;
    while ((match = wrappedRegex.exec(content)) !== null) {
      const inner = match[1];
      // 递归解析内部
      const innerCalls = parseDSMLFunctionCalls(inner);
      if (innerCalls) calls.push(...innerCalls);
    }
  }

  return calls.length > 0 ? calls : null;
}

function extractCommandFromContent(content: string): string | null {
  const codeBlockMatch = content.match(/```\n?\$?\s*(.+?)\n?```/s);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  const backtickMatch = content.match(/`([^`]+)`/);
  if (backtickMatch && (backtickMatch[1].includes(' ') || backtickMatch[1].startsWith('sudo'))) {
    return backtickMatch[1].trim();
  }
  
  return null;
}

// 检测用户输入中涉及的 skill 关键词
function detectSkillKeywords(input: string): string[] {
  const keywords: string[] = [];
  const lower = input.toLowerCase();
  
  const keywordMap: Record<string, string[]> = {
    'git': ['git', 'commit', 'merge', 'rebase', 'branch', 'cherry-pick'],
    'linux': ['linux', 'centos', 'debian', 'ubuntu', '系统'],
    'docker': ['docker', 'container', '镜像', '容器'],
    'nginx': ['nginx', 'web服务器', '反向代理'],
    'database': ['database', 'mysql', 'postgres', 'sql', '数据库'],
    'python': ['python', 'pip', 'python3'],
    'node': ['node', 'npm', 'javascript', 'js'],
    'security': ['security', '安全', '防火墙', 'firewall', 'ssl'],
    'plan': ['plan', '计划', '规划', '设计'],
    'debug': ['debug', '调试', 'bug', '错误'],
    'skill': ['skill', '技能'],
  };
  
  for (const [skillName, triggers] of Object.entries(keywordMap)) {
    if (triggers.some(t => lower.includes(t))) {
      keywords.push(skillName);
    }
  }
  
  return keywords;
}

export class AgentCore {
  private openai: OpenAI;
  private toolRegistry: ToolRegistry;
  private riskEngine: RiskEngine;
  private sessionManager: SessionManager;
  private skillRegistry: SkillRegistry;

  constructor(sessionManager: SessionManager) {
    this.openai = new OpenAI({
      apiKey: config.deepseek.apiKey,
      baseURL: config.deepseek.baseURL,
    });
    this.toolRegistry = new ToolRegistry();
    this.riskEngine = new RiskEngine();
    this.sessionManager = sessionManager;
    this.skillRegistry = new SkillRegistry();
  }

  getSkillRegistry(): SkillRegistry {
    return this.skillRegistry;
  }

  private buildSystemPrompt(userInput: string): string {
    const keywords = detectSkillKeywords(userInput);
    const skillsContent = this.skillRegistry.getSkillsContentForPrompt(keywords);
    
    let prompt = `你是一个专业的操作系统智能代理。你的职责是通过自然语言帮助用户管理Linux服务器。

你可以使用以下工具来执行操作：
- execute_command: 执行任意系统命令（适用于查询类操作）
- get_disk_usage: 获取磁盘使用情况
- get_memory_info: 获取内存使用情况  
- get_process_list: 获取进程列表
- find_files: 查找文件或列出目录
- get_network_info: 获取网络端口信息
- create_user: 创建系统用户
- delete_user: 删除系统用户

重要规则：
1. 当用户询问系统状态时，直接调用工具获取信息并给出清晰的中文解释
2. 对于只读查询操作（如查看磁盘、内存、进程），直接执行
3. 对于修改类操作（如创建/删除用户、删除文件），说明操作内容并询问用户确认
4. 绝不执行可能导致系统不可用的危险命令
5. 用中文回复用户，解释执行了什么操作以及结果含义
6. 如果用户请求使用了 skill 相关内容，请参考下方的 skill 知识
7. 当你已经获得工具执行结果后，请直接根据结果生成最终回复给用户，不要再发起新的工具调用

回复格式：
- 先简要说明获取了什么信息
- 然后提供易于理解的分析结果（不要只是贴原始输出）
- 最后给出建议或结论`;

    if (skillsContent) {
      prompt += `\n\n===== 相关知识技能 =====\n${skillsContent}\n========================`;
    }

    return prompt;
  }

  private extractToolCalls(assistantMessage: any): Array<{id: string; name: string; arguments: Record<string, any>}> {
    const toolCallsToExecute: Array<{id: string; name: string; arguments: Record<string, any>}> = [];

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const tc of assistantMessage.tool_calls) {
        try {
          toolCallsToExecute.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          });
        } catch {
          toolCallsToExecute.push({
            id: tc.id,
            name: tc.function.name,
            arguments: {},
          });
        }
      }
    } else if (assistantMessage.content) {
      const dsmlCalls = parseDSMLFunctionCalls(assistantMessage.content);
      if (dsmlCalls) {
        for (let idx = 0; idx < dsmlCalls.length; idx++) {
          toolCallsToExecute.push({
            id: `dsml_${idx}`,
            name: dsmlCalls[idx].name,
            arguments: dsmlCalls[idx].arguments,
          });
        }
      }
    }

    return toolCallsToExecute;
  }

  private async executeToolCalls(
    toolCallsToExecute: Array<{id: string; name: string; arguments: Record<string, any>}>,
    onRiskConfirm?: (assessment: RiskAssessment) => Promise<boolean>
  ): Promise<{toolResults: ToolResult[]; riskAssessments: RiskAssessment[]; shouldExecute: boolean}> {
    const toolResults: ToolResult[] = [];
    const riskAssessments: RiskAssessment[] = [];
    let shouldExecute = true;

    for (const toolCall of toolCallsToExecute) {
      const tool = this.toolRegistry.get(toolCall.name);

      if (tool) {
        const command = toolCall.arguments.command || '';
        if (command) {
          const risk = this.riskEngine.assess(command);
          riskAssessments.push(risk);

          if (risk.level === 'danger') {
            shouldExecute = false;
          } else if (risk.level === 'warning' && onRiskConfirm) {
            const confirmed = await onRiskConfirm(risk);
            if (!confirmed) {
              shouldExecute = false;
            }
          }
        }

        if (shouldExecute) {
          try {
            const result = await tool.handler(toolCall.arguments);
            toolResults.push(result);
            console.log(`工具 ${toolCall.name} 执行结果:`, result.success ? '成功' : '失败');
          } catch (e: any) {
            toolResults.push({ success: false, output: '', error: e.message });
          }
        } else {
          toolResults.push({ success: false, output: '', error: '操作被阻止' });
        }
      } else {
        toolResults.push({ success: false, output: '', error: `未知工具: ${toolCall.name}` });
      }
    }

    return { toolResults, riskAssessments, shouldExecute };
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

    const systemPrompt = this.buildSystemPrompt(userInput);
    let messages = this.buildMessages(session, systemPrompt);
    
    const maxRounds = 10;
    let lastRiskLevel: string = 'safe';

    for (let round = 0; round < maxRounds; round++) {
      console.log(`=== AI 第${round + 1}轮请求 ===`);
      
      const response = await this.openai.chat.completions.create({
        model: config.deepseek.model,
        messages,
        tools: this.toolRegistry.getOpenAIFunctions(),
        tool_choice: 'auto',
        temperature: 0.3,
      });

      const assistantMessage = response.choices[0].message;
      const rawContent = assistantMessage.content || '';
      
      console.log('AI回复前200字:', rawContent.substring(0, 200));
      console.log('tool_calls存在?', !!(assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0));

      const toolCallsToExecute = this.extractToolCalls(assistantMessage);

      if (toolCallsToExecute.length > 0) {
        // 执行工具调用
        const { toolResults, riskAssessments, shouldExecute } = await this.executeToolCalls(toolCallsToExecute, onRiskConfirm);
        lastRiskLevel = riskAssessments[0]?.level || 'safe';

        // 构建下一轮消息
        if (assistantMessage.tool_calls) {
          messages.push({
            role: 'assistant',
            content: rawContent,
            tool_calls: assistantMessage.tool_calls,
          });
        } else {
          messages.push({
            role: 'assistant',
            content: rawContent,
          });
        }

        for (let i = 0; i < toolCallsToExecute.length; i++) {
          const tc = toolCallsToExecute[i];
          const result = toolResults[i];
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result.success 
              ? (result.output || '执行成功')
              : (result.error || '执行失败'),
          });
        }

        console.log('工具执行完成，进入下一轮对话');
        continue; // 继续循环，让AI处理工具结果
      }

      // 没有标准工具调用，检查是否有 markdown 代码块中的命令（fallback）
      const fallbackCommand = extractCommandFromContent(rawContent);
      if (fallbackCommand && round < maxRounds - 1) {
        console.log('Fallback执行命令:', fallbackCommand);
        const tool = this.toolRegistry.get('execute_command');
        if (tool) {
          const result = await tool.handler({ command: fallbackCommand });
          messages.push({
            role: 'assistant',
            content: rawContent,
          });
          messages.push({
            role: 'user',
            content: `请根据以下命令执行结果回答用户问题，不要发起新的工具调用：\n\n命令: ${fallbackCommand}\n结果: ${result.success ? result.output : result.error}`,
          });
          continue;
        }
      }

      // AI 不再返回工具调用，生成最终回复
      console.log('生成最终回复');
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: rawContent,
        type: lastRiskLevel === 'danger' ? 'risk' : 'text',
        riskLevel: lastRiskLevel as any,
        timestamp: Date.now(),
      };
      this.sessionManager.addMessage(sessionId, assistantMsg);
      return [userMessage, assistantMsg];
    }

    // 达到最大轮数
    console.warn('达到最大交互轮数');
    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '抱歉，该请求需要过多步骤来处理。请尝试简化您的问题，或分步骤提问。',
      type: 'error',
      timestamp: Date.now(),
    };
    this.sessionManager.addMessage(sessionId, assistantMsg);
    return [userMessage, assistantMsg];
  }

  private buildMessages(session: any, systemPrompt: string): any[] {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    const recentMessages = session.messages.slice(-40);
    
    for (const m of recentMessages) {
      if (m.role === 'system') continue;
      messages.push({
        role: m.role,
        content: m.content,
      });
    }

    return messages;
  }
}

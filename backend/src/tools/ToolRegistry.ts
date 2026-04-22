import { SystemTools } from './SystemTools';
import type { ToolResult } from '../types';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<ToolResult>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private systemTools: SystemTools;

  constructor() {
    this.systemTools = new SystemTools();
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    this.register({
      name: 'execute_command',
      description: '在Linux服务器上执行任意系统命令。对于查询类操作使用此工具。',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的Linux命令',
          },
        },
        required: ['command'],
      },
      handler: (args) => this.systemTools.executeCommand(args.command),
    });

    this.register({
      name: 'get_disk_usage',
      description: '获取磁盘使用情况',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: () => this.systemTools.getDiskUsage(),
    });

    this.register({
      name: 'get_memory_info',
      description: '获取内存使用情况',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: () => this.systemTools.getMemoryInfo(),
    });

    this.register({
      name: 'get_process_list',
      description: '获取进程列表',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: () => this.systemTools.getProcessList(),
    });

    this.register({
      name: 'find_files',
      description: '查找文件或列出目录内容',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '要搜索的路径',
          },
          name: {
            type: 'string',
            description: '文件名模式（可选）',
          },
        },
        required: ['path'],
      },
      handler: (args) => this.systemTools.findFiles(args.path, args.name),
    });

    this.register({
      name: 'get_network_info',
      description: '获取网络连接和端口信息',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: () => this.systemTools.getNetworkInfo(),
    });

    this.register({
      name: 'create_user',
      description: '创建系统用户',
      parameters: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: '用户名',
          },
          password: {
            type: 'string',
            description: '密码（可选）',
          },
        },
        required: ['username'],
      },
      handler: (args) => this.systemTools.createUser(args.username, args.password),
    });

    this.register({
      name: 'delete_user',
      description: '删除系统用户',
      parameters: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: '要删除的用户名',
          },
        },
        required: ['username'],
      },
      handler: (args) => this.systemTools.deleteUser(args.username),
    });
  }

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getOpenAIFunctions() {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}

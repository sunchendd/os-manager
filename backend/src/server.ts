import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { config } from './config';
import { AgentCore } from './agent/AgentCore';
import { MockAgentCore } from './agent/MockAgentCore';
import { SessionManager } from './agent/SessionManager';

import { SystemTools } from './tools/SystemTools';
import { SystemDetector } from './tools/SystemDetector';
import { MirrorConfigurator } from './tools/MirrorConfigurator';
import { OptimizationEngine } from './tools/OptimizationEngine';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

const sessionManager = new SessionManager();
const systemDetector = new SystemDetector();
const mirrorConfigurator = new MirrorConfigurator();
const optimizationEngine = new OptimizationEngine();

// 根据API key是否配置选择Agent
const useRealAI = !!config.deepseek.apiKey && config.deepseek.apiKey !== 'sk-test-key-placeholder';
const agent = useRealAI 
  ? new AgentCore(sessionManager)
  : new MockAgentCore(sessionManager);

console.log(`🤖 AI模式: ${useRealAI ? 'DeepSeek API' : '本地规则引擎（演示模式）'}`);

const systemTools = new SystemTools();

// REST API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: useRealAI ? 'deepseek' : 'mock',
    timestamp: new Date().toISOString() 
  });
});

// 系统信息
app.get('/api/system-info', async (req, res) => {
  try {
    const result = await systemTools.getSystemInfo();
    res.json({ success: result.success, data: result.output });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/disk', async (req, res) => {
  try {
    const result = await systemTools.getDiskUsage();
    res.json({ success: result.success, data: result.output });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/memory', async (req, res) => {
  try {
    const result = await systemTools.getMemoryInfo();
    res.json({ success: result.success, data: result.output });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/processes', async (req, res) => {
  try {
    const result = await systemTools.getProcessList();
    res.json({ success: result.success, data: result.output });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 聚合仪表盘数据接口（解决加载慢问题）
app.get('/api/dashboard', async (req, res) => {
  try {
    const [disk, memory, processes, sysInfo] = await Promise.all([
      systemTools.getDiskUsage(),
      systemTools.getMemoryInfo(),
      systemTools.getProcessList(),
      systemTools.getSystemInfo(),
    ]);

    res.json({
      success: true,
      data: {
        disk: disk.success ? disk.output : null,
        memory: memory.success ? memory.output : null,
        processes: processes.success ? processes.output : null,
        sysInfo: sysInfo.success ? sysInfo.output : null,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 系统服务列表
app.get('/api/services', async (req, res) => {
  try {
    const result = await systemTools.executeCommand('systemctl list-units --type=service --state=running --no-pager --no-legend | head -30');
    const services = result.output.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        name: parts[0] || '',
        load: parts[1] || '',
        active: parts[2] || '',
        sub: parts[3] || '',
        description: parts.slice(4).join(' ') || '',
      };
    }).filter(s => s.name);
    res.json({ success: true, data: services });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/services/:name/:action', async (req, res) => {
  try {
    const { name, action } = req.params;
    if (!['start', 'stop', 'restart', 'status'].includes(action)) {
      return res.status(400).json({ success: false, error: '无效的操作' });
    }
    const result = await systemTools.executeCommand(`sudo systemctl ${action} ${name}`);
    res.json({ success: result.success, output: result.output || result.error });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== OS检测与镜像源 ==========
app.get('/api/os-info', async (req, res) => {
  try {
    const osInfo = await systemDetector.detect();
    const mirrors = await systemDetector.getCurrentMirrors();
    res.json({ success: true, data: { os: osInfo, mirrors } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/mirrors', (req, res) => {
  res.json({ success: true, data: mirrorConfigurator.getAvailableMirrors() });
});

app.post('/api/mirrors/configure', async (req, res) => {
  try {
    const { mirror } = req.body;
    const result = await mirrorConfigurator.configureMirror(mirror);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, output: error.message });
  }
});

// ========== 优化工具 ==========
app.get('/api/optimization/tools', async (req, res) => {
  try {
    const tools = await optimizationEngine.getToolsWithStatus();
    res.json({ success: true, data: tools });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/optimization/run', async (req, res) => {
  try {
    const { toolId } = req.body;
    const result = await optimizationEngine.runTool(toolId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, output: error.message });
  }
});

app.get('/api/optimization/score', async (req, res) => {
  try {
    const score = await optimizationEngine.getSystemScore();
    res.json({ success: true, data: score });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 技能管理 ==========
app.get('/api/skills', (req, res) => {
  res.json({ success: true, data: agent.getSkillRegistry().getAllSkills() });
});

app.get('/api/skills/:id', (req, res) => {
  const skill = agent.getSkillRegistry().getSkill(req.params.id);
  if (skill) {
    res.json({ success: true, data: skill });
  } else {
    res.status(404).json({ success: false, error: '技能未找到' });
  }
});

app.post('/api/skills/install', async (req, res) => {
  try {
    const { repo, skill: subSkill } = req.body;
    const skill = await agent.getSkillRegistry().installFromGitHub(repo, subSkill);
    res.json({ success: true, data: skill });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/skills/:id', async (req, res) => {
  try {
    const deleted = await agent.getSkillRegistry().uninstallSkill(req.params.id);
    res.json({ success: deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);

  // 实时系统状态推送（每5秒）
  const pushSystemStats = async () => {
    try {
      const [disk, memory, processes, sysInfo] = await Promise.all([
        systemTools.getDiskUsage(),
        systemTools.getMemoryInfo(),
        systemTools.getProcessList(),
        systemTools.getSystemInfo(),
      ]);
      socket.emit('system_stats', {
        disk: disk.success ? disk.output : null,
        memory: memory.success ? memory.output : null,
        processes: processes.success ? processes.output : null,
        sysInfo: sysInfo.success ? sysInfo.output : null,
        timestamp: Date.now(),
      });
    } catch (e) {
      // 静默失败，不中断连接
    }
  };

  // 立即推送一次，然后定时推送
  pushSystemStats();
  const statsInterval = setInterval(pushSystemStats, 5000);

  socket.on('create_session', () => {
    const session = sessionManager.createSession();
    socket.join(session.id);
    socket.emit('session_created', { sessionId: session.id });
  });

  socket.on('send_message', async (data: { sessionId: string; message: string }) => {
    try {
      const { sessionId, message } = data;
      
      socket.emit('typing', { sessionId, typing: true });

      const messages = await agent.processMessage(sessionId, message, async (risk) => {
        return new Promise((resolve) => {
          socket.emit('risk_confirm', {
            sessionId,
            risk,
          });
          
          socket.once('risk_response', (data: { confirmed: boolean }) => {
            resolve(data.confirmed);
          });
          
          setTimeout(() => resolve(false), 30000);
        });
      });

      socket.emit('typing', { sessionId, typing: false });
      
      for (const msg of messages) {
        if (msg.role === 'assistant') {
          socket.emit('message', {
            sessionId,
            message: msg,
          });
        }
      }
    } catch (error: any) {
      socket.emit('error', {
        message: error.message || '处理消息时出错',
      });
    }
  });

  socket.on('clear_session', (data: { sessionId: string }) => {
    sessionManager.clearSession(data.sessionId);
    socket.emit('session_cleared', { sessionId: data.sessionId });
  });

  socket.on('disconnect', () => {
    clearInterval(statsInterval);
    console.log('客户端断开:', socket.id);
  });
});

// 所有其他路由返回前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log(`🚀 OS智能代理服务器运行在端口 ${PORT}`);
  console.log(`📡 Socket.io 已启用`);
  console.log(`🌐 前端地址: ${config.frontendUrl}`);
  console.log(`📁 静态文件: ${path.join(__dirname, '../../frontend/dist')}`);
});

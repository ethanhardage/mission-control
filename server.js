#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;
const WORKSPACE = '/data/.openclaw/workspace';

// CORS: allow all origins for local development
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Allowed models for agent spawn
const ALLOWED_MODELS = new Set(['kimi', 'claude', 'gpt4', 'gemini']);

// Cron history file path
const CRON_HISTORY_FILE = path.join(__dirname, 'data', 'cron-history.json');
const MAX_HISTORY = 20;

// UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Load cron history
function loadCronHistory() {
  try {
    if (fs.existsSync(CRON_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(CRON_HISTORY_FILE, 'utf-8')) || [];
    }
  } catch (e) {
    console.error('Error loading cron history:', e.message);
  }
  return [];
}

// Save cron history
function saveCronHistory(history) {
  try {
    fs.writeFileSync(CRON_HISTORY_FILE, JSON.stringify(history.slice(-MAX_HISTORY), null, 2));
  } catch (e) {
    console.error('Error saving cron history:', e.message);
  }
}

// Add a cron run record
function addCronRunRecord(cronId, name, status, exitCode, durationMs, outputPreview) {
  const history = loadCronHistory();
  const record = {
    id: generateUUID(),
    cronId,
    name,
    timestamp: new Date().toISOString(),
    status,
    durationMs,
    outputPreview: outputPreview?.substring(0, 200) || '',
    exitCode
  };
  history.push(record);
  saveCronHistory(history);
  return record;
}

// Validate session/cron id: alphanumeric, hyphens, underscores only
const SAFE_ID_RE = /^[\w-]+$/;

// Load schedule config once at startup
const scheduleConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'schedule.json'), 'utf-8')
);

// Helpers
function getSessionFiles() {
  try {
    return fs.readdirSync(WORKSPACE).filter(f => f.endsWith('.jsonl')).map(f => {
      const stat = fs.statSync(path.join(WORKSPACE, f));
      return { id: f.replace('.jsonl', ''), mtime: stat.mtimeMs, size: stat.size };
    }).sort((a, b) => b.mtime - a.mtime).slice(0, 20);
  } catch (e) { return []; }
}

function parseSessionFile(id) {
  try {
    const content = fs.readFileSync(path.join(WORKSPACE, id + '.jsonl'), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const messages = lines.map(l => {
      try { return JSON.parse(l); } catch(e) { return null; }
    }).filter(Boolean);

    // Extract cost/tokens from messages
    let totalTokens = 0;
    let model = 'unknown';
    const logs = [];
    const trace = [];

    messages.forEach((msg, i) => {
      if (msg.usage?.totalTokens) totalTokens = msg.usage.totalTokens;
      if (msg.model) model = msg.model.split('/').pop() || msg.model;

      // Build trace
      if (msg.role === 'assistant') {
        const hasTools = msg.content?.some(c => c.type === 'toolCall');
        trace.push({
          step: i + 1,
          name: hasTools ? 'Tool Execution' : 'LLM Response',
          status: hasTools ? 'success' : 'running',
          time: new Date(msg.timestamp).toLocaleTimeString()
        });
      }

      // Build logs
      if (msg.content) {
        msg.content.forEach(c => {
          if (c.type === 'text') logs.push({ time: new Date(msg.timestamp).toLocaleTimeString(), type: 'text', text: c.text?.substring(0, 200) });
          if (c.type === 'thinking') logs.push({ time: new Date(msg.timestamp).toLocaleTimeString(), type: 'think', text: c.thinking?.substring(0, 200) });
          if (c.type === 'toolCall') logs.push({ time: new Date(msg.timestamp).toLocaleTimeString(), type: 'tool', text: `${c.name || 'tool'}(...)` });
          if (c.type === 'toolResult') logs.push({ time: new Date(msg.timestamp).toLocaleTimeString(), type: 'tool', text: `→ ${c.output?.toString().substring(0, 100)}` });
        });
      }
    });

    return {
      id,
      messages,
      totalTokens,
      model,
      logs: logs.slice(-50), // last 50
      trace
    };
  } catch (e) {
    return { id, error: e.message };
  }
}

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/sessions', (req, res) => {
  const files = getSessionFiles();
  const now = Date.now();
  let sessions = files.map(f => {
    const ageMin = Math.round((now - f.mtime) / 60000);
    const isCron = f.id.includes('cron');
    const isSubagent = f.id.includes('subagent');
    return {
      id: f.id,
      shortId: f.id.substring(0, 8),
      name: isCron ? 'Cron Job' : (isSubagent ? 'Sub-agent' : 'Agent Session'),
      type: isCron ? 'cron' : (isSubagent ? 'subagent' : 'main'),
      status: ageMin < 60 ? 'active' : 'idle',
      lastActivity: ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin/60)}h ago`,
      size: `${Math.round(f.size/1024)}KB`
    };
  });

  // Demo data
  if (sessions.length === 0) {
    sessions = [
      { id: 'demo-main', shortId: 'demo-main', name: 'Main Agent (You)', type: 'main', status: 'active', lastActivity: 'now', size: '45KB' },
      { id: 'demo-research', shortId: 'demo-res', name: 'Research Agent', type: 'subagent', status: 'idle', lastActivity: '2m ago', size: '12KB' }
    ];
  }

  res.json({ sessions, count: sessions.length });
});

// Session detail with cost/trace/logs
app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  if (!SAFE_ID_RE.test(id)) return res.status(400).json({ error: 'Invalid session id' });

  const data = parseSessionFile(id);
  if (data.error) return res.status(404).json({ error: data.error });

  res.json({
    id: data.id,
    name: data.id.includes('subagent') ? 'Sub-agent' : (data.id.includes('cron') ? 'Cron Job' : 'Session'),
    status: 'active',
    tokens: `${Math.round(data.totalTokens/1000)}k` || '-',
    duration: '-',
    model: data.model,
    logs: data.logs,
    trace: data.trace
  });
});

// Get cron run history
app.get('/api/crons/history', (req, res) => {
  const history = loadCronHistory();
  res.json({ history: history.slice(-MAX_HISTORY).reverse() });
});

// Clear cron run history
app.delete('/api/crons/history', (req, res) => {
  saveCronHistory([]);
  res.json({ success: true, message: 'History cleared' });
});

app.get('/api/crons', (req, res) => {
  res.json({
    crons: [
      { id: 'bb0fb60e-69d0-4e53-aa7a-bdbb0d1f8e84', name: 'Morning Briefing', schedule: '7:30 AM', displaySchedule: '7:30 AM CT daily', status: 'enabled', enabled: true },
      { id: '18e381cb-45a5-4274-9da3-42845caafef7', name: 'Evening Prep', schedule: '8:00 PM', displaySchedule: '8:00 PM CT daily', status: 'enabled', enabled: true }
    ],
    count: 2
  });
});

app.post('/api/crons/:id/run', (req, res) => {
  const { id } = req.params;
  if (!SAFE_ID_RE.test(id)) return res.status(400).json({ error: 'Invalid cron id' });
  const { execFileSync } = require('child_process');
  try { execFileSync('which', ['npx']); } catch { return res.status(500).json({ success: false, error: 'npx not found' }); }
  spawn('/usr/local/bin/npx', ['openclaw', 'cron', 'run', id], { detached: true, stdio: 'ignore', cwd: WORKSPACE }).unref();
  res.json({ success: true, message: `Cron triggered` });
});

app.post('/api/agents/spawn', (req, res) => {
  let { task, model = 'kimi' } = req.body;
  if (!task) return res.status(400).json({ error: 'Task required' });
  if (typeof task !== 'string') return res.status(400).json({ error: 'Task must be a string' });
  if (task.length > 500) return res.status(400).json({ error: 'Task too long (max 500 chars)' });
  if (!ALLOWED_MODELS.has(model)) return res.status(400).json({ error: 'Invalid model' });

  const child = spawn('/usr/local/bin/npx', ['openclaw', 'sessions', 'spawn', '--task', task, '--model', model], { detached: true, stdio: 'ignore', cwd: WORKSPACE });
  child.unref();
  const pidFile = path.join(__dirname, 'pids.json');
  let pids = {};
  try { pids = JSON.parse(fs.readFileSync(pidFile, 'utf-8')); } catch {}
  // Use task slug as key since we don't have a session id at spawn time
  const key = `${Date.now()}-${task.substring(0, 20).replace(/\W+/g, '_')}`;
  pids[key] = child.pid;
  fs.writeFileSync(pidFile, JSON.stringify(pids));
  res.json({ success: true, message: 'Agent spawned', task: task.substring(0, 50), agentId: key });
});

app.post('/api/agents/:id/kill', (req, res) => {
  const { id } = req.params;
  if (!SAFE_ID_RE.test(id)) return res.status(400).json({ error: 'Invalid agent id' });
  const pidFile = path.join(__dirname, 'pids.json');
  let pids = {};
  try { pids = JSON.parse(fs.readFileSync(pidFile, 'utf-8')); } catch {}
  const pid = pids[id];
  if (!pid) return res.status(404).json({ error: 'Agent not found' });
  try {
    process.kill(pid, 'SIGTERM');
    delete pids[id];
    fs.writeFileSync(pidFile, JSON.stringify(pids));
    res.json({ success: true, message: 'Kill sent' });
  } catch (e) {
    res.status(500).json({ error: `Failed to kill: ${e.message}` });
  }
});

// Get today's classes and assignments — loaded from config/schedule.json
app.get('/api/today', (req, res) => {
  const day = new Date().getDay();
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day];

  const classes = scheduleConfig.schedule[dow] || [];
  const assignments = scheduleConfig.assignments[dow] || [];

  res.json({
    day: dow,
    fullDay: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day],
    date: new Date().toLocaleDateString(),
    classes,
    assignments,
    urgentCount: assignments.filter(a => a.urgent).length
  });
});

// SSE: stream new lines from a session's .jsonl file in real-time
app.get('/api/sessions/:id/stream', (req, res) => {
  const { id } = req.params;
  if (!SAFE_ID_RE.test(id)) return res.status(400).end();

  const filePath = path.join(WORKSPACE, id + '.jsonl');
  if (!fs.existsSync(filePath)) return res.status(404).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let offset = fs.statSync(filePath).size;

  const interval = setInterval(() => {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size <= offset) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - offset);
      fs.readSync(fd, buf, 0, buf.length, offset);
      fs.closeSync(fd);
      offset = stat.size;

      const newText = buf.toString('utf-8');
      const lines = newText.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          res.write(`data: ${JSON.stringify(msg)}\n\n`);
        } catch {}
      }
    } catch {}
  }, 500);

  req.on('close', () => clearInterval(interval));
});

app.get('/api/status', (req, res) => res.json({
  timestamp: new Date().toISOString(),
  gateway: { status: 'healthy' },
  sessions: { active: getSessionFiles().filter(f => Date.now() - f.mtime < 300000).length }
}));

app.listen(PORT, '0.0.0.0', () => console.log(`🦞 Mission Control: http://localhost:${PORT}`));

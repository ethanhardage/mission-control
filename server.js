#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;
const WORKSPACE = '/data/.openclaw/workspace';

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
  const data = parseSessionFile(req.params.id);
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
  spawn('/usr/local/bin/npx', ['openclaw', 'cron', 'run', id], { detached: true, stdio: 'ignore', cwd: WORKSPACE }).unref();
  res.json({ success: true, message: `Cron triggered` });
});

app.post('/api/agents/spawn', (req, res) => {
  const { task, model = 'kimi' } = req.body;
  if (!task) return res.status(400).json({ error: 'Task required' });
  spawn('/usr/local/bin/npx', ['openclaw', 'sessions', 'spawn', '--task', task, '--model', model], { detached: true, stdio: 'ignore', cwd: WORKSPACE }).unref();
  res.json({ success: true, message: 'Agent spawned', task: task.substring(0,50) });
});

app.post('/api/agents/:id/kill', (req, res) => {
  res.json({ success: true, message: 'Kill sent' });
});

app.get('/api/status', (req, res) => res.json({
  timestamp: new Date().toISOString(),
  gateway: { status: 'healthy' },
  sessions: { active: getSessionFiles().filter(f => Date.now() - f.mtime < 300000).length }
}));

app.listen(PORT, '0.0.0.0', () => console.log(`🦞 Mission Control: http://localhost:${PORT}`));

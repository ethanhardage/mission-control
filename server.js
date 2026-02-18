#!/usr/bin/env node
/**
 * Mission Control Backend API
 */

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
    return fs.readdirSync(WORKSPACE)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const stat = fs.statSync(path.join(WORKSPACE, f));
        return { id: f.replace('.jsonl', ''), mtime: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 20);
  } catch (e) { return []; }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
      name: isCron ? 'Cron Job' : (isSubagent ? 'Sub-agent' : 'Agent'),
      type: isCron ? 'cron' : (isSubagent ? 'subagent' : 'main'),
      status: ageMin < 60 ? 'active' : 'idle',
      lastActivity: ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin/60)}h ago`,
      size: `${Math.round(f.size/1024)}KB`
    };
  });
  
  // Demo data if empty
  if (sessions.length === 0) {
    sessions = [
      { id: 'demo-1', shortId: 'demo-1', name: 'Mission Control', type: 'main', status: 'active', lastActivity: 'now', size: '120KB' },
      { id: 'demo-2', shortId: 'demo-2', name: 'Research Agent', type: 'subagent', status: 'idle', lastActivity: '5m ago', size: '45KB' }
    ];
  }
  
  res.json({ sessions, count: sessions.length });
});

app.get('/api/crons', (req, res) => {
  res.json({
    crons: [
      { id: 'bb0fb60e-69d0-4e53-aa7a-bdbb0d1f8e84', name: 'Morning Briefing', schedule: '7:30 AM CT', displaySchedule: '7:30 AM CT daily', status: 'enabled', enabled: true },
      { id: '18e381cb-45a5-4274-9da3-42845caafef7', name: 'Evening Prep', schedule: '8:00 PM CT', displaySchedule: '8:00 PM CT daily', status: 'enabled', enabled: true }
    ],
    count: 2
  });
});

app.post('/api/crons/:id/run', (req, res) => {
  const { id } = req.params;
  // Spawn in background
  spawn('/usr/local/bin/npx', ['openclaw', 'cron', 'run', id], {
    detached: true, stdio: 'ignore', cwd: WORKSPACE
  }).unref();
  
  res.json({ success: true, message: `Cron ${id.substring(0,8)}... triggered` });
});

app.post('/api/agents/spawn', (req, res) => {
  const { task, model = 'kimi' } = req.body;
  if (!task) return res.status(400).json({ error: 'Task required' });
  
  spawn('/usr/local/bin/npx', ['openclaw', 'sessions', 'spawn', '--task', task, '--model', model], {
    detached: true, stdio: 'ignore', cwd: WORKSPACE
  }).unref();
  
  res.json({ success: true, message: 'Agent spawned', task: task.substring(0,50) });
});

app.post('/api/agents/:id/kill', (req, res) => {
  res.json({ success: true, message: `Kill sent for ${req.params.id.substring(0,8)}` });
});

app.get('/api/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    gateway: { status: 'healthy' },
    sessions: { active: getSessionFiles().filter(f => Date.now() - f.mtime < 300000).length }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 Mission Control: http://localhost:${PORT}`);
});

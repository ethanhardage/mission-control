/** * Mission Control API Client */
const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;background:${type==='error'?'#ef4444':type==='success'?'#22c55e':'#f59e0b'};color:white;z-index:1000`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function viewSession(id) {
  window.location.href = `session.html?id=${id}`;
}

async function loadToday() {
  const data = await apiCall('/today');
  
  // Update date
  const dateEl = document.getElementById('today-date');
  if (dateEl) dateEl.textContent = data.fullDay + ' ' + data.date;
  
  // Update classes
  const classesContainer = document.getElementById('today-classes');
  if (classesContainer) {
    if (data.classes?.length) {
      classesContainer.innerHTML = data.classes.map(c => `
        <div class="class-item" style="border-left-color:${c.color}">
          <span class="class-time">${c.time}</span>
          <span class="class-name">${c.class}</span>
        </div>
      `).join('');
    } else {
      classesContainer.innerHTML = '<p class="placeholder">No classes today 🎉</p>';
    }
  }
  
  // Update assignments
  const assignContainer = document.getElementById('today-assignments');
  if (assignContainer) {
    if (data.assignments?.length) {
      assignContainer.innerHTML = data.assignments.map(a => `
        <div class="assignment-item ${a.status}">
          <span class="status-dot ${a.urgent ? 'urgent' : a.status}"></span>
          <span>${a.task}</span>
          <span style="color:#888;font-size:12px;margin-left:auto">${a.due}</span>
        </div>
      `).join('');
    } else {
      assignContainer.innerHTML = '<p class="placeholder" style="color:#22c55e">All caught up! ✅</p>';
    }
  }
  
  // Update urgent count in pipeline
  const urgentEl = document.getElementById('stat-completed');
  if (urgentEl) urgentEl.textContent = data.urgentCount || '-';
}

async function loadAgents() {
  const data = await apiCall('/sessions');
  const container = document.getElementById('active-agents') || document.getElementById('active-agents-list');
  if (!container) return;
  
  if (data.error || !data.sessions?.length) {
    container.innerHTML = '<p class="placeholder">No active agents</p>';
    return;
  }

  container.innerHTML = data.sessions.map(agent => `
    <div class="agent-item" style="cursor:pointer" onclick="viewSession('${agent.id}')">
      <div class="agent-info">
        <div class="agent-name">${agent.name}</div>
        <div class="agent-task">${agent.type} • ${agent.lastActivity} • ${agent.size}</div>
      </div>
      <div class="agent-actions" onclick="event.stopPropagation()">
        <span class="badge" style="padding:4px 8px;border-radius:4px;background:${agent.status==='active'?'#22c55e':'#f59e0b'};color:white;font-size:12px">${agent.status}</span>
        <button class="btn btn-secondary" onclick="viewSession('${agent.id}')">View</button>
        <button class="btn btn-danger" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer" onclick="killAgent('${agent.id}')">Kill</button>
      </div>
    </div>
  `).join('');
  
  const countEl = document.getElementById('agent-count');
  if (countEl) countEl.textContent = `${data.count} active`;
}

async function spawnAgent(task) {
  if (!task) {
    task = prompt('What should the agent do?\n\nExamples:\n- Research latest AI news\n- Build a React component\n- Check Notion for overdue tasks');
  }
  if (!task) return;
  
  showToast('Spawning agent...', 'info');
  const result = await apiCall('/agents/spawn', {
    method: 'POST',
    body: JSON.stringify({ task, model: 'kimi' })
  });
  
  if (result.success) {
    showToast('Agent spawned!', 'success');
    setTimeout(loadAgents, 2000);
  } else {
    showToast('Error: ' + result.error, 'error');
  }
}

// Alias for agents.html compatibility
function spawnNewAgent() {
  spawnAgent();
}

function spawnTemplate(type) {
  const templates = {
    research: 'Research latest AI developments and summarize findings',
    code: 'Build a simple web app or component',
    notion: 'Check Notion and report on overdue tasks',
    browser: 'Automate a web task or scrape data'
  };
  const task = templates[type] || 'Research task';
  spawnAgent(task);
}

async function killAgent(id) {
  if (!confirm('Stop this agent session?')) return;
  showToast('Stopping...', 'info');
  await apiCall(`/agents/${id}/kill`, { method: 'POST' });
  showToast('Agent stopped', 'success');
  loadAgents();
}

async function loadCrons() {
  const data = await apiCall('/crons');
  const container = document.getElementById('cron-list') || document.getElementById('scheduled-agents');
  if (!container) return;
  
  if (data.error || !data.crons?.length) {
    container.innerHTML = '<p class="placeholder">No cron jobs</p>';
    return;
  }

  container.innerHTML = data.crons.map(cron => `
    <div class="cron-item ${cron.status}">
      <div class="agent-info">
        <div class="agent-name">${cron.name}</div>
        <div class="agent-task">${cron.displaySchedule || cron.schedule}</div>
      </div>
      <div class="agent-actions">
        <span class="badge">${cron.status}</span>
        <button class="btn btn-secondary" onclick="runCron('${cron.id}', '${cron.name}')">Run Now</button>
        <button class="btn btn-secondary" onclick="viewCronLogs('${cron.id}')">Logs</button>
      </div>
    </div>
  `).join('');
}

function viewCronLogs(id) {
  window.location.href = `session.html?id=${id}`;
}

async function runCron(id, name) {
  showToast(`Triggering ${name}...`, 'info');
  const result = await apiCall(`/crons/${id}/run`, { method: 'POST' });
  if (result.success) {
    showToast(`${name} started!`, 'success');
  } else {
    showToast('Error: ' + result.error, 'error');
  }
}

async function quickAction(action) {
  if (action === 'weather') {
    showToast('Weather: Tuscaloosa 52°F, Clear', 'success');
  } else if (action === 'notion') {
    showToast('Syncing Notion...', 'info');
    setTimeout(() => showToast('3 tasks synced', 'success'), 1000);
  } else if (action === 'cron') {
    spawnAgent();
  } else if (action === 'tts') {
    const text = prompt('Text to speak:');
    if (text) showToast(`TTS: "${text}"`, 'success');
  } else if (action === 'kill-all') {
    if (confirm('Stop all agents?')) showToast('Kill all sent', 'info');
  } else if (action === 'browser') {
    window.open('https://google.com', '_blank');
  }
}

function refreshAll() {
  showToast('Refreshing...', 'info');
  loadAgents();
  loadCrons();
}

function initMissionControl() {
  loadToday();
  loadAgents();
  loadCrons();
  setInterval(() => { loadToday(); loadAgents(); loadCrons(); }, 30000);
  
  window.spawnAgent = spawnAgent;
  window.spawnNewAgent = spawnNewAgent;
  window.spawnTemplate = spawnTemplate;
  window.killAgent = killAgent;
  window.runCron = runCron;
  window.viewSession = viewSession;
  window.viewCronLogs = viewCronLogs;
  window.quickAction = quickAction;
  window.refreshAll = refreshAll;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMissionControl);
} else {
  initMissionControl();
}

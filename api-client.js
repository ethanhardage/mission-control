/**
 * Mission Control API Client
 */

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
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#f59e0b'};
    color: white;
    z-index: 1000;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadAgents() {
  const data = await apiCall('/sessions');
  const container = document.getElementById('active-agents-list');
  if (!container) return;
  
  if (data.error || !data.sessions?.length) {
    container.innerHTML = '<p class="placeholder">No active agents</p>';
    return;
  }

  container.innerHTML = data.sessions.map(agent => `
    <div class="agent-item">
      <div class="agent-info">
        <div class="agent-name">${agent.name}</div>
        <div class="agent-task">${agent.type} • ${agent.lastActivity}</div>
      </div>
      <div class="agent-actions">
        <span class="badge">${agent.status}</span>
        <button class="btn btn-secondary" onclick="killAgent('${agent.id}')">Kill</button>
      </div>
    </div>
  `).join('');
}

async function spawnAgent() {
  const task = prompt('What should the agent do?');
  if (!task) return;
  
  showToast('Spawning agent...', 'info');
  const result = await apiCall('/agents/spawn', {
    method: 'POST',
    body: JSON.stringify({ task, model: 'kimi' })
  });
  
  if (result.success) {
    showToast('Agent spawned!', 'success');
    setTimeout(loadAgents, 2000);
    addEvent('Agent spawned');
  }
}

async function killAgent(id) {
  if (!confirm('Kill this agent?')) return;
  await apiCall(`/agents/${id}/kill`, { method: 'POST' });
  showToast('Agent stopped', 'success');
  loadAgents();
}

async function loadCrons() {
  const data = await apiCall('/crons');
  const container = document.getElementById('cron-list');
  if (!container) return;
  
  if (data.error || !data.crons?.length) {
    container.innerHTML = '<p class="placeholder">No cron jobs</p>';
    return;
  }

  container.innerHTML = data.crons.map(cron => `
    <div class="cron-item">
      <span><strong>${cron.name}</strong><br><small>${cron.displaySchedule || cron.schedule}</small></span>
      <span>
        <span class="badge">${cron.status}</span>
        <button class="btn btn-sm" onclick="runCron('${cron.id}', '${cron.name}')">Run</button>
      </span>
    </div>
  `).join('');
}

async function runCron(id, name) {
  showToast(`Running ${name}...`, 'info');
  const result = await apiCall(`/crons/${id}/run`, { method: 'POST' });
  if (result.success) {
    showToast(`${name} triggered!`, 'success');
    addEvent('Cron: ' + name);
  }
}

async function quickAction(action) {
  if (action === 'spawn') spawnAgent();
  else if (action === 'refresh') { loadAgents(); loadCrons(); showToast('Refreshed', 'success'); }
  else showToast(`Action: ${action}`, 'info');
}

function addEvent(message) {
  const list = document.getElementById('events-list');
  if (!list) return;
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const item = document.createElement('div');
  item.className = 'event-item';
  item.innerHTML = `<span class="event-time">${time}</span><span>${message}</span>`;
  list.insertBefore(item, list.firstChild);
  if (list.children.length > 10) list.removeChild(list.lastChild);
}

function initMissionControl() {
  loadAgents();
  loadCrons();
  setInterval(() => { loadAgents(); loadCrons(); }, 30000);
  
  window.spawnAgent = spawnAgent;
  window.killAgent = killAgent;
  window.runCron = runCron;
  window.quickAction = quickAction;
  window.refreshAll = () => { loadAgents(); loadCrons(); };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMissionControl);
} else {
  initMissionControl();
}

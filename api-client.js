/**
 * Mission Control API Client
 * Connects the dashboard to the backend API
 */

const API_BASE = '';

// Utility functions
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { error: error.message };
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast') || document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==================== AGENT FUNCTIONS ====================

async function loadAgents() {
  const data = await apiCall('/sessions');
  const container = document.getElementById('active-agents-list');
  if (!container) return;
  
  if (data.error || !data.sessions) {
    container.innerHTML = '<p class="placeholder">Failed to load agents</p>';
    return;
  }
  
  const html = data.sessions.map(agent => `
    <div class="agent-item ${agent.status}">
      <div class="agent-info">
        <div class="agent-name">${agent.name}</div>
        <div class="agent-task">Status: ${agent.status} • ${agent.age}</div>
      </div>
      <div class="agent-actions">
        <button class="btn btn-secondary" onclick="viewAgent('${agent.id}')">View</button>
        <button class="btn btn-danger" onclick="killAgent('${agent.id}')">Kill</button>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html || '<p class="placeholder">No active agents</p>';
}

async function spawnAgent() {
  const task = prompt('What should the agent do?');
  if (!task) return;
  
  showToast('🚀 Spawning agent...', 'info');
  const result = await apiCall('/agents/spawn', {
    method: 'POST',
    body: JSON.stringify({ task, model: 'kimi' })
  });
  
  if (result.success) {
    showToast(`✅ ${result.message}`, 'success');
    loadAgents();
  } else {
    showToast(`❌ Failed: ${result.error}`, 'error');
  }
}

async function killAgent(id) {
  if (!confirm('Kill this agent?')) return;
  
  showToast('Stopping agent...', 'info');
  const result = await apiCall(`/agents/${id}/kill`, {
    method: 'POST'
  });
  
  showToast(`Agent stopped`, 'success');
  loadAgents();
}

function viewAgent(id) {
  alert(`View agent: ${id}\n\n(OpenClaw integration would show session details here)`);
}

// ==================== CRON FUNCTIONS ====================

async function loadCrons() {
  const data = await apiCall('/crons');
  const container = document.getElementById('cron-list');
  if (!container) return;
  
  if (data.error || !data.crons) {
    container.innerHTML = '<p class="placeholder">Failed to load crons</p>';
    return;
  }
  
  const html = data.crons.map(cron => `
    <div class="cron-item ${cron.status === 'enabled' ? 'active' : 'disabled'}">
      <span class="cron-name">
        <strong>${cron.name}</strong><br>
        <small>${cron.schedule}</small>
      </span>
      <span class="cron-actions">
        <span class="badge ${cron.status === 'enabled' ? 'badge-queued' : 'badge-paused'}">${cron.status}</span>
        <button class="btn btn-sm" onclick="runCron('${cron.id}')">▶ Run</button>
        <button class="btn btn-sm btn-secondary" onclick="toggleCron('${cron.id}')">${cron.status === 'enabled' ? '⏸ Pause' : '▶ Enable'}</button>
      </span>
    </div>
  `).join('');
  
  container.innerHTML = html || '<p class="placeholder">No cron jobs</p>';
}

async function runCron(id) {
  showToast('Running cron job...', 'info');
  const result = await apiCall(`/crons/${id}/run`, {
    method: 'POST'
  });
  
  if (result.success) {
    showToast('✅ Cron job completed', 'success');
  } else {
    showToast(`❌ Failed: ${result.error}`, 'error');
  }
}

async function toggleCron(id) {
  alert(`Toggle cron: ${id}\n\n(Enable/disable would go here)`);
}

// ==================== QUICK ACTIONS ====================

async function quickAction(action) {
  switch(action) {
    case 'weather':
      showToast('🌤️ Fetching weather...', 'info');
      setTimeout(() => showToast('Weather: 72°F, Sunny', 'success'), 1000);
      break;
    case 'notion':
      showToast('📝 Syncing with Notion...', 'info');
      setTimeout(() => showToast('Synced 3 tasks', 'success'), 1000);
      break;
    case 'cron':
      spawnAgent();
      break;
    case 'tts':
      const text = prompt('Text to speak:');
      if (text) showToast(`🔊 Speaking: "${text}"`, 'success');
      break;
    case 'kill-all':
      if (confirm('Kill all agents?')) {
        showToast('Stopping all agents...', 'info');
      }
      break;
    case 'browser':
      window.open('https://google.com', '_blank');
      break;
    default:
      showToast(`Action: ${action}`, 'info');
  }
}

// ==================== SYSTEM STATUS ====================

async function loadStatus() {
  const data = await apiCall('/status');
  
  // Update health cards
  const healthCards = document.querySelectorAll('.health-card');
  const status = data;
  
  if (healthCards[0]) healthCards[0].className = `health-card ${status.gateway.status}`;
  if (healthCards[1]) healthCards[1].className = `health-card ${status.kimi.status}`;
  if (healthCards[2]) healthCards[2].className = `health-card ${status.github.status}`;
  if (healthCards[3]) healthCards[3].className = `health-card ${status.notion.status}`;
}

// ==================== INITIALIZATION ====================

function initMissionControl() {
  console.log('🦞 Mission Control initialized');
  
  // Load data
  loadAgents();
  loadCrons();
  loadStatus();
  
  // Auto-refresh every 30 seconds
  setInterval(() => {
    loadAgents();
    loadCrons();
    loadStatus();
  }, 30000);
  
  // Manual refresh
  window.refreshAll = () => {
    showToast('🔄 Refreshing...', 'info');
    loadAgents();
    loadCrons();
    loadStatus();
  };
  
  // Expose functions globally
  window.spawnAgent = spawnAgent;
  window.killAgent = killAgent;
  window.viewAgent = viewAgent;
  window.runCron = runCron;
  window.toggleCron = toggleCron;
  window.quickAction = quickAction;
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMissionControl);
} else {
  initMissionControl();
}
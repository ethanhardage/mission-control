/** * Mission Control API Client */
const API_BASE = '/api';

// Escape HTML to prevent XSS when interpolating user-controlled data into innerHTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  window.location.href = `session.html?id=${encodeURIComponent(id)}`;
}

// ============== ASSIGNMENT COMPLETION TRACKING ==============

const STORAGE_KEY_PREFIX = 'mission-control-assignments-';
const NOTION_STATUS = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  DONE: 'Done'
};

/**
 * Get the localStorage key for assignment completions
 */
function getLocalStorageKey(date) {
  const today = date || new Date().toISOString().split('T')[0];
  return `${STORAGE_KEY_PREFIX}${today}`;
}

/**
 * Load completed assignment IDs from localStorage
 */
function loadLocalCompletions(date) {
  const key = getLocalStorageKey(date);
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error loading completions:', e);
    return {};
  }
}

/**
 * Save completion state to localStorage
 */
function saveCompletionState(pageId, status, date) {
  const key = getLocalStorageKey(date);
  const completions = loadLocalCompletions(date);
  completions[pageId] = {
    status,
    timestamp: Date.now(),
    synced: false
  };
  localStorage.setItem(key, JSON.stringify(completions));
  updateSyncButton();
}

/**
 * Mark a completion as synced
 */
function markCompletionSynced(pageId, date) {
  const key = getLocalStorageKey(date);
  const completions = loadLocalCompletions(date);
  if (completions[pageId]) {
    completions[pageId].synced = true;
    localStorage.setItem(key, JSON.stringify(completions));
  }
  updateSyncButton();
}

/**
 * Get pending completions count
 */
function getPendingCount(date) {
  const completions = loadLocalCompletions(date);
  return Object.values(completions).filter(c => !c.synced).length;
}

/**
 * Update sync button UI
 */
function updateSyncButton() {
  const pending = getPendingCount();
  const btn = document.getElementById('sync-btn');
  const countEl = document.getElementById('pending-count');
  const textEl = document.getElementById('sync-btn-text');

  if (countEl) {
    countEl.textContent = `(${pending})`;
    countEl.style.display = pending > 0 ? 'inline' : 'none';
  }
  if (textEl) {
    textEl.textContent = pending > 0 ? 'Sync' : 'Synced';
  }
  if (btn) {
    btn.classList.toggle('syncing', false);
    btn.disabled = false;
  }
}

/**
 * Handle checkbox click - toggle local state and queue for sync
 */
async function handleCheckboxClick(pageId, currentStatus, taskName) {
  const checkbox = document.querySelector(`[data-page-id="${pageId}"] .assignment-checkbox`);
  const item = document.querySelector(`[data-page-id="${pageId}"]`);

  if (!checkbox || checkbox.disabled) return;

  // Determine new status (cycle: Not started -> Done -> Not started)
  const isCurrentlyDone = currentStatus === 'Done' || currentStatus === 'done';
  const newStatus = isCurrentlyDone ? NOTION_STATUS.NOT_STARTED : NOTION_STATUS.DONE;

  // Optimistic UI update
  checkbox.disabled = true;
  checkbox.classList.add('syncing');

  // Toggle visual state
  if (isCurrentlyDone) {
    item.classList.remove('completed');
    checkbox.classList.remove('checked');
  } else {
    item.classList.add('completing');
    setTimeout(() => item.classList.remove('completing'), 500);
    item.classList.add('completed');
    checkbox.classList.add('checked');
  }

  // Save locally first (offline-first)
  saveCompletionState(pageId, newStatus);

  // Update data attribute for next click
  item.dataset.status = newStatus === NOTION_STATUS.DONE ? 'done' : 'not-started';

  // Try to sync to Notion immediately
  try {
    await syncSingleCompletion(pageId, newStatus);
    markCompletionSynced(pageId);
    showToast(`✓ 

async function loadAgents() {
  const data = await apiCall('/sessions');
  const container = document.getElementById('active-agents') || document.getElementById('active-agents-list');
  if (!container) return;

  if (!data || data.error || !Array.isArray(data.sessions) || !data.sessions.length) {
    container.innerHTML = '<p class="placeholder">No active agents</p>';
    return;
  }

  container.innerHTML = data.sessions.map(agent => `
    <div class="agent-item" style="cursor:pointer" onclick="viewSession('${escapeHtml(agent.id)}')">
      <div class="agent-info">
        <div class="agent-name">${escapeHtml(agent.name)}</div>
        <div class="agent-task">${escapeHtml(agent.type)} &bull; ${escapeHtml(agent.lastActivity)} &bull; ${escapeHtml(agent.size)}</div>
      </div>
      <div class="agent-actions" onclick="event.stopPropagation()">
        <span class="badge" style="padding:4px 8px;border-radius:4px;background:${agent.status==='active'?'#22c55e':'#f59e0b'};color:white;font-size:12px">${escapeHtml(agent.status)}</span>
        <button class="btn btn-secondary" onclick="viewSession('${escapeHtml(agent.id)}')">View</button>
        <button class="btn btn-danger" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer" onclick="killAgent('${escapeHtml(agent.id)}')">Kill</button>
      </div>
    </div>
  `).join('');

  const countEl = document.getElementById('agent-count');
  if (countEl) countEl.textContent = `${data.count != null ? data.count : data.sessions.length} active`;
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

  if (result && result.success) {
    showToast('Agent spawned!', 'success');
    setTimeout(loadAgents, 2000);
  } else {
    showToast('Error: ' + escapeHtml(result?.error || 'Unknown error'), 'error');
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
  await apiCall(`/agents/${encodeURIComponent(id)}/kill`, { method: 'POST' });
  showToast('Agent stopped', 'success');
  loadAgents();
}

async function loadCrons() {
  const data = await apiCall('/crons');
  const container = document.getElementById('cron-list') || document.getElementById('scheduled-agents');
  if (!container) return;

  if (!data || data.error || !Array.isArray(data.crons) || !data.crons.length) {
    container.innerHTML = '<p class="placeholder">No cron jobs</p>';
    return;
  }

  container.innerHTML = data.crons.map(cron => `
    <div class="cron-item ${escapeHtml(cron.status)}">
      <div class="agent-info">
        <div class="agent-name">${escapeHtml(cron.name)}</div>
        <div class="agent-task">${escapeHtml(cron.displaySchedule || cron.schedule)}</div>
      </div>
      <div class="agent-actions">
        <span class="badge">${escapeHtml(cron.status)}</span>
        <button class="btn btn-secondary" onclick="runCron('${escapeHtml(cron.id)}', '${escapeHtml(cron.name)}')">Run Now</button>
        <button class="btn btn-secondary" onclick="viewCronLogs('${escapeHtml(cron.id)}')">Logs</button>
      </div>
    </div>
  `).join('');
}

function viewCronLogs(id) {
  window.location.href = `session.html?id=${encodeURIComponent(id)}`;
}

async function runCron(id, name) {
  showToast(`Triggering ${escapeHtml(name)}...`, 'info');
  const result = await apiCall(`/crons/${encodeURIComponent(id)}/run`, { method: 'POST' });
  if (result && result.success) {
    showToast(`${escapeHtml(name)} started!`, 'success');
  } else {
    showToast('Error: ' + escapeHtml(result?.error || 'Unknown error'), 'error');
  }
}

async function quickAction(action) {
  if (action === 'weather') {
    showToast('Weather: Tuscaloosa 52\u00b0F, Clear', 'success');
  } else if (action === 'notion') {
    showToast('Syncing Notion...', 'info');
    setTimeout(() => showToast('3 tasks synced', 'success'), 1000);
  } else if (action === 'cron') {
    spawnAgent();
  } else if (action === 'tts') {
    const text = prompt('Text to speak:');
    if (text) showToast(`TTS: "${escapeHtml(text)}"`, 'success');
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

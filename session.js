/**
 * Session Detail View
 * Shows logs, trace, cost for a specific session
 */

const API_BASE = '/api';

// Get session ID from URL
function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || 'unknown';
}

async function loadSessionDetail() {
  const sessionId = getSessionId();
  
  // Load session data from API
  const data = await fetch(`${API_BASE}/sessions/${sessionId}`).then(r => r.json()).catch(() => ({error:true}));
  
  if (data.error) {
    // Use demo data
    updateSessionHeader({
      name: 'Research Agent',
      status: 'active',
      tokens: '12.4k',
      duration: '2m 34s',
      model: 'kimi-k2.5'
    });
    
    renderTrace([
      { step: 1, name: 'Tool Call: web_search', status: 'success', time: '0:02' },
      { step: 2, name: 'Tool Call: web_fetch', status: 'success', time: '0:45' },
      { step: 3, name: 'Tool Call: sessions_spawn', status: 'success', time: '1:12' },
      { step: 4, name: 'Response Generation', status: 'running', time: '2:34' }
    ]);
    
    renderLogs([
      { time: '14:23:01', type: 'think', text: 'Planning research approach...' },
      { time: '14:23:03', type: 'tool', text: 'web_search("AI agent observability platforms")' },
      { time: '14:23:45', type: 'tool', text: 'web_fetch("https://agentops.ai")' },
      { time: '14:24:12', type: 'tool', text: 'sessions_spawn("Research subagent...")' },
      { time: '14:25:34', type: 'text', text: 'Research complete. Found 4 major platforms...' }
    ]);
    return;
  }
  
  updateSessionHeader(data);
  renderTrace(data.trace || []);
  renderLogs(data.logs || []);
}

function updateSessionHeader(data) {
  document.getElementById('session-title').textContent = data.name || 'Session';
  document.getElementById('session-status').textContent = data.status || 'unknown';
  document.getElementById('stat-tokens').textContent = data.tokens || '-';
  document.getElementById('stat-duration').textContent = data.duration || '-';
  document.getElementById('stat-model').textContent = data.model || '-';
}

function renderTrace(steps) {
  const container = document.getElementById('trace-tree');
  if (!steps.length) {
    container.innerHTML = '<p class="placeholder">No trace data</p>';
    return;
  }
  
  container.innerHTML = steps.map(step => `
    <div class="trace-node ${step.status}">
      <strong>${step.name}</strong>
      <span style="color:#888;float:right">${step.time}</span>
    </div>
  `).join('');
}

function renderLogs(logs) {
  const container = document.getElementById('log-viewer');
  if (!logs.length) {
    container.innerHTML = '<p class="placeholder">No logs</p>';
    return;
  }
  
  container.innerHTML = logs.map(log => `
    <div class="log-entry">
      <span class="log-time">${log.time}</span>
      <span class="${log.type === 'think' ? 'log-think' : log.type === 'tool' ? 'log-tool' : log.type === 'error' ? 'log-error' : ''}">
        ${escapeHtml(log.text)}
      </span>
    </div>
  `).join('');
  
  // Auto-scroll if enabled
  if (document.getElementById('auto-scroll')?.checked) {
    container.scrollTop = container.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function refreshSession() {
  loadSessionDetail();
  showToast('Refreshed', 'success');
}

function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;background:${type==='error'?'#ef4444':type==='success'?'#22c55e':'#f59e0b'};color:white;z-index:1000`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// Init
document.addEventListener('DOMContentLoaded', loadSessionDetail);

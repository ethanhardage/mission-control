/**
 * Croati Mission Control - Cron Jobs Page
 * Handles cron job management and run history
 */

const API_BASE = '';

function init() {
  loadCrons();
  fetchHistory();
  setInterval(fetchHistory, 10000);
}

async function fetchHistory() {
  try {
    const response = await fetch(`${API_BASE}/api/crons/history`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    renderHistory(data.history || []);
  } catch (error) {
    document.getElementById('history-container').innerHTML = `
      <div class="history-empty">
        <span class="history-empty-icon">⚠️</span>
        <p>Failed to load history</p>
      </div>`;
  }
}

function renderHistory(history) {
  const container = document.getElementById('history-container');
  if (!history?.length) {
    container.innerHTML = `
      <div class="history-empty">
        <span class="history-empty-icon">📭</span>
        <p>No runs yet. Execute a cron job to see history.</p>
      </div>`;
    return;
  }

  let html = `<table class="history-table">
    <thead><tr>
      <th>Job</th><th>Time</th><th>Duration</th><th>Status</th><th>Output</th>
    </tr></thead><tbody>`;

  history.forEach(r => {
    const time = new Date(r.timestamp).toLocaleString();
    const duration = r.durationMs < 1000 ? `${r.durationMs}ms` : `${(r.durationMs/1000).toFixed(1)}s`;
    const statusClass = r.status === 'success' ? 'status-success' : r.status === 'failed' ? 'status-failed' : 'status-running';
    const icon = r.status === 'success' ? '✓' : r.status === 'failed' ? '✗' : '⏳';
    html += `<tr>
      <td>${r.name}</td>
      <td>${time}</td>
      <td>${duration}</td>
      <td><span class="status-badge ${statusClass}">${icon} ${r.status}</span></td>
      <td class="job-output">${r.outputPreview?.slice(0,50) || '-'}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

async function loadCrons() {
  try {
    const res = await fetch('/api/crons');
    const data = await res.json();
    const list = document.getElementById('cron-list');
    if (!data.crons?.length) {
      list.innerHTML = '<p class="placeholder">No cron jobs configured</p>';
      return;
    }
    list.innerHTML = data.crons.map(c => `
      <div class="mission-item ${c.enabled ? 'active' : 'disabled'}">
        <span class="mission-name">
          <strong>${c.name}</strong><br>
          <small>${c.description || 'No description'}</small>
        </span>
        <span class="mission-progress">
          ${c.enabled ? '✅ Enabled' : '⏸️ Disabled'}<br>
          <small>Next: ${c.nextRun || 'Unknown'}</small><br>
          <button class="btn btn-sm" onclick="runCron('${c.id}', '${c.name}')">▶️ Run Now</button>
        </span>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load crons:', e);
  }
}

async function runCron(id, name) {
  if (!confirm(`Run ${name} now?`)) return;
  try {
    const res = await fetch(`/api/crons/${id}/run`, { method: 'POST' });
    const data = await res.json();
    alert(data.success ? `✅ ${name} started` : `❌ Failed: ${data.error}`);
    fetchHistory();
  } catch (e) {
    alert('❌ Error: ' + e.message);
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

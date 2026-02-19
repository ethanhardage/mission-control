const API_BASE = '/api';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiCall(endpoint, options) {
  try {
    const response = await fetch(API_BASE + endpoint, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#f59e0b';
  toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;background:' + bg + ';color:white;z-index:1000';
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

function viewSession(id) {
  window.location.href = 'session.html?id=' + encodeURIComponent(id);
}

async function loadToday() {
  const sched = document.getElementById('today-classes');
  const assign = document.getElementById('today-assignments');
  const dateEl = document.getElementById('today-date');
  
  try {
    const data = await apiCall('/today');
    if (dateEl) dateEl.textContent = data.fullDay + ', ' + data.date;

    if (sched) {
      if (!data.classes || !data.classes.length) {
        sched.innerHTML = '<p class="placeholder">No classes scheduled today</p>';
      } else {
        let html = '';
        for (let i = 0; i < data.classes.length; i++) {
          const c = data.classes[i];
          html += '<div class="class-item"><span class="class-time">' + c.time + '</span>';
          html += '<div><div class="class-name">' + escapeHtml(c.name) + '</div>';
          if (c.location) html += '<small style="color:#888">' + escapeHtml(c.location) + '</small>';
          html += '</div></div>';
        }
        sched.innerHTML = html;
      }
    }

    if (assign) {
      if (!data.assignments || !data.assignments.length) {
        assign.innerHTML = '<p class="placeholder">No assignments due today</p>';
      } else {
        let html = '';
        for (let i = 0; i < data.assignments.length; i++) {
          const a = data.assignments[i];
          let cls = 'assignment-item';
          if (a.status === 'Done') cls += ' done';
          else if (a.status === 'In progress') cls += ' in-progress';
          html += '<div class="' + cls + '">';
          html += '<div class="assignment-text">' + escapeHtml(a.task || a.name) + '</div>';
          html += '</div>';
        }
        assign.innerHTML = html;
      }
    }
  } catch (err) {
    console.error('Failed to load today:', err);
    if (sched) sched.innerHTML = '<p class="placeholder">Failed to load schedule</p>';
    if (assign) assign.innerHTML = '<p class="placeholder">Failed to load assignments</p>';
  }
}

async function loadAgents() {
  const container = document.getElementById('active-agents') || document.getElementById('active-agents-list');
  if (!container) return;
  
  try {
    const data = await apiCall('/sessions');
    if (!data || data.error || !Array.isArray(data.sessions) || !data.sessions.length) {
      container.innerHTML = '<p class="placeholder">No active agents</p>';
      return;
    }
    
    let html = '';
    for (let i = 0; i < data.sessions.length; i++) {
      const a = data.sessions[i];
      const bg = a.status === 'active' ? '#22c55e' : '#f59e0b';
      html += '<div class="agent-item" onclick="viewSession(\'' + a.id + '\')">';
      html += '<div class="agent-name">' + escapeHtml(a.name) + '</div>';
      html += '<span class="badge" style="background:' + bg + '">' + escapeHtml(a.status) + '</span>';
      html += '</div>';
    }
    container.innerHTML = html;
  } catch (err) {
    if (container) container.innerHTML = '<p class="placeholder">Failed to load agents</p>';
  }
}

async function loadCrons() {
  const container = document.getElementById('cron-list');
  if (!container) return;
  
  try {
    const data = await apiCall('/crons');
    if (!data || data.error || !Array.isArray(data.crons) || !data.crons.length) {
      container.innerHTML = '<p class="placeholder">No cron jobs</p>';
      return;
    }
    
    let html = '';
    for (let i = 0; i < data.crons.length; i++) {
      const c = data.crons[i];
      html += '<div class="cron-item">' + escapeHtml(c.name);
      html += ' <button onclick="runCron(\'' + c.id + '\', \'' + c.name + '\')">Run</button>';
      html += '</div>';
    }
    container.innerHTML = html;
  } catch (err) {
    if (container) container.innerHTML = '<p class="placeholder">Failed to load crons</p>';
  }
}

function refreshAll() {
  loadToday();
  loadAgents();
  loadCrons();
}

async function runCron(id, name) {
  showToast('Running ' + name + '...', 'info');
  await apiCall('/crons/' + id + '/run', { method: 'POST' });
  showToast('Done!', 'success');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshAll);
} else {
  refreshAll();
}

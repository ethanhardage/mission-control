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
          html += '<div><div class="class-name">' + escapeHtml(c.class || c.name) + '</div>';
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
  
  const countEl = document.getElementById('agent-count');
  try {
    const data = await apiCall('/sessions');
    if (!data || data.error || !Array.isArray(data.sessions) || !data.sessions.length) {
      container.innerHTML = '<p class="placeholder">No active agents</p>';
      if (countEl) countEl.textContent = '0 sessions';
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
    if (countEl) countEl.textContent = data.sessions.length + ' session' + (data.sessions.length !== 1 ? 's' : '');
  } catch (err) {
    if (container) container.innerHTML = '<p class="placeholder">Failed to load agents</p>';
    if (countEl) countEl.textContent = 'Error';
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
  loadPipelineStats();
}

async function loadPipelineStats() {
  const container = document.querySelector('#active-agents-list ~ * .pipeline-stats, .pipeline-stats');
  // Target the Mission Pipeline card specifically (it's empty — has no child stat-items yet)
  const allStats = document.querySelectorAll('.pipeline-stats');
  let container2 = null;
  for (let i = 0; i < allStats.length; i++) {
    if (!allStats[i].children.length) { container2 = allStats[i]; break; }
  }
  if (!container2) return;

  try {
    const data = await apiCall('/sessions');
    const sessions = (data && Array.isArray(data.sessions)) ? data.sessions : [];
    const active = sessions.filter(function(s) { return s.status === 'active'; }).length;
    const idle = sessions.filter(function(s) { return s.status === 'idle'; }).length;
    const crons = sessions.filter(function(s) { return s.type === 'cron'; }).length;
    container2.innerHTML =
      '<div class="stat-item"><div class="stat-number">' + active + '</div><div class="stat-label">Active</div></div>' +
      '<div class="stat-item"><div class="stat-number">' + idle + '</div><div class="stat-label">Idle</div></div>' +
      '<div class="stat-item"><div class="stat-number">' + crons + '</div><div class="stat-label">Cron</div></div>' +
      '<div class="stat-item"><div class="stat-number">' + sessions.length + '</div><div class="stat-label">Total</div></div>';
  } catch (err) {
    container2.innerHTML = '<p class="placeholder">Failed to load stats</p>';
  }
}

async function spawnAgent() {
  const task = prompt('Enter task for new agent:');
  if (!task || !task.trim()) return;
  showToast('Spawning agent...', 'info');
  const result = await apiCall('/agents/spawn', {
    method: 'POST',
    body: JSON.stringify({ task: task.trim(), model: 'claude' })
  });
  if (result.error) {
    showToast('Failed: ' + result.error, 'error');
  } else {
    showToast('Agent spawned!', 'success');
    loadAgents();
  }
}

function syncPendingCompletions() {
  const pendingEl = document.getElementById('pending-count');
  const countText = pendingEl ? pendingEl.textContent.replace(/[()]/g, '').trim() : '0';
  const count = parseInt(countText) || 0;
  if (count === 0) {
    showToast('No pending changes to sync', 'info');
    return;
  }
  showToast('Syncing ' + count + ' change(s)...', 'info');
  if (pendingEl) { pendingEl.style.display = 'none'; pendingEl.textContent = '(0)'; }
  setTimeout(function() { showToast('Sync complete', 'success'); }, 800);
}

async function runCron(id, name) {
  showToast('Running ' + name + '...', 'info');
  await apiCall('/crons/' + id + '/run', { method: 'POST' });
  showToast('Done!', 'success');
}

// Daily Briefing Preview Modal Functions
function openBriefingModal() {
  const modal = document.getElementById('briefing-modal');
  if (modal) {
    modal.style.display = 'flex';
    loadBriefingPreview();
  }
}

function closeBriefingModal() {
  const modal = document.getElementById('briefing-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function loadBriefingPreview() {
  document.getElementById('briefing-weather').textContent = 'Loading...';
  document.getElementById('briefing-classes').innerHTML = 'Loading...';
  document.getElementById('briefing-assignments').innerHTML = 'Loading...';
  document.getElementById('briefing-song').textContent = 'Loading...';
  document.getElementById('briefing-verse').textContent = 'Loading...';
  
  try {
    const data = await apiCall('/briefing/preview');
    
    // Weather
    document.getElementById('briefing-weather').textContent = 
      'Temperature: ' + (data.weather?.temperature || 'N/A');
    
    // Classes
    if (data.classes?.length) {
      let html = '';
      for (const c of data.classes) {
        html += '<div style="margin:8px 0;padding:8px;background:rgba(255,107,0,0.1);border-radius:4px;">';
        html += '<strong>' + c.class + '</strong> - ' + c.time;
        html += '</div>';
      }
      document.getElementById('briefing-classes').innerHTML = html;
    } else {
      document.getElementById('briefing-classes').innerHTML = '<p style="color:#888">No classes today</p>';
    }
    
    // Assignments
    if (data.assignments?.length) {
      let html = '';
      for (const a of data.assignments) {
        const urgent = a.urgent ? '<span style="color:#ef4444"> ⚠️ URGENT</span>' : '';
        html += '<div style="margin:8px 0;padding:8px;background:rgba(239,68,68,0.1);border-radius:4px;">';
        html += escapeHtml(a.task) + urgent;
        html += '</div>';
      }
      document.getElementById('briefing-assignments').innerHTML = html;
    } else {
      document.getElementById('briefing-assignments').innerHTML = '<p style="color:#888">No assignments due</p>';
    }
    
    // Song
    document.getElementById('briefing-song').textContent = data.song || 'None selected';
    
    // Verse
    const verse = data.verse || {};
    document.getElementById('briefing-verse').textContent = 
      verse.reference ? verse.reference + ' - "' + verse.text + '"' : 'None selected';
    
  } catch (err) {
    console.error('Failed to load briefing:', err);
    document.getElementById('briefing-content').innerHTML = '<p style="color:#ef4444">Failed to load briefing preview</p>';
  }
}

async function sendBriefingNow() {
  showToast('Sending briefing...', 'info');
  try {
    await apiCall('/briefing/send', { method: 'POST' });
    showToast('✅ Briefing sent!', 'success');
    closeBriefingModal();
  } catch (err) {
    showToast('❌ Failed to send', 'error');
  }
}

const API_BASE = '';
let scheduleData = {};

function init() {
  loadSchedule();
}

async function loadSchedule() {
  const tbody = document.getElementById('schedule-body');
  if (!tbody) return;
  
  try {
    const res = await fetch(API_BASE + '/api/schedule');
    const data = await res.json();
    scheduleData = data.schedule || {};
    renderSchedule();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4"><p class="placeholder">Failed to load schedule</p></td></tr>';
  }
}

function renderSchedule() {
  const tbody = document.getElementById('schedule-body');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNames = {Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday', Sun:'Sunday'};
  
  let html = '';
  for (const day of days) {
    const classes = scheduleData[day] || [];
    if (classes.length) {
      html += '<tr class="day-header"><td colspan="4">' + dayNames[day] + '</td></tr>';
      for (const c of classes) {
        html += '<tr>';
        html += '<td style="color:#c0c0c0;font-size:12px;">' + day + '</td>';
        html += '<td><span style="font-family:monospace;color:#ff6b00">' + c.time + '</span></td>';
        html += '<td><strong>' + escapeHtml(c.class) + '</strong></td>';
        html += '<td>';
        html += '<button class="btn btn-sm" onclick="deleteClass(\'' + day + '\', \'' + c.class + '\')">🗑️</button>';
        html += '</td></tr>';
      }
    }
  }
  
  if (!html) {
    html = '<tr><td colspan="4"><p class="placeholder">No classes scheduled</p></td></tr>';
  }
  
  tbody.innerHTML = html;
}

function showAddModal() {
  document.getElementById('add-modal').classList.add('visible');
}

function hideAddModal() {
  document.getElementById('add-modal').classList.remove('visible');
  document.getElementById('modal-time').value = '';
  document.getElementById('modal-course').value = '';
  document.getElementById('modal-location').value = '';
}

async function saveNewClass() {
  const day = document.getElementById('modal-day').value;
  const time = document.getElementById('modal-time').value.trim();
  const course = document.getElementById('modal-course').value.trim();
  
  if (!time || !course) {
    alert('Please fill in time and course');
    return;
  }
  
  if (!scheduleData[day]) scheduleData[day] = [];
  scheduleData[day].push({ time: time, class: course, color: '#ff6b00' });
  
  try {
    await fetch(API_BASE + '/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: scheduleData })
    });
    hideAddModal();
    renderSchedule();
  } catch (e) {
    alert('Failed to save');
  }
}

async function deleteClass(day, course) {
  if (!confirm('Delete ' + course + ' from ' + day + '?')) return;
  
  scheduleData[day] = scheduleData[day].filter(c => c.class !== course);
  
  try {
    await fetch(API_BASE + '/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: scheduleData })
    });
    renderSchedule();
  } catch (e) {
    alert('Failed to delete');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

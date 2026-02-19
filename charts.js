// Charts.js for Mission Control Dashboard
let agentActivityChart, cronSuccessChart, tasksStatusChart, memoryUsageChart;

const COLORS = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#f59e0b',
  purple: '#a78bfa',
  orange: '#ff6b00'
};

async function fetchMetrics() {
  try {
    const response = await fetch('/api/metrics');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return null;
  }
}

function initAgentActivityChart(data, ctx) {
  agentActivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Agents',
        data: data.data,
        borderColor: COLORS.blue,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#888' }, grid: { color: '#333' } },
        y: { ticks: { color: '#888' }, grid: { color: '#333' } }
      }
    }
  });
}

function initCronSuccessChart(data, ctx) {
  cronSuccessChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Success', 'Failed'],
      datasets: [{
        data: data,
        backgroundColor: [COLORS.green, COLORS.red]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#fff' } } }
    }
  });
}

function initTasksStatusChart(data, ctx) {
  tasksStatusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Done', 'In Progress', 'Not Started'],
      datasets: [{
        label: 'Tasks',
        data: data,
        backgroundColor: [COLORS.green, COLORS.blue, COLORS.red]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888' }, grid: { display: false } },
        y: { ticks: { color: '#888' }, grid: { color: '#333' } }
      }
    }
  });
}

function initMemoryUsageChart(data, ctx) {
  memoryUsageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Memory (MB)',
        data: data.data,
        borderColor: COLORS.purple,
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#888' }, grid: { color: '#333' } },
        y: { ticks: { color: '#888' }, grid: { show: false } }
      }
    }
  });
}

function updateSummaryMetrics(summary) {
  const el = document.getElementById('summary-metrics');
  if (el && summary) {
    el.innerHTML = 'Active: ' + summary.active + ' | Total: ' + summary.total;
  }
}

function updateTimestamps() {
  const el = document.getElementById('last-update');
  if (el) {
    el.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
  }
}

async function initCharts() {
  const metrics = await fetchMetrics();
  if (!metrics) return;

  const ctxAgent = document.getElementById('agent-activity-chart');
  const ctxCron = document.getElementById('cron-success-chart');
  const ctxTasks = document.getElementById('tasks-status-chart');
  const ctxMemory = document.getElementById('memory-usage-chart');

  if (ctxAgent) initAgentActivityChart(metrics.agentActivity, ctxAgent);
  if (ctxCron) initCronSuccessChart(metrics.cronSuccess, ctxCron);
  if (ctxTasks) initTasksStatusChart(metrics.tasksByStatus, ctxTasks);
  if (ctxMemory) initMemoryUsageChart(metrics.memoryUsage, ctxMemory);

  updateSummaryMetrics(metrics.summary);
  updateTimestamps();
}

async function updateCharts() {
  const metrics = await fetchMetrics();
  if (!metrics) return;

  if (agentActivityChart) {
    agentActivityChart.data.labels = metrics.agentActivity.labels;
    agentActivityChart.data.datasets[0].data = metrics.agentActivity.data;
    agentActivityChart.update();
  }
  if (tasksStatusChart) {
    tasksStatusChart.data.datasets[0].data = metrics.tasksByStatus;
    tasksStatusChart.update();
  }

  updateTimestamps();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  initCharts();
  setInterval(updateCharts, 30000);
});

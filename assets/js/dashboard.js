// ============================================================
// 📊 儀表板統計 + 選項設定載入
// ============================================================

import { state } from './state.js';
import { SafeStorage } from './storage.js';
import { STORAGE_KEYS } from './config.js';
import { apiCall } from './api.js';
import { renderAnnouncement } from './announcement.js';

export async function loadOptions() {
  try {
    state.optionsData = await apiCall('getOptions');
  } catch (e) {
    console.error('載入選項設定失敗', e);
  }
}

export async function loadDashboard() {
  // 統計卡片
  apiCall('getDashboardStats')
    .then(renderDashboard)
    .catch(() => {
      document.getElementById('dashboardStats').innerHTML = '<p class="text-muted">無法載入統計資料</p>';
    });

  // 公告
  apiCall('getAnnouncement')
    .then((data) => {
      if (typeof data === 'string') data = { content: data, docs: [] };
      state.announcementData = data;
      renderAnnouncement(data);
    })
    .catch(() => {});
}

export function renderDashboard(stats) {
  const cards = [
    { icon: 'smart_toy', color: 'var(--accent-primary)', label: 'Agent 數量', value: stats.totalAgents },
    { icon: 'rate_review', color: 'var(--accent-secondary)', label: '回饋總數', value: stats.totalFeedbacks },
    { icon: 'pending', color: '#f59e0b', label: '待處理', value: stats.statusCounts['待處理'] || 0 },
    { icon: 'autorenew', color: '#3b82f6', label: '處理中', value: stats.statusCounts['處理中'] || 0 },
    { icon: 'science', color: '#8b5cf6', label: '測試中', value: stats.statusCounts['測試中'] || 0 },
    { icon: 'pause_circle', color: '#6b7280', label: '暫緩', value: stats.statusCounts['暫緩'] || 0 },
    { icon: 'check_circle', color: '#10b981', label: '已解決', value: stats.statusCounts['已解決'] || 0 },
    { icon: 'update', color: '#06b6d4', label: '近 7 天活動', value: stats.recentCount }
  ];

  let html = '';
  cards.forEach((c) => {
    html += '<div class="dashboard-stat-card">';
    html += `<span class="material-icons-round stat-icon" style="color:${c.color}">${c.icon}</span>`;
    html += `<div class="stat-number">${c.value}</div>`;
    html += `<div class="stat-label">${c.label}</div>`;
    html += '</div>';
  });
  document.getElementById('dashboardStats').innerHTML = html;
}

export function showDashboard() {
  state.currentAgentId = '';
  document.querySelectorAll('.agent-item').forEach((item) => item.classList.remove('active'));
  document.getElementById('agentSection').style.display = 'none';
  document.getElementById('welcomeScreen').style.display = '';
  loadDashboard();
  SafeStorage.session.remove(STORAGE_KEYS.CURRENT_AGENT);
}

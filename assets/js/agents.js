// ============================================================
// 📂 Agent 清單與詳情
// ============================================================

import { state } from './state.js';
import { SafeStorage } from './storage.js';
import { STORAGE_KEYS } from './config.js';
import { apiCall } from './api.js';
import { escapeHtml, linkify, parseDocUrl } from './utils.js';
import { closeMobileSidebar } from './sidebar.js';
import { updateUIByRole } from './auth.js';

export async function loadAllAgents() {
  const listContainer = document.getElementById('agentListContainer');
  try {
    const result = await apiCall('getAllAgentsGrouped');
    let html = '';
    result.categories.forEach((cat) => {
      html += '<div class="sidebar-category">';
      html += '<div class="sidebar-category-header">';
      html += `<span class="material-icons-round">folder</span>${escapeHtml(cat)}`;
      html += '</div>';
      const agents = result.agents[cat] || [];
      agents.forEach((a) => {
        let badgeHtml = '';
        if (a.activeFeedbackCount > 0) {
          badgeHtml = `<span class="agent-feedback-badge">${a.activeFeedbackCount}</span>`;
        }
        html += `<div class="agent-item" data-id="${escapeHtml(a.agentId)}" onclick="selectAgent('${escapeHtml(a.agentId)}', this)">`;
        html += '<span class="material-icons-round">smart_toy</span>';
        html += `<span>${escapeHtml(a.name)}</span>`;
        html += badgeHtml;
        html += '</div>';
      });
      html += '</div>';
    });
    if (!html) html = '<div class="empty-state"><p>尚無 Agent 資料</p></div>';
    listContainer.innerHTML = html;
  } catch (e) {
    listContainer.innerHTML = '<div class="empty-state"><p>載入失敗</p></div>';
  }
}

export async function selectAgent(agentId, el) {
  state.currentAgentId = agentId;
  document.querySelectorAll('.agent-item').forEach((item) => item.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('welcomeScreen').style.display = 'none';
  document.getElementById('agentSection').style.display = 'block';
  document.getElementById('newFeedbackFormContainer').innerHTML = '';
  updateUIByRole();
  loadAgentInfo(agentId);

  const { loadFeedbacks } = await import('./feedback.js');
  loadFeedbacks(agentId);

  if (window.innerWidth <= 768) closeMobileSidebar();
  SafeStorage.session.set(STORAGE_KEYS.CURRENT_AGENT, agentId);
}

export async function loadAgentInfo(agentId) {
  const card = document.getElementById('agentInfoCard');
  card.innerHTML = '<div class="skeleton-card"><div class="skeleton skeleton-line h-24 w-40"></div><div class="skeleton skeleton-line w-60"></div><div class="skeleton skeleton-line w-80"></div></div>';

  try {
    const info = await apiCall('getAgentInfo', { agentId });
    if (!info) { card.innerHTML = '<p>找不到 Agent 資訊</p>'; return; }
    let html = '';
    html += `<div class="agent-category-badge">${escapeHtml(info.category)}</div>`;
    html += `<h1>${escapeHtml(info.name)}</h1>`;
    const safeDesc = escapeHtml(info.description || '暫無簡介').replace(/\n/g, '<br>');
    html += `<div class="agent-desc">${linkify(safeDesc)}</div>`;
    if (info.docUrls && info.docUrls.length > 0) {
      html += '<div class="agent-docs">';
      html += '<div class="doc-label">📎 相關文件</div>';
      info.docUrls.forEach((line) => {
        const parsed = parseDocUrl(line);
        html += `<a href="${escapeHtml(parsed.url)}" target="_blank">`;
        html += '<span class="material-icons-round">open_in_new</span>';
        if (parsed.label) html += `<span class="doc-link-label">${escapeHtml(parsed.label)}</span>`;
        html += `<span>${escapeHtml(parsed.url)}</span></a>`;
      });
      html += '</div>';
    }
    card.innerHTML = html;
  } catch (e) {
    card.innerHTML = '<p>載入失敗</p>';
  }
}

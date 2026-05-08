// ============================================================
// 🔍 全域搜尋
// ============================================================

import { state } from './state.js';
import { apiCall } from './api.js';
import { escapeHtml, showToast } from './utils.js';

export function initSearch() {
  const input = document.getElementById('globalSearchInput');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(/,/g, '');
      if (val && state.searchKeywords.indexOf(val) === -1) {
        state.searchKeywords.push(val);
        renderSearchTags();
        executeSearch();
      }
      input.value = '';
    }
    if (e.key === 'Backspace' && input.value === '' && state.searchKeywords.length > 0) {
      state.searchKeywords.pop();
      renderSearchTags();
      if (state.searchKeywords.length > 0) {
        executeSearch();
      } else {
        clearSearch();
      }
    }
  });
}

export function renderSearchTags() {
  const container = document.getElementById('searchTags');
  const clearBtn = document.getElementById('searchClearBtn');
  if (state.searchKeywords.length === 0) {
    container.innerHTML = '';
    clearBtn.style.display = 'none';
    return;
  }
  clearBtn.style.display = '';
  let html = '';
  state.searchKeywords.forEach((kw, idx) => {
    html += `<span class="search-tag">${escapeHtml(kw)}`;
    html += `<button class="remove" onclick="removeSearchTag(${idx})" title="移除"><span class="material-icons-round">close</span></button>`;
    html += '</span>';
  });
  container.innerHTML = html;
}

export async function removeSearchTag(index) {
  state.searchKeywords.splice(index, 1);
  renderSearchTags();
  if (state.searchKeywords.length > 0) {
    executeSearch();
  } else {
    clearSearch();
  }
}

export async function clearSearch() {
  state.searchKeywords = [];
  state.searchResults = null;
  renderSearchTags();
  document.getElementById('globalSearchInput').value = '';
  filterAgentsBySearch();
  if (state.currentAgentId) {
    const { loadFeedbacks } = await import('./feedback.js');
    loadFeedbacks(state.currentAgentId);
  }
}

export async function executeSearch() {
  showToast('搜尋中...', 'info');
  try {
    const result = await apiCall('searchFeedbacks', { keywords: state.searchKeywords });
    state.searchResults = result;
    filterAgentsBySearch();
    if (state.currentAgentId && state.searchResults.feedbackMap[state.currentAgentId]) {
      const { renderSearchedFeedbacks } = await import('./feedback.js');
      renderSearchedFeedbacks(state.currentAgentId);
    } else if (state.currentAgentId) {
      const listEl = document.getElementById('feedbackList');
      listEl.innerHTML = '<div class="empty-state"><span class="material-icons-round">search_off</span><p>此 Agent 中無符合搜尋條件的回饋</p></div>';
      document.getElementById('feedbackCount').textContent = '(0 則)';
    }
    let total = 0;
    for (const k in state.searchResults.feedbackMap) total += state.searchResults.feedbackMap[k].length;
    showToast('找到 ' + total + ' 筆符合的回饋', 'success');
  } catch (e) {
    showToast('搜尋失敗：' + e.message, 'error');
  }
}

export function filterAgentsBySearch() {
  const agentItems = document.querySelectorAll('.agent-item');
  const categories = document.querySelectorAll('.sidebar-category');

  if (!state.searchResults || state.searchKeywords.length === 0) {
    agentItems.forEach((item) => {
      item.style.display = 'flex';
      const badge = item.querySelector('.agent-match-count');
      if (badge) badge.remove();
    });
    categories.forEach((cat) => { cat.style.display = 'block'; });
    const container = document.getElementById('agentListContainer');
    const emptyState = container.querySelector('.empty-state.search-empty');
    if (emptyState) emptyState.remove();
    return;
  }

  const matchedIds = state.searchResults.agentIds;
  let hasVisible = false;

  agentItems.forEach((item) => {
    const agentId = item.getAttribute('data-id');
    const badge = item.querySelector('.agent-match-count');
    if (badge) badge.remove();

    if (matchedIds.indexOf(agentId) > -1) {
      item.style.display = 'flex';
      hasVisible = true;
      const count = state.searchResults.feedbackMap[agentId] ? state.searchResults.feedbackMap[agentId].length : 0;
      if (count > 0) {
        const countBadge = document.createElement('span');
        countBadge.className = 'agent-match-count';
        countBadge.textContent = count;
        item.appendChild(countBadge);
      }
    } else {
      item.style.display = 'none';
    }
  });

  categories.forEach((cat) => {
    let hasVisibleItem = false;
    cat.querySelectorAll('.agent-item').forEach((v) => {
      if (v.style.display !== 'none') hasVisibleItem = true;
    });
    cat.style.display = hasVisibleItem ? 'block' : 'none';
  });

  const container = document.getElementById('agentListContainer');
  const emptyState = container.querySelector('.empty-state.search-empty');
  if (!hasVisible) {
    if (!emptyState) {
      container.insertAdjacentHTML('beforeend',
        '<div class="empty-state search-empty"><span class="material-icons-round" style="margin-bottom:8px;display:block;opacity:0.5;">search_off</span><p>找不到符合的 Agent</p></div>');
    }
  } else if (emptyState) {
    emptyState.remove();
  }
}

// ============================================================
// 🔀 拖曳排序（同區內 / 跨區）— 技術部限定
// ============================================================

import { state } from './state.js';
import { ZONE_IDS, ZONE_STATUS_MAP, ZONE_LABEL_MAP, ZONE_PLACEHOLDER_LABEL } from './config.js';
import { apiCall } from './api.js';
import { escapeHtml, showToast } from './utils.js';

let dragSrcEl = null;
let dragSourceZone = null;

export function initDragSort() {
  document.querySelectorAll('.feedback-accordion .drag-handle').forEach((handle) => {
    const accordion = handle.closest('.feedback-accordion');
    handle.addEventListener('dragstart', (e) => {
      dragSrcEl = accordion;
      dragSourceZone = accordion.parentElement;
      accordion.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', accordion.dataset.feedbackId);
      setTimeout(showEmptyZonePlaceholders, 0);
    });
    handle.addEventListener('dragend', () => {
      dragSrcEl = null;
      dragSourceZone = null;
      removeAllInsertIndicators();
      hideEmptyZonePlaceholders();
      document.querySelectorAll('.feedback-accordion').forEach((el) => el.classList.remove('dragging'));
    });
  });

  ZONE_IDS.forEach((zoneId) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dragSrcEl) return;
      showInsertIndicator(zone, e.clientY);
    });

    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        removeInsertIndicator(zone);
      }
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      removeAllInsertIndicators();
      if (!dragSrcEl) return;

      const insertIdx = getInsertIndex(zone, e.clientY);
      const isCrossZone = (dragSourceZone !== zone);

      const ph = zone.querySelector('.drop-zone-placeholder');
      if (ph) ph.remove();
      zone.classList.remove('drop-zone-empty');
      const items = Array.from(zone.querySelectorAll('.feedback-accordion:not(.dragging)'));
      if (insertIdx >= items.length) {
        zone.appendChild(dragSrcEl);
      } else {
        zone.insertBefore(dragSrcEl, items[insertIdx]);
      }

      if (isCrossZone) {
        handleCrossZoneMove(dragSrcEl, dragSourceZone, zone, ZONE_STATUS_MAP[zoneId]);
      } else {
        updateOrderNumbers(zone);
      }
    });
  });
}

function showEmptyZonePlaceholders() {
  ZONE_IDS.forEach((zoneId) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    const visibleCards = zone.querySelectorAll('.feedback-accordion:not(.dragging)').length;
    if (visibleCards === 0) {
      zone.classList.add('drop-zone-empty');
      if (!zone.querySelector('.drop-zone-placeholder')) {
        const ph = document.createElement('div');
        ph.className = 'drop-zone-placeholder';
        ph.innerHTML = '<span class="material-icons-round">add_circle_outline</span>' + ZONE_PLACEHOLDER_LABEL[zoneId];
        zone.appendChild(ph);
      }
    }
  });
}

function hideEmptyZonePlaceholders() {
  document.querySelectorAll('.drop-zone-placeholder').forEach((el) => el.remove());
  document.querySelectorAll('.drop-zone-empty').forEach((el) => el.classList.remove('drop-zone-empty'));
}

function showInsertIndicator(zone, clientY) {
  removeInsertIndicator(zone);
  const items = Array.from(zone.querySelectorAll('.feedback-accordion:not(.dragging)'));

  if (items.length === 0) {
    zone.classList.add('drop-zone-highlight');
    return;
  }

  let insertBefore = null;
  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      insertBefore = items[i];
      break;
    }
  }

  const indicator = document.createElement('div');
  indicator.className = 'drag-insert-indicator';
  if (insertBefore) {
    zone.insertBefore(indicator, insertBefore);
  } else {
    zone.appendChild(indicator);
  }
}

function removeInsertIndicator(zone) {
  zone.querySelectorAll('.drag-insert-indicator').forEach((el) => el.remove());
  zone.classList.remove('drop-zone-highlight');
}

function removeAllInsertIndicators() {
  document.querySelectorAll('.drag-insert-indicator').forEach((el) => el.remove());
  document.querySelectorAll('.drop-zone-highlight').forEach((el) => el.classList.remove('drop-zone-highlight'));
}

function getInsertIndex(zone, clientY) {
  const items = Array.from(zone.querySelectorAll('.feedback-accordion:not(.dragging)'));
  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return items.length;
}

async function handleCrossZoneMove(card, sourceZone, targetZone, newStatus) {
  // 樂觀更新 UI
  const statusBadge = card.querySelector('.status-badge');
  if (statusBadge) {
    const { getStatusIcon } = await import('./feedback.js');
    statusBadge.className = 'status-badge status-' + newStatus;
    statusBadge.innerHTML = getStatusIcon(newStatus) + escapeHtml(newStatus);
  }
  card.dataset.status = newStatus;

  const zoneTypeMap = { activeFeedbacksZone: 'active', testingFeedbacksZone: 'testing', completedFeedbacksZone: 'completed' };
  card.dataset.zone = zoneTypeMap[targetZone.id] || 'active';

  updateZoneOrderDisplay(targetZone);
  updateZoneOrderDisplay(sourceZone);
  updateZoneCounts();

  const targetOrders = collectZoneOrders(targetZone);
  const sourceOrders = collectZoneOrders(sourceZone);

  try {
    const r = await apiCall('moveFeedbackToZone', {
      email: state.currentUser.email,
      feedbackId: card.dataset.feedbackId,
      targetStatus: newStatus,
      targetZoneOrders: targetOrders,
      sourceZoneOrders: sourceOrders
    });
    if (r.success) showToast('已移動至' + (ZONE_LABEL_MAP[newStatus] || newStatus), 'success');
    else showToast(r.message, 'error');
  } catch (e) {
    showToast('移動失敗：' + e.message, 'error');
    const { loadFeedbacks } = await import('./feedback.js');
    loadFeedbacks(state.currentAgentId);
  }
}

function collectZoneOrders(zone) {
  const items = Array.from(zone.querySelectorAll('.feedback-accordion'));
  return items.map((item, idx) => ({ feedbackId: item.dataset.feedbackId, orderNum: idx + 1 }));
}

function updateZoneOrderDisplay(zone) {
  const items = Array.from(zone.querySelectorAll('.feedback-accordion'));
  items.forEach((item, idx) => {
    const orderSpan = item.querySelector('.fb-order');
    if (orderSpan) orderSpan.textContent = '#' + (idx + 1);
  });
}

function updateZoneCounts() {
  const zones = [
    { id: 'activeFeedbacksZone', countId: null },
    { id: 'testingFeedbacksZone', countId: 'testingCount' },
    { id: 'completedFeedbacksZone', countId: 'completedCount' }
  ];
  zones.forEach((z) => {
    if (!z.countId) return;
    const zone = document.getElementById(z.id);
    const countEl = document.getElementById(z.countId);
    if (zone && countEl) {
      const count = zone.querySelectorAll('.feedback-accordion').length;
      countEl.textContent = '(' + count + ' 筆)';
    }
  });
  const total = document.querySelectorAll('.feedback-accordion').length;
  const feedbackCountEl = document.getElementById('feedbackCount');
  if (feedbackCountEl) feedbackCountEl.textContent = '(' + total + ' 則)';
}

async function updateOrderNumbers(zoneEl) {
  const zone = zoneEl || document.getElementById('activeFeedbacksZone');
  const allItems = zone ? Array.from(zone.querySelectorAll('.feedback-accordion')) : [];
  const orders = [];
  allItems.forEach((item, idx) => {
    const newOrder = idx + 1;
    const orderSpan = item.querySelector('.fb-order');
    if (orderSpan) orderSpan.textContent = '#' + newOrder;
    orders.push({ feedbackId: item.dataset.feedbackId, orderNum: newOrder });
  });
  try {
    const r = await apiCall('updateFeedbackOrder', { orders, email: state.currentUser.email });
    if (r.success) showToast('排序已更新', 'success');
    else showToast(r.message, 'error');
  } catch (e) {
    showToast('排序更新失敗：' + e.message, 'error');
  }
}

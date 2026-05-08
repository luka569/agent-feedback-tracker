// ============================================================
// 📝 回饋功能（清單載入、摺疊、新增、編輯、刪除）
// ============================================================

import { state } from './state.js';
import { SafeStorage } from './storage.js';
import { STORAGE_KEYS } from './config.js';
import { apiCall } from './api.js';
import { escapeHtml, escapeAttr, renderContent, formatRelativeTime, highlightKeywords, setButtonLoading, showToast } from './utils.js';
import { initDragSort } from './dragsort.js';
import { selectAgent } from './agents.js';
import { showUserSetup } from './auth.js';
import {
  nextEditorId, createEditorHtml, initEditorResize, getEditorContent,
  processContentImages
} from './editor.js';
import { URL_PARAMS } from './deeplink.js';

export async function loadFeedbacks(agentId) {
  const listEl = document.getElementById('feedbackList');

  if (state.searchResults && state.searchKeywords.length > 0) {
    renderSearchedFeedbacks(agentId);
    return;
  }

  let skeletonHtml = '';
  for (let s = 0; s < 3; s++) {
    skeletonHtml += '<div class="skeleton-feedback"><div class="skeleton skeleton-line w-40" style="margin:0"></div><div class="skeleton skeleton-line w-60" style="margin:0;flex:1"></div></div>';
  }
  listEl.innerHTML = skeletonHtml;

  try {
    const feedbacks = await apiCall('getFeedbacks', { agentId });
    document.getElementById('feedbackCount').textContent = '(' + feedbacks.length + ' 則)';
    if (feedbacks.length === 0) {
      listEl.innerHTML = '<div class="empty-state">' +
        '<span class="material-icons-round">speaker_notes_off</span>' +
        '<p>尚無回饋，成為第一個提出議題的人吧！</p></div>';
      return;
    }

    const activeFeedbacks = [];
    const testingFeedbacks = [];
    const completedFeedbacks = [];
    feedbacks.forEach((fb) => {
      if (fb.status === '已解決') completedFeedbacks.push(fb);
      else if (fb.status === '測試中') testingFeedbacks.push(fb);
      else activeFeedbacks.push(fb);
    });
    testingFeedbacks.sort((a, b) => (a.orderNum || 999) - (b.orderNum || 999));
    completedFeedbacks.sort((a, b) => (a.orderNum || 999) - (b.orderNum || 999));

    let html = '';
    html += '<div id="activeFeedbacksZone">';
    activeFeedbacks.forEach((fb) => { html += renderFeedbackAccordion(fb, 'active'); });
    html += '</div>';

    html += '<div class="feedback-section-header" id="testingSectionHeader" style="margin-top: 32px;">';
    html += `<h2><span class="material-icons-round">science</span>測試區 <span class="feedback-count" id="testingCount">(${testingFeedbacks.length} 筆)</span></h2>`;
    html += '</div>';
    html += '<div id="testingFeedbacksZone">';
    testingFeedbacks.forEach((fb) => { html += renderFeedbackAccordion(fb, 'testing'); });
    html += '</div>';

    html += '<div class="feedback-section-header" id="completedSectionHeader" style="margin-top: 32px;">';
    html += `<h2><span class="material-icons-round">task_alt</span>完成區 <span class="feedback-count" id="completedCount">(${completedFeedbacks.length} 筆)</span></h2>`;
    html += '</div>';
    html += '<div id="completedFeedbacksZone">';
    completedFeedbacks.forEach((fb) => { html += renderFeedbackAccordion(fb, 'completed'); });
    html += '</div>';

    listEl.innerHTML = html;
    listEl.querySelectorAll('.feedback-detail').forEach((detail) => processContentImages(detail));
    if (state.currentUserRole === 'tech') initDragSort();

    const targetId = state.pendingExpandFeedbackId;
    state.pendingExpandFeedbackId = null;
    if (targetId) {
      setTimeout(() => expandAndScrollTo(targetId), 100);
    } else {
      const savedExpanded = SafeStorage.session.get(STORAGE_KEYS.EXPANDED_IDS);
      if (savedExpanded) {
        try {
          const ids = JSON.parse(savedExpanded);
          ids.forEach((fid) => {
            const acc = document.getElementById('fb-' + fid);
            if (acc) {
              acc.classList.add('expanded');
              const detail = document.getElementById('fb-detail-' + fid);
              if (detail) processContentImages(detail);
            }
          });
          if (ids.length > 0) {
            setTimeout(() => {
              const first = document.getElementById('fb-' + ids[0]);
              if (first) {
                const mainContent = document.getElementById('mainContent');
                mainContent.scrollTo({ top: first.offsetTop - mainContent.offsetTop - 10, behavior: 'smooth' });
              }
            }, 100);
          }
        } catch (e) { /* 忽略 */ }
      }
    }
  } catch (e) {
    listEl.innerHTML = '<div class="empty-state"><p>載入回饋失敗</p></div>';
  }
}

export function renderSearchedFeedbacks(agentId) {
  const listEl = document.getElementById('feedbackList');
  const feedbacks = state.searchResults.feedbackMap[agentId] || [];
  document.getElementById('feedbackCount').textContent = '(' + feedbacks.length + ' 則符合)';

  if (feedbacks.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><span class="material-icons-round">search_off</span><p>無符合搜尋條件的回饋</p></div>';
    return;
  }

  const activeFeedbacks = [];
  const testingFeedbacks = [];
  const completedFeedbacks = [];
  feedbacks.forEach((fb) => {
    if (fb.status === '已解決') completedFeedbacks.push(fb);
    else if (fb.status === '測試中') testingFeedbacks.push(fb);
    else activeFeedbacks.push(fb);
  });
  testingFeedbacks.sort((a, b) => (a.orderNum || 999) - (b.orderNum || 999));
  completedFeedbacks.sort((a, b) => (a.orderNum || 999) - (b.orderNum || 999));

  let html = '';
  html += '<div id="activeFeedbacksZone">';
  activeFeedbacks.forEach((fb) => { html += renderFeedbackAccordion(fb, 'active'); });
  html += '</div>';

  html += '<div class="feedback-section-header" id="testingSectionHeader" style="margin-top: 32px;">';
  html += `<h2><span class="material-icons-round">science</span>測試區 <span class="feedback-count" id="testingCount">(${testingFeedbacks.length} 筆)</span></h2>`;
  html += '</div>';
  html += '<div id="testingFeedbacksZone">';
  testingFeedbacks.forEach((fb) => { html += renderFeedbackAccordion(fb, 'testing'); });
  html += '</div>';

  html += '<div class="feedback-section-header" id="completedSectionHeader" style="margin-top: 32px;">';
  html += `<h2><span class="material-icons-round">task_alt</span>完成區 <span class="feedback-count" id="completedCount">(${completedFeedbacks.length} 筆)</span></h2>`;
  html += '</div>';
  html += '<div id="completedFeedbacksZone">';
  completedFeedbacks.forEach((fb) => { html += renderFeedbackAccordion(fb, 'completed'); });
  html += '</div>';

  listEl.innerHTML = html;
  listEl.querySelectorAll('.feedback-detail').forEach((detail) => processContentImages(detail));
  if (state.currentUserRole === 'tech') initDragSort();
}

export function expandAndScrollTo(feedbackId) {
  const accordion = document.getElementById('fb-' + feedbackId);
  if (!accordion) return;
  if (!accordion.classList.contains('expanded')) {
    accordion.classList.add('expanded');
    const detail = document.getElementById('fb-detail-' + feedbackId);
    if (detail) processContentImages(detail);
  }
  const mainContent = document.getElementById('mainContent');
  const accTop = accordion.offsetTop - mainContent.offsetTop;
  mainContent.scrollTo({ top: accTop - 10, behavior: 'smooth' });
  saveExpandedState();
}

export function renderFeedbackAccordion(fb, zoneType) {
  const statusIcon = getStatusIcon(fb.status);
  const edited = (fb.createdAt !== fb.updatedAt) ? '<span class="edited-badge">(已更新)</span>' : '';
  const isConsultant = (state.currentUserRole === 'consultant');
  const isTech = (state.currentUserRole === 'tech');
  const isAuthor = (fb.authorEmail === state.currentUser.email);

  let html = `<div class="feedback-accordion" id="fb-${fb.feedbackId}" data-feedback-id="${fb.feedbackId}" data-zone="${zoneType}" data-status="${escapeAttr(fb.status || '')}">`;

  html += `<div class="feedback-summary" onclick="toggleFeedback('${fb.feedbackId}')">`;

  if (isTech) {
    html += '<div class="drag-handle" draggable="true" onclick="event.stopPropagation()" title="拖曳排序">';
    html += '<span class="material-icons-round">drag_indicator</span></div>';
  }

  html += `<span class="fb-order">#${escapeHtml(String(fb.orderNum || ''))}</span>`;

  if (fb.category) html += `<span class="category-tag">${escapeHtml(fb.category)}</span>`;
  if (fb.severity) html += `<span class="severity-tag">${escapeHtml(fb.severity)}</span>`;
  html += `<span class="fb-summary-title">${highlightKeywords(escapeHtml(fb.title))} ${edited}</span>`;
  html += '<div class="fb-summary-meta">';
  html += `<span><span class="material-icons-round">schedule</span>${formatRelativeTime(fb.updatedAt)}</span>`;
  html += `<span><span class="material-icons-round">person</span>${escapeHtml(fb.author)}</span>`;
  html += '</div>';
  html += `<span class="status-badge status-${escapeHtml(fb.status)}">${statusIcon}${escapeHtml(fb.status)}</span>`;

  html += `<button class="fb-copy-link" onclick="refreshSingleFeedback('${escapeAttr(fb.feedbackId)}', event)" title="重新整理此回饋">`;
  html += '<span class="material-icons-round">refresh</span></button>';
  html += `<button class="fb-copy-link" onclick="copyShareLink('${escapeAttr(fb.agentId)}', '${escapeAttr(fb.feedbackId)}', event)" title="複製分享連結">`;
  html += '<span class="material-icons-round">link</span></button>';
  html += '<span class="material-icons-round fb-expand-icon">expand_more</span>';
  html += '</div>';

  // ---- Detail ----
  html += `<div class="feedback-detail" id="fb-detail-${fb.feedbackId}">`;

  html += '<div class="detail-meta-grid">';
  html += `<div class="detail-meta-item"><span class="detail-meta-label">回饋人</span><span class="detail-meta-value">${escapeHtml(fb.author)}</span></div>`;
  html += `<div class="detail-meta-item"><span class="detail-meta-label">回覆人</span><span class="detail-meta-value">${escapeHtml(fb.replyAuthor || '尚未回覆')}</span></div>`;
  html += `<div class="detail-meta-item"><span class="detail-meta-label">建立時間</span><span class="detail-meta-value">${escapeHtml(fb.createdAt)}</span></div>`;
  html += `<div class="detail-meta-item"><span class="detail-meta-label">最後更新</span><span class="detail-meta-value">${escapeHtml(fb.updatedAt)}</span></div>`;
  html += '</div>';

  // 顧問回饋
  html += `<div class="content-block" id="fb-block-${fb.feedbackId}">`;
  html += `<div class="content-block-header" id="fb-header-${fb.feedbackId}">`;
  html += '<div class="content-block-header-left"><span class="material-icons-round">rate_review</span>顧問回饋內容</div>';
  const canEditFeedback = isConsultant || (isTech && isAuthor);
  if (canEditFeedback) {
    html += `<button class="btn btn-ghost btn-sm" id="fb-edit-btn-${fb.feedbackId}" onclick="event.stopPropagation(); showEditFeedbackForm('${fb.feedbackId}', '${escapeAttr(fb.authorEmail)}')">`;
    html += '<span class="material-icons-round">edit</span>編輯</button>';
  }
  html += '</div>';
  html += `<div class="content-block-body" id="fb-content-body-${fb.feedbackId}">${renderContent(fb.content)}</div>`;
  html += '</div>';

  // 技術部回覆
  html += `<div class="content-block" id="reply-block-${fb.feedbackId}">`;
  html += `<div class="content-block-header" id="reply-header-${fb.feedbackId}">`;
  html += '<div class="content-block-header-left"><span class="material-icons-round">engineering</span>技術部回覆</div>';
  if (isTech) {
    const replyBtnLabel = fb.replyContent ? '編輯' : '新增回覆';
    const replyBtnIcon = fb.replyContent ? 'edit' : 'reply';
    html += `<button class="btn btn-ghost btn-sm" id="reply-edit-btn-${fb.feedbackId}" onclick="event.stopPropagation(); showReplyForm('${fb.feedbackId}')">`;
    html += `<span class="material-icons-round">${replyBtnIcon}</span>${replyBtnLabel}</button>`;
  }
  html += '</div>';
  if (fb.replyContent) {
    html += `<div class="content-block-body" id="reply-content-body-${fb.feedbackId}">${renderContent(fb.replyContent)}</div>`;
  } else {
    html += `<div class="content-block-body content-block-empty" id="reply-content-body-${fb.feedbackId}"><span class="material-icons-round" style="font-size:24px;display:block;margin-bottom:6px;">chat_bubble_outline</span>尚無回覆</div>`;
  }
  html += '</div>';

  const canDelete = (isAuthor && isConsultant) || isTech;
  if (canDelete) {
    html += '<div class="detail-actions">';
    html += `<button class="btn btn-ghost btn-sm btn-danger" onclick="event.stopPropagation(); confirmDeleteFeedback('${fb.feedbackId}')">`;
    html += '<span class="material-icons-round">delete</span>刪除此回饋</button>';
    html += '</div>';
  }

  html += '</div>'; // feedback-detail
  html += '</div>'; // feedback-accordion
  return html;
}

export function toggleFeedback(feedbackId) {
  const accordion = document.getElementById('fb-' + feedbackId);
  if (!accordion) return;
  if (accordion.classList.contains('expanded')) {
    accordion.classList.remove('expanded');
  } else {
    accordion.classList.add('expanded');
    const detail = document.getElementById('fb-detail-' + feedbackId);
    if (detail) processContentImages(detail);
    setTimeout(() => {
      const mainContent = document.getElementById('mainContent');
      const accTop = accordion.offsetTop - mainContent.offsetTop;
      mainContent.scrollTo({ top: accTop - 10, behavior: 'smooth' });
    }, 50);
  }
  saveExpandedState();
}

export function saveExpandedState() {
  const expanded = [];
  document.querySelectorAll('.feedback-accordion.expanded').forEach((acc) => {
    if (acc.dataset.feedbackId) expanded.push(acc.dataset.feedbackId);
  });
  SafeStorage.session.set(STORAGE_KEYS.EXPANDED_IDS, JSON.stringify(expanded));
}

export function restoreSessionState() {
  if (URL_PARAMS && (URL_PARAMS.agent || URL_PARAMS.fb)) return;
  const savedAgent = SafeStorage.session.get(STORAGE_KEYS.CURRENT_AGENT);
  if (savedAgent) {
    const checkInterval = setInterval(() => {
      const agentEl = document.querySelector(`.agent-item[data-id="${savedAgent}"]`);
      if (agentEl) {
        clearInterval(checkInterval);
        selectAgent(savedAgent, agentEl);
      }
    }, 200);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}

export function refreshSingleFeedback(feedbackId, event) {
  event.stopPropagation();
  if (!state.currentAgentId) return;
  state.pendingExpandFeedbackId = feedbackId;
  loadFeedbacks(state.currentAgentId);
  showToast('重新整理中...', 'info');
}

export function getStatusIcon(status) {
  const icons = {
    '待處理': '<span class="material-icons-round">pending</span>',
    '處理中': '<span class="material-icons-round">autorenew</span>',
    '測試中': '<span class="material-icons-round">science</span>',
    '已解決': '<span class="material-icons-round">check_circle</span>',
    '暫緩': '<span class="material-icons-round">pause_circle</span>'
  };
  return icons[status] || '<span class="material-icons-round">help</span>';
}

// ============================================================
// ➕ 新增 / ✏️ 編輯 / 🗑️ 刪除
// ============================================================

export function toggleNewFeedbackForm() {
  if (state.currentUserRole !== 'consultant' && state.currentUserRole !== 'tech') {
    showToast('請先設定身份才能新增回饋', 'error'); return;
  }
  if (!state.currentUser.email) { showUserSetup(); return; }
  const container = document.getElementById('newFeedbackFormContainer');
  if (container.innerHTML) { container.innerHTML = ''; return; }

  const eid = nextEditorId();
  let html = '<div class="inline-form">';
  html += '<div class="form-title"><span class="material-icons-round">edit_note</span>新增回饋</div>';
  html += '<div class="co-edit-hint"><span class="material-icons-round">group</span>此欄位為多人共同編輯，請在訊息最後加註您的姓名。</div>';
  html += '<div class="form-group"><label>回饋標題</label>';
  html += '<input type="text" id="new-fb-title" placeholder="請輸入回饋標題..."></div>';

  html += '<div style="display:flex; gap:16px;">';
  html += '<div class="form-group" style="flex:1;"><label>回饋分類</label>';
  html += '<select id="new-fb-category"><option value="">請選擇分類</option>';
  state.optionsData.categories.forEach((cat) => {
    html += `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`;
  });
  html += '</select></div>';

  html += '<div class="form-group" style="flex:1;"><label>嚴重程度</label>';
  html += '<select id="new-fb-severity"><option value="">請選擇嚴重程度</option>';
  state.optionsData.severities.forEach((sev) => {
    html += `<option value="${escapeAttr(sev)}">${escapeHtml(sev)}</option>`;
  });
  html += '</select></div>';
  html += '</div>';

  html += '<div class="form-group"><label>回饋內容</label>';
  html += createEditorHtml(eid, '請輸入詳細內容...', '', 'NEW-' + new Date().getTime());
  html += '</div>';
  html += '<div class="inline-form-actions">';
  html += '<button class="btn btn-cancel" onclick="document.getElementById(\'newFeedbackFormContainer\').innerHTML=\'\'">取消</button>';
  html += `<button class="btn btn-primary" id="btn-submit-new" onclick="submitNewFeedback('${eid}')"><span class="material-icons-round">send</span>送出</button>`;
  html += '</div></div>';
  container.innerHTML = html;
  initEditorResize();
  document.getElementById('new-fb-title').focus();
}

export async function submitNewFeedback(eid) {
  const title = document.getElementById('new-fb-title').value.trim();
  const category = document.getElementById('new-fb-category').value;
  const severity = document.getElementById('new-fb-severity').value;
  const content = getEditorContent(eid);
  if (!title || !content) { showToast('請填寫標題和內容', 'error'); return; }
  if (!category) { showToast('請選擇回饋分類', 'error'); return; }
  if (!severity) { showToast('請選擇嚴重程度', 'error'); return; }

  setButtonLoading('btn-submit-new', true);
  try {
    const r = await apiCall('addFeedback', {
      agentId: state.currentAgentId, category, severity, title,
      content, author: state.currentUser.name, email: state.currentUser.email
    });
    setButtonLoading('btn-submit-new', false);
    if (r.success) {
      showToast('回饋已發表', 'success');
      document.getElementById('newFeedbackFormContainer').innerHTML = '';
      state.pendingExpandFeedbackId = r.feedbackId;
      loadFeedbacks(state.currentAgentId);
    }
  } catch (e) {
    setButtonLoading('btn-submit-new', false);
    showToast('發表失敗：' + e.message, 'error');
  }
}

export function showEditFeedbackForm(feedbackId, authorEmail) {
  const isConsultant = (state.currentUserRole === 'consultant');
  const isTech = (state.currentUserRole === 'tech');
  const isAuthor = (authorEmail === state.currentUser.email);
  const canEdit = isConsultant || (isTech && isAuthor);
  if (!canEdit) { showToast('您沒有權限編輯此回饋', 'error'); return; }

  const bodyEl = document.getElementById('fb-content-body-' + feedbackId);
  if (!bodyEl || bodyEl.dataset.editing === '1') return;

  const accordion = document.getElementById('fb-' + feedbackId);
  const titleEl = accordion ? accordion.querySelector('.fb-summary-title') : null;
  const categoryEl = accordion ? accordion.querySelector('.category-tag') : null;
  const severityEl = accordion ? accordion.querySelector('.severity-tag') : null;

  const titleText = titleEl ? titleEl.textContent.replace(/\(已更新\)/, '').trim() : '';
  const contentHtml = bodyEl.innerHTML;
  const currentCategory = categoryEl ? categoryEl.textContent.trim() : '';
  const currentSeverity = severityEl ? severityEl.textContent.trim() : '';

  bodyEl.dataset.editing = '1';
  bodyEl.dataset.originalHtml = contentHtml;

  const eid = nextEditorId();
  const btnId = 'btn-update-fb-' + feedbackId;
  let html = '<div class="inline-edit-body">';
  html += '<div class="co-edit-hint"><span class="material-icons-round">group</span>此欄位為多人共同編輯，請在訊息最後加註您的姓名。</div>';
  html += `<div class="form-group"><label>回饋標題</label><input type="text" id="edit-fb-title-${feedbackId}" value="${escapeAttr(titleText)}"></div>`;

  html += '<div style="display:flex; gap:16px;">';
  html += `<div class="form-group" style="flex:1;"><label>回饋分類</label><select id="edit-fb-category-${feedbackId}">`;
  state.optionsData.categories.forEach((cat) => {
    const selected = (cat === currentCategory) ? ' selected' : '';
    html += `<option value="${escapeAttr(cat)}"${selected}>${escapeHtml(cat)}</option>`;
  });
  html += '</select></div>';

  html += `<div class="form-group" style="flex:1;"><label>嚴重程度</label><select id="edit-fb-severity-${feedbackId}">`;
  state.optionsData.severities.forEach((sev) => {
    const selected = (sev === currentSeverity) ? ' selected' : '';
    html += `<option value="${escapeAttr(sev)}"${selected}>${escapeHtml(sev)}</option>`;
  });
  html += '</select></div>';
  html += '</div>';

  html += '<div class="form-group" style="margin-bottom:0;"><label>回饋內容</label>';
  html += createEditorHtml(eid, '請輸入內容...', contentHtml, feedbackId);
  html += '</div>';
  html += '<div class="inline-form-actions">';
  html += `<button class="btn btn-cancel" onclick="cancelEditFeedback('${feedbackId}')">取消</button>`;
  html += `<button class="btn btn-primary" id="${btnId}" onclick="submitEditFeedback('${feedbackId}', '${eid}')"><span class="material-icons-round">save</span>更新</button>`;
  html += '</div></div>';

  bodyEl.innerHTML = html;
  const editBtn = document.getElementById('fb-edit-btn-' + feedbackId);
  if (editBtn) editBtn.style.display = 'none';
  initEditorResize();
}

export function cancelEditFeedback(feedbackId) {
  const bodyEl = document.getElementById('fb-content-body-' + feedbackId);
  if (!bodyEl) return;
  bodyEl.innerHTML = bodyEl.dataset.originalHtml || '';
  delete bodyEl.dataset.editing;
  delete bodyEl.dataset.originalHtml;
  const editBtn = document.getElementById('fb-edit-btn-' + feedbackId);
  if (editBtn) editBtn.style.display = '';
}

export async function submitEditFeedback(feedbackId, eid) {
  const title = document.getElementById('edit-fb-title-' + feedbackId).value.trim();
  const category = document.getElementById('edit-fb-category-' + feedbackId).value;
  const severity = document.getElementById('edit-fb-severity-' + feedbackId).value;
  const content = getEditorContent(eid);
  if (!title || !content) { showToast('請填寫標題和內容', 'error'); return; }
  if (!severity) { showToast('請選擇嚴重程度', 'error'); return; }

  const btnId = 'btn-update-fb-' + feedbackId;
  setButtonLoading(btnId, true);
  try {
    const r = await apiCall('updateFeedback', {
      feedbackId, category, severity, title, content, email: state.currentUser.email
    });
    setButtonLoading(btnId, false);
    if (r.success) {
      showToast('回饋已更新', 'success');
      state.pendingExpandFeedbackId = feedbackId;
      loadFeedbacks(state.currentAgentId);
    } else {
      showToast(r.message, 'error');
    }
  } catch (e) {
    setButtonLoading(btnId, false);
    showToast('更新失敗：' + e.message, 'error');
  }
}

// ---- 刪除 ----

export function confirmDeleteFeedback(feedbackId) {
  const container = document.getElementById('confirmContainer');
  let html = '<div class="confirm-overlay" id="confirmOverlay" onclick="if(event.target===this)closeConfirm()">';
  html += '<div class="confirm-modal">';
  html += '<div class="confirm-icon material-icons-round">warning</div>';
  html += '<h3>確定要刪除此回饋嗎？</h3>';
  html += '<p>此操作無法復原，刪除後該回饋的所有內容和回覆將永久移除。</p>';
  html += '<div class="confirm-actions">';
  html += '<button class="btn btn-cancel" onclick="closeConfirm()">取消</button>';
  html += `<button class="btn btn-danger-solid" onclick="doDeleteFeedback('${escapeAttr(feedbackId)}')"><span class="material-icons-round">delete</span>確認刪除</button>`;
  html += '</div></div></div>';
  container.innerHTML = html;
}

export function closeConfirm() {
  document.getElementById('confirmContainer').innerHTML = '';
}

export async function doDeleteFeedback(feedbackId) {
  closeConfirm();
  try {
    const r = await apiCall('deleteFeedback', { feedbackId, email: state.currentUser.email });
    if (r.success) {
      showToast('回饋已刪除', 'success');
      loadFeedbacks(state.currentAgentId);
    } else {
      showToast(r.message, 'error');
    }
  } catch (e) {
    showToast('刪除失敗：' + e.message, 'error');
  }
}

// ============================================================
// 💬 技術部回覆
// ============================================================

import { state } from './state.js';
import { apiCall } from './api.js';
import { escapeAttr, escapeHtml, setButtonLoading, showToast } from './utils.js';
import { nextEditorId, createEditorHtml, initEditorResize, getEditorContent } from './editor.js';
import { loadFeedbacks } from './feedback.js';

export function showReplyForm(feedbackId) {
  if (state.currentUserRole !== 'tech') {
    showToast('只有技術部人員才能操作回覆', 'error'); return;
  }
  const bodyEl = document.getElementById('reply-content-body-' + feedbackId);
  if (!bodyEl || bodyEl.dataset.editing === '1') return;

  const accordion = document.getElementById('fb-' + feedbackId);
  const currentStatus = accordion ? (accordion.dataset.status || '') : '';
  const hadReply = !bodyEl.classList.contains('content-block-empty');
  const existingReply = hadReply ? bodyEl.innerHTML : '';

  bodyEl.dataset.editing = '1';
  bodyEl.dataset.originalHtml = bodyEl.innerHTML;
  bodyEl.dataset.originalClass = bodyEl.className;
  if (!hadReply) bodyEl.classList.remove('content-block-empty');

  const eid = nextEditorId();
  const btnId = 'btn-submit-reply-' + feedbackId;
  let html = '<div class="inline-edit-body">';
  html += '<div class="co-edit-hint"><span class="material-icons-round">group</span>此欄位為多人共同編輯，請在訊息最後加註您的姓名。</div>';
  html += `<div class="form-group"><label>處理狀態</label><select id="reply-status-${feedbackId}">`;
  state.optionsData.statuses.forEach((s) => {
    const selected = (s === currentStatus) ? ' selected' : '';
    html += `<option value="${escapeAttr(s)}"${selected}>${escapeHtml(s)}</option>`;
  });
  html += '</select></div>';
  html += '<div class="form-group" style="margin-bottom:0;"><label>回覆內容</label>';
  html += createEditorHtml(eid, '請輸入回覆內容...', existingReply, feedbackId);
  html += '</div>';
  html += '<div class="inline-form-actions">';
  html += `<button class="btn btn-cancel" onclick="cancelReplyForm('${feedbackId}')">取消</button>`;
  html += `<button class="btn btn-primary" id="${btnId}" onclick="submitReply('${feedbackId}', '${eid}')"><span class="material-icons-round">send</span>送出回覆</button>`;
  html += '</div></div>';

  bodyEl.innerHTML = html;
  const editBtn = document.getElementById('reply-edit-btn-' + feedbackId);
  if (editBtn) editBtn.style.display = 'none';
  initEditorResize();
}

export function cancelReplyForm(feedbackId) {
  const bodyEl = document.getElementById('reply-content-body-' + feedbackId);
  if (!bodyEl) return;
  bodyEl.innerHTML = bodyEl.dataset.originalHtml || '';
  if (bodyEl.dataset.originalClass) bodyEl.className = bodyEl.dataset.originalClass;
  delete bodyEl.dataset.editing;
  delete bodyEl.dataset.originalHtml;
  delete bodyEl.dataset.originalClass;
  const editBtn = document.getElementById('reply-edit-btn-' + feedbackId);
  if (editBtn) editBtn.style.display = '';
}

export async function submitReply(feedbackId, eid) {
  const status = document.getElementById('reply-status-' + feedbackId).value;
  const content = getEditorContent(eid);
  if (!content) { showToast('請輸入回覆內容', 'error'); return; }

  const btnId = 'btn-submit-reply-' + feedbackId;
  setButtonLoading(btnId, true);
  try {
    const r = await apiCall('updateReply', {
      feedbackId, replyContent: content,
      replyAuthor: state.currentUser.name, email: state.currentUser.email, status
    });
    setButtonLoading(btnId, false);
    if (r.success) {
      showToast('回覆已送出', 'success');
      state.pendingExpandFeedbackId = feedbackId;
      loadFeedbacks(state.currentAgentId);
    } else {
      showToast(r.message, 'error');
    }
  } catch (e) {
    setButtonLoading(btnId, false);
    showToast('回覆失敗：' + e.message, 'error');
  }
}

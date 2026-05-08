// ============================================================
// 📢 公告欄
// ============================================================

import { state } from './state.js';
import { apiCall } from './api.js';
import { escapeHtml, escapeAttr, renderContent, showToast } from './utils.js';
import { nextEditorId, createEditorHtml, initEditorResize, getEditorContent } from './editor.js';

export function renderAnnouncement(data) {
  const el = document.getElementById('announcementContent');
  const docsEl = document.getElementById('announcementDocsDisplay');
  const content = data.content || '';
  const docs = data.docs || [];

  if (!content.trim() && docs.length === 0) {
    el.innerHTML = '<p class="text-muted">目前沒有公告</p>';
  } else if (!content.trim()) {
    el.innerHTML = '';
  } else {
    el.innerHTML = renderContent(content);
  }

  if (docs.length > 0) {
    let html = '<div class="agent-docs">';
    html += '<div class="doc-label">📎 相關文件</div>';
    docs.forEach((doc) => {
      html += `<a href="${escapeHtml(doc.url)}" target="_blank">`;
      html += '<span class="material-icons-round">open_in_new</span>';
      if (doc.title) html += `<span class="doc-link-label">${escapeHtml(doc.title)}</span>`;
      html += `<span>${escapeHtml(doc.url)}</span></a>`;
    });
    html += '</div>';
    docsEl.innerHTML = html;
    docsEl.style.display = '';
  } else {
    docsEl.innerHTML = '';
    docsEl.style.display = 'none';
  }

  const btnEdit = document.getElementById('btnEditAnnouncement');
  if (btnEdit) btnEdit.style.display = (state.currentUserRole === 'tech') ? '' : 'none';
}

export function toggleAnnouncementEdit() {
  const contentEl = document.getElementById('announcementContent');
  const docsDisplayEl = document.getElementById('announcementDocsDisplay');
  const editEl = document.getElementById('announcementEdit');

  const eid = nextEditorId();
  state.announcementEditorId = eid;
  const wrap = document.getElementById('announcementEditorWrap');
  wrap.innerHTML = createEditorHtml(eid, '請輸入公告內容...', state.announcementData.content || '');
  setTimeout(() => initEditorResize(), 50);

  renderAnnouncementDocsEdit(state.announcementData.docs || []);

  contentEl.style.display = 'none';
  docsDisplayEl.style.display = 'none';
  editEl.style.display = 'block';
  document.getElementById('btnEditAnnouncement').style.display = 'none';
}

export function renderAnnouncementDocsEdit(docs) {
  const listEl = document.getElementById('announcementDocsList');
  let html = '';
  docs.forEach((doc, idx) => {
    html += `<div class="announcement-doc-edit-row" data-doc-index="${idx}">`;
    html += `<input type="text" class="doc-input doc-title-input" placeholder="連結標題" value="${escapeAttr(doc.title || '')}">`;
    html += `<input type="url" class="doc-input doc-url-input" placeholder="https://..." value="${escapeAttr(doc.url || '')}">`;
    html += '<button type="button" class="btn btn-sm btn-icon btn-danger-outline" onclick="removeAnnouncementDoc(this)" title="刪除">';
    html += '<span class="material-icons-round">delete</span></button>';
    html += '</div>';
  });
  listEl.innerHTML = html;
}

export function addAnnouncementDoc() {
  const listEl = document.getElementById('announcementDocsList');
  const idx = listEl.children.length;
  const row = document.createElement('div');
  row.className = 'announcement-doc-edit-row';
  row.dataset.docIndex = idx;
  row.innerHTML = '<input type="text" class="doc-input doc-title-input" placeholder="連結標題">'
    + '<input type="url" class="doc-input doc-url-input" placeholder="https://...">'
    + '<button type="button" class="btn btn-sm btn-icon btn-danger-outline" onclick="removeAnnouncementDoc(this)" title="刪除">'
    + '<span class="material-icons-round">delete</span></button>';
  listEl.appendChild(row);
  row.querySelector('.doc-title-input').focus();
}

export function removeAnnouncementDoc(btn) {
  const row = btn.closest('.announcement-doc-edit-row');
  if (row) row.remove();
}

export function collectAnnouncementDocs() {
  const rows = document.querySelectorAll('#announcementDocsList .announcement-doc-edit-row');
  const docs = [];
  rows.forEach((row) => {
    const title = row.querySelector('.doc-title-input').value.trim();
    const url = row.querySelector('.doc-url-input').value.trim();
    if (url) docs.push({ title, url });
  });
  return docs;
}

export function cancelAnnouncementEdit() {
  document.getElementById('announcementContent').style.display = '';
  document.getElementById('announcementDocsDisplay').style.display = '';
  document.getElementById('announcementEdit').style.display = 'none';
  document.getElementById('btnEditAnnouncement').style.display = '';
  document.getElementById('announcementEditorWrap').innerHTML = '';
  state.announcementEditorId = null;
}

export async function saveAnnouncementContent() {
  const content = state.announcementEditorId ? getEditorContent(state.announcementEditorId) : '';
  const docs = collectAnnouncementDocs();
  try {
    const r = await apiCall('saveAnnouncement', { email: state.currentUser.email, content, docs });
    if (r.success) {
      showToast('公告已更新', 'success');
      state.announcementData = { content, docs };
      renderAnnouncement(state.announcementData);
      cancelAnnouncementEdit();
    } else {
      showToast(r.message, 'error');
    }
  } catch (e) {
    showToast('儲存失敗：' + e.message, 'error');
  }
}

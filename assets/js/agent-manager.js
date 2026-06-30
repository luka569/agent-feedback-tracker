// ============================================================
// 🗂️ Agent 管理面板（技術部限定）— 分類 / Agent CRUD + 拖曳排序
// ============================================================
//
// managerCategories / managerAgents 為前端的單一真實來源：
// 拖曳或 CRUD 先改本地狀態 → 重新渲染 → 呼叫 API（樂觀更新，失敗則重載回滾）。

import { state } from './state.js';
import { apiCall } from './api.js';
import { escapeHtml, escapeAttr, showToast, parseDocUrl } from './utils.js';
import { loadAllAgents } from './agents.js';

let managerCategories = [];          // [分類名稱, ...]（依 E 欄順序，含空分類）
let managerAgents = {};              // { 分類名稱: [{agentId, name, description, category}, ...] }
let selectedCategory = null;
let formDirty = false;
let deleteTargetId = null;

// ---- 開關面板 ----

export async function openAgentManager() {
  document.getElementById('agentMgmtOverlay').style.display = 'flex';
  document.getElementById('mgmtCatList').innerHTML =
    '<div class="mgmt-empty"><span class="material-icons-round">hourglass_top</span><p>載入中...</p></div>';
  document.getElementById('mgmtAgentList').innerHTML = '';
  await loadAndRenderManager();
}

export function closeAgentManager() {
  document.getElementById('agentMgmtOverlay').style.display = 'none';
}

async function loadAndRenderManager() {
  try {
    const [opts, grouped] = await Promise.all([
      apiCall('getOptions'),
      apiCall('getAllAgentsGrouped')
    ]);
    const cats = (opts.agentCategories || []).slice();
    (grouped.categories || []).forEach((c) => { if (cats.indexOf(c) === -1) cats.push(c); });
    managerCategories = cats;
    managerAgents = grouped.agents || {};
    managerCategories.forEach((c) => { if (!managerAgents[c]) managerAgents[c] = []; });

    if (!selectedCategory || managerCategories.indexOf(selectedCategory) === -1) {
      selectedCategory = managerCategories[0] || null;
    }
    renderCategories();
    renderAgents();
  } catch (e) {
    showToast('載入管理面板失敗：' + e.message, 'error');
  }
}

/** 變更成功後：重新載入面板資料 + 同步主頁側邊欄 */
async function refreshAll() {
  await loadAndRenderManager();
  loadAllAgents();
}

// ---- 渲染：分類清單 ----

function renderCategories() {
  const list = document.getElementById('mgmtCatList');
  if (managerCategories.length === 0) {
    list.innerHTML = '<div class="mgmt-empty"><span class="material-icons-round">category</span><p>尚無分類，點右上＋新增</p></div>';
    return;
  }
  let html = '';
  managerCategories.forEach((cat) => {
    const count = (managerAgents[cat] || []).length;
    const isActive = cat === selectedCategory;
    const isEmpty = count === 0;
    html += `<div class="cat-item${isActive ? ' active' : ''}${isEmpty ? ' empty' : ''}" data-cat="${escapeAttr(cat)}">`;
    html += '<div class="drag-handle" draggable="true" title="拖曳調整順序"><span class="material-icons-round">drag_indicator</span></div>';
    html += `<span class="cat-name">${escapeHtml(cat)}</span>`;
    html += `<span class="cat-count">${count}</span>`;
    html += '<div class="cat-actions">';
    html += '<button class="cat-action-btn" data-act="rename" title="重新命名"><span class="material-icons-round">edit</span></button>';
    html += '<button class="cat-action-btn del" data-act="delete" title="刪除"><span class="material-icons-round">delete</span></button>';
    html += '</div></div>';
  });
  list.innerHTML = html;

  list.querySelectorAll('.cat-item').forEach((item) => {
    const cat = item.dataset.cat;
    item.addEventListener('click', (e) => {
      if (e.target.closest('.cat-action-btn')) return;
      if (e.target.closest('.cat-rename-input')) return;
      selectManagerCategory(cat);
    });
    const renameBtn = item.querySelector('[data-act="rename"]');
    if (renameBtn) renameBtn.addEventListener('click', (e) => { e.stopPropagation(); startRenameCategory(cat, item); });
    const delBtn = item.querySelector('[data-act="delete"]');
    if (delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteCategory(cat); });
    attachCategoryDrag(item);
  });
}

export function selectManagerCategory(cat) {
  selectedCategory = cat;
  renderCategories();
  renderAgents();
}

// ---- 渲染：Agent 清單 ----

function renderAgents() {
  const title = document.getElementById('mgmtAgentPanelTitle');
  const list = document.getElementById('mgmtAgentList');
  const addBtn = document.getElementById('mgmtAddAgentBtn');

  if (!selectedCategory) {
    title.textContent = 'Agent';
    list.innerHTML = '<div class="mgmt-empty"><span class="material-icons-round">smart_toy</span><p>請先於左側新增或選擇分類</p></div>';
    if (addBtn) addBtn.style.display = 'none';
    return;
  }

  title.innerHTML = `<span class="material-icons-round header-icon">smart_toy</span>${escapeHtml(selectedCategory)} 的 Agent`;
  const agents = managerAgents[selectedCategory] || [];

  if (agents.length === 0) {
    list.innerHTML = '<div class="mgmt-empty"><span class="material-icons-round">smart_toy</span><p>此分類尚無 Agent</p></div>';
  } else {
    let html = '';
    agents.forEach((a) => {
      html += `<div class="agent-row" data-agent-id="${escapeAttr(a.agentId)}">`;
      html += '<div class="drag-handle" draggable="true" title="拖曳調整順序／跨分類移動"><span class="material-icons-round">drag_indicator</span></div>';
      html += '<div class="agent-icon"><span class="material-icons-round">smart_toy</span></div>';
      html += '<div class="agent-row-info">';
      html += `<div class="agent-row-name">${escapeHtml(a.name)}</div>`;
      if (a.description) html += `<div class="agent-row-desc">${escapeHtml(a.description)}</div>`;
      html += '</div>';
      html += `<span class="agent-row-cat-badge">${escapeHtml(selectedCategory)}</span>`;
      html += '<div class="agent-row-actions">';
      html += '<button class="agent-action-btn" data-act="edit" title="編輯"><span class="material-icons-round">edit</span></button>';
      html += '<button class="agent-action-btn del" data-act="delete" title="刪除"><span class="material-icons-round">delete</span></button>';
      html += '</div></div>';
    });
    list.innerHTML = html;

    list.querySelectorAll('.agent-row').forEach((row) => {
      const agentId = row.dataset.agentId;
      row.querySelector('[data-act="edit"]').addEventListener('click', () => openAgentForm('edit', agentId));
      row.querySelector('[data-act="delete"]').addEventListener('click', () => confirmDeleteAgent(agentId));
      attachAgentDrag(row);
    });
  }

  if (addBtn) {
    addBtn.style.display = '';
    addBtn.innerHTML = `<span class="material-icons-round">add</span>新增 Agent 到「${escapeHtml(selectedCategory)}」`;
  }
}

// ---- 分類：新增 / 重新命名 / 刪除 ----

export function showAddCategoryInput() {
  const list = document.getElementById('mgmtCatList');
  if (!list) return;

  // 已在輸入中 → 聚焦即可，不重複插入
  const existing = list.querySelector('.cat-add-row .cat-rename-input');
  if (existing) { existing.focus(); return; }

  // 清掉空狀態提示
  if (list.querySelector('.mgmt-empty')) list.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'cat-item cat-add-row active';
  row.innerHTML =
    '<div class="drag-handle"><span class="material-icons-round">drag_indicator</span></div>' +
    '<input type="text" class="cat-rename-input" placeholder="輸入分類名稱">' +
    '<button class="cat-action-btn ok" data-act="ok" title="確認"><span class="material-icons-round">check</span></button>' +
    '<button class="cat-action-btn" data-act="cancel" title="取消"><span class="material-icons-round">close</span></button>';
  list.insertBefore(row, list.firstChild);

  const input = row.querySelector('input');
  input.focus();

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const name = input.value.trim();
    if (commit && name) {
      if (managerCategories.indexOf(name) !== -1) { showToast('分類名稱已存在', 'error'); renderCategories(); return; }
      submitAddCategory(name);
    } else {
      renderCategories();
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
  // 用 mousedown + preventDefault，避免按鈕搶走 input 的 blur 順序
  row.querySelector('[data-act="ok"]').addEventListener('mousedown', (e) => { e.preventDefault(); finish(true); });
  row.querySelector('[data-act="cancel"]').addEventListener('mousedown', (e) => { e.preventDefault(); finish(false); });
}

async function submitAddCategory(name) {
  try {
    const r = await apiCall('addCategory', { email: state.currentUser.email, categoryName: name });
    if (r.success) {
      showToast('分類已新增', 'success');
      selectedCategory = name;
      await refreshAll();
    } else {
      showToast(r.message || '新增失敗', 'error');
    }
  } catch (e) {
    showToast('新增失敗：' + e.message, 'error');
  }
}

function startRenameCategory(cat, item) {
  const nameSpan = item.querySelector('.cat-name');
  const actions = item.querySelector('.cat-actions');
  if (!nameSpan) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cat-rename-input';
  input.value = cat;
  nameSpan.replaceWith(input);
  if (actions) actions.style.display = 'none';
  input.focus();
  input.select();

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const newName = input.value.trim();
    if (commit && newName && newName !== cat) {
      confirmRenameCategory(cat, newName);
    } else {
      renderCategories();
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
}

async function confirmRenameCategory(oldName, newName) {
  if (managerCategories.indexOf(newName) !== -1) { showToast('分類名稱已存在', 'error'); renderCategories(); return; }
  try {
    const r = await apiCall('updateCategory', { email: state.currentUser.email, oldName, newName });
    if (r.success) {
      showToast('分類已重新命名', 'success');
      if (selectedCategory === oldName) selectedCategory = newName;
      await refreshAll();
    } else {
      showToast(r.message || '重新命名失敗', 'error');
      renderCategories();
    }
  } catch (e) {
    showToast('重新命名失敗：' + e.message, 'error');
    renderCategories();
  }
}

async function deleteCategory(cat) {
  const count = (managerAgents[cat] || []).length;
  if (count > 0) { showToast('請先移除或搬移此分類下的所有 Agent', 'error'); return; }
  if (!confirm(`確定要刪除分類「${cat}」嗎？`)) return;
  try {
    const r = await apiCall('deleteCategory', { email: state.currentUser.email, categoryName: cat });
    if (r.success) {
      showToast('分類已刪除', 'success');
      if (selectedCategory === cat) selectedCategory = null;
      await refreshAll();
    } else {
      showToast(r.message || '刪除失敗', 'error');
    }
  } catch (e) {
    showToast('刪除失敗：' + e.message, 'error');
  }
}

// ---- Agent 表單（新增 / 編輯）----

export async function openAgentForm(mode, agentId) {
  let data = { category: selectedCategory || (managerCategories[0] || ''), name: '', description: '', docUrls: [] };
  if (mode === 'edit') {
    try {
      const info = await apiCall('getAgentInfo', { agentId });
      if (info) data = { category: info.category, name: info.name, description: info.description || '', docUrls: info.docUrls || [] };
    } catch (e) {
      showToast('載入 Agent 資料失敗：' + e.message, 'error');
      return;
    }
  }

  const catOptions = managerCategories.map((c) =>
    `<option value="${escapeAttr(c)}"${c === data.category ? ' selected' : ''}>${escapeHtml(c)}</option>`
  ).join('');

  const docRows = (data.docUrls.length ? data.docUrls : []).map((line) => {
    const parsed = parseDocUrl(line);
    return docRowHtml(parsed.label, parsed.url);
  }).join('');

  const container = document.getElementById('agentFormContainer');
  container.innerHTML = `
    <div class="form-modal-overlay">
      <div class="form-modal">
        <div class="form-modal-header">
          <span class="material-icons-round header-icon">${mode === 'edit' ? 'edit' : 'add_circle'}</span>
          <h3>${mode === 'edit' ? '編輯 Agent' : '新增 Agent'}</h3>
          <button class="mgmt-close-btn" data-act="close"><span class="material-icons-round">close</span></button>
        </div>
        <div class="form-modal-body">
          <div class="mgmt-form-group">
            <label>分類 <span class="req">*</span></label>
            <select class="mgmt-form-control" id="agentFormCategory">${catOptions}</select>
          </div>
          <div class="mgmt-form-group">
            <label>Agent 名稱 <span class="req">*</span></label>
            <input type="text" class="mgmt-form-control" id="agentFormName" value="${escapeAttr(data.name)}" placeholder="請輸入 Agent 名稱">
            <div class="mgmt-field-error" id="agentFormNameError">請輸入 Agent 名稱</div>
          </div>
          <div class="mgmt-form-group">
            <label>Agent 簡介</label>
            <textarea class="mgmt-form-control" id="agentFormDesc" rows="3" placeholder="請描述此 Agent 的功能與用途...">${escapeHtml(data.description)}</textarea>
          </div>
          <div class="mgmt-form-group">
            <label>相關文件網址</label>
            <div class="doc-list" id="agentFormDocList">${docRows}</div>
            <button type="button" class="btn-add-doc-row" data-act="add-doc"><span class="material-icons-round">add_link</span>新增文件連結</button>
            <div class="mgmt-form-hint">格式：每列一個 URL；標籤為選填，將顯示於連結文字</div>
          </div>
        </div>
        <div class="form-modal-footer">
          <button class="mgmt-btn mgmt-btn-secondary" data-act="close">取消</button>
          <button class="mgmt-btn mgmt-btn-primary" id="agentFormSaveBtn" data-act="save">
            <span class="material-icons-round">save</span>儲存 Agent
          </button>
        </div>
      </div>
    </div>`;

  formDirty = false;
  const overlay = container.querySelector('.form-modal-overlay');
  overlay.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener('click', () => closeAgentForm(false)));
  overlay.querySelector('[data-act="add-doc"]').addEventListener('click', () => { addDocRow(); formDirty = true; });
  overlay.querySelector('[data-act="save"]').addEventListener('click', () => saveAgentForm(mode, agentId));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAgentForm(false); });
  overlay.querySelectorAll('input, textarea, select').forEach((el) => el.addEventListener('input', () => { formDirty = true; }));
  bindDocRowDeletes(overlay);
}

function docRowHtml(label, url) {
  return `<div class="doc-row">
    <input type="text" class="mgmt-form-control doc-row-label" placeholder="標籤（選填）" value="${escapeAttr(label || '')}">
    <input type="text" class="mgmt-form-control doc-row-url" placeholder="https://..." value="${escapeAttr(url || '')}">
    <button type="button" class="doc-row-del" title="移除"><span class="material-icons-round">remove_circle_outline</span></button>
  </div>`;
}

export function addDocRow() {
  const list = document.getElementById('agentFormDocList');
  if (!list) return;
  list.insertAdjacentHTML('beforeend', docRowHtml('', ''));
  const row = list.lastElementChild;
  row.querySelector('.doc-row-del').addEventListener('click', () => { row.remove(); formDirty = true; });
  row.querySelectorAll('input').forEach((el) => el.addEventListener('input', () => { formDirty = true; }));
}

function bindDocRowDeletes(scope) {
  scope.querySelectorAll('.doc-row .doc-row-del').forEach((btn) => {
    btn.addEventListener('click', () => { btn.closest('.doc-row').remove(); formDirty = true; });
  });
}

export function closeAgentForm(force) {
  if (!force && formDirty && !confirm('確定要離開？您的變更將不被儲存。')) return;
  document.getElementById('agentFormContainer').innerHTML = '';
  formDirty = false;
}

async function saveAgentForm(mode, agentId) {
  const category = document.getElementById('agentFormCategory').value;
  const name = document.getElementById('agentFormName').value.trim();
  const description = document.getElementById('agentFormDesc').value;
  const nameError = document.getElementById('agentFormNameError');

  if (!name) { nameError.classList.add('visible'); return; }
  nameError.classList.remove('visible');

  const docUrls = [];
  document.querySelectorAll('#agentFormDocList .doc-row').forEach((row) => {
    const label = row.querySelector('.doc-row-label').value.trim();
    const url = row.querySelector('.doc-row-url').value.trim();
    if (!url) return;
    docUrls.push(label ? `${label}：${url}` : url);
  });

  const saveBtn = document.getElementById('agentFormSaveBtn');
  saveBtn.disabled = true;

  const payload = { email: state.currentUser.email, category, name, description, docUrls: docUrls.join('\n') };
  try {
    const r = (mode === 'edit')
      ? await apiCall('updateAgent', Object.assign({ agentId }, payload))
      : await apiCall('addAgent', payload);
    if (r.success) {
      showToast('Agent 已儲存', 'success');
      selectedCategory = category;
      closeAgentForm(true);
      await refreshAll();
    } else {
      showToast(r.message || '儲存失敗', 'error');
      saveBtn.disabled = false;
    }
  } catch (e) {
    showToast('儲存失敗：' + e.message, 'error');
    saveBtn.disabled = false;
  }
}

// ---- 刪除 Agent（含密碼）----

export function confirmDeleteAgent(agentId) {
  deleteTargetId = agentId;
  let agentName = agentId;
  const arr = managerAgents[selectedCategory] || [];
  const found = arr.find((a) => a.agentId === agentId);
  if (found) agentName = found.name;

  const container = document.getElementById('agentDeleteContainer');
  container.innerHTML = `
    <div class="form-modal-overlay">
      <div class="del-modal">
        <div class="del-modal-header">
          <div class="del-modal-icon"><span class="material-icons-round">delete_forever</span></div>
          <div>
            <h3>刪除並封存 Agent</h3>
            <p>此操作不可直接還原</p>
          </div>
        </div>
        <div class="del-modal-body">
          <div class="del-agent-name"><span class="material-icons-round">smart_toy</span>${escapeHtml(agentName)}</div>
          <div class="del-warning">
            <span class="material-icons-round">warning</span>
            <span>此 Agent 將從系統中移除，並封存至「Agent封存」試算表分頁。封存後無法從網頁介面還原，請確認後再操作。</span>
          </div>
          <div class="mgmt-form-group">
            <label>請輸入技術部密碼以確認刪除 <span class="req">*</span></label>
            <div class="pw-input-wrap">
              <input type="password" id="delPwInput" class="mgmt-form-control" placeholder="請輸入技術部密碼" autocomplete="off">
              <button class="pw-toggle" data-act="toggle-pw"><span class="material-icons-round">visibility</span></button>
            </div>
            <div class="pw-error" id="delPwError">密碼錯誤，請重新輸入</div>
          </div>
        </div>
        <div class="del-modal-footer">
          <button class="mgmt-btn mgmt-btn-secondary" data-act="cancel">取消</button>
          <button class="mgmt-btn mgmt-btn-danger" id="delConfirmBtn" data-act="confirm">
            <span class="material-icons-round">delete_forever</span>確認刪除並封存
          </button>
        </div>
      </div>
    </div>`;

  const overlay = container.querySelector('.form-modal-overlay');
  const input = container.querySelector('#delPwInput');
  overlay.querySelector('[data-act="cancel"]').addEventListener('click', closeDeleteAgent);
  overlay.querySelector('[data-act="confirm"]').addEventListener('click', doDeleteAgent);
  overlay.querySelector('[data-act="toggle-pw"]').addEventListener('click', togglePwVisible);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDeleteAgent(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doDeleteAgent(); } });
  input.addEventListener('input', () => document.getElementById('delPwError').classList.remove('visible'));
  input.focus();
}

function closeDeleteAgent() {
  document.getElementById('agentDeleteContainer').innerHTML = '';
  deleteTargetId = null;
}

export function togglePwVisible() {
  const input = document.getElementById('delPwInput');
  const icon = document.querySelector('#agentDeleteContainer .pw-toggle .material-icons-round');
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; if (icon) icon.textContent = 'visibility_off'; }
  else { input.type = 'password'; if (icon) icon.textContent = 'visibility'; }
}

async function doDeleteAgent() {
  const input = document.getElementById('delPwInput');
  const errEl = document.getElementById('delPwError');
  const btn = document.getElementById('delConfirmBtn');
  const password = input ? input.value : '';
  if (!password) { errEl.textContent = '請輸入技術部密碼'; errEl.classList.add('visible'); return; }

  btn.disabled = true;
  try {
    const r = await apiCall('deleteAgent', { email: state.currentUser.email, password, agentId: deleteTargetId });
    if (r.success) {
      showToast('已封存並刪除', 'success');
      closeDeleteAgent();
      await refreshAll();
    } else {
      errEl.textContent = r.message || '刪除失敗';
      errEl.classList.add('visible');
      btn.disabled = false;
    }
  } catch (e) {
    errEl.textContent = '刪除失敗：' + e.message;
    errEl.classList.add('visible');
    btn.disabled = false;
  }
}

// ============================================================
// 拖曳排序
// ============================================================

let catDragSrc = null;     // 拖曳中的分類名稱
let agentDragSrc = null;   // 拖曳中的 agentId

function clearDropMarkers() {
  document.querySelectorAll('#agentMgmtOverlay .drop-line').forEach((el) => el.remove());
  document.querySelectorAll('#agentMgmtOverlay .drop-target').forEach((el) => el.classList.remove('drop-target'));
}

function showDropLine(container, beforeEl) {
  clearDropMarkers();
  const line = document.createElement('div');
  line.className = 'drop-line';
  if (beforeEl) container.insertBefore(line, beforeEl);
  else container.appendChild(line);
}

/** 依 clientY 找出應插入在哪個項目之前（回傳元素或 null=置底） */
function getInsertBefore(items, clientY) {
  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return items[i];
  }
  return null;
}

// ---- 分類拖曳 ----

function attachCategoryDrag(item) {
  const handle = item.querySelector('.drag-handle');
  if (!handle) return;
  handle.addEventListener('dragstart', (e) => {
    if (agentDragSrc) return;
    catDragSrc = item.dataset.cat;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', catDragSrc);
  });
  handle.addEventListener('dragend', () => {
    catDragSrc = null;
    clearDropMarkers();
    document.querySelectorAll('#mgmtCatList .cat-item').forEach((el) => el.classList.remove('dragging'));
  });
}

function initCatListDrop() {
  const list = document.getElementById('mgmtCatList');
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (catDragSrc) {
      const items = Array.from(list.querySelectorAll('.cat-item:not(.dragging)'));
      showDropLine(list, getInsertBefore(items, e.clientY));
    } else if (agentDragSrc) {
      // 拖曳 Agent 到分類項目上 → 跨分類移動
      const target = e.target.closest('.cat-item');
      clearDropMarkers();
      if (target) target.classList.add('drop-target');
    }
  });
  list.addEventListener('dragleave', (e) => {
    if (!list.contains(e.relatedTarget)) clearDropMarkers();
  });
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    if (catDragSrc) {
      const items = Array.from(list.querySelectorAll('.cat-item:not(.dragging)'));
      const beforeEl = getInsertBefore(items, e.clientY);
      const beforeCat = beforeEl ? beforeEl.dataset.cat : null;
      clearDropMarkers();
      reorderCategoryTo(catDragSrc, beforeCat);
    } else if (agentDragSrc) {
      const target = e.target.closest('.cat-item');
      clearDropMarkers();
      if (target) moveAgentToCategory(agentDragSrc, target.dataset.cat);
    }
  });
}

function reorderCategoryTo(cat, beforeCat) {
  const arr = managerCategories.slice();
  const from = arr.indexOf(cat);
  if (from === -1) return;
  arr.splice(from, 1);
  let insertIdx = beforeCat ? arr.indexOf(beforeCat) : arr.length;
  if (insertIdx === -1) insertIdx = arr.length;
  arr.splice(insertIdx, 0, cat);
  if (arr.join('') === managerCategories.join('')) return;
  managerCategories = arr;
  renderCategories();
  persistCategoryOrder();
}

async function persistCategoryOrder() {
  try {
    const r = await apiCall('reorderCategories', { email: state.currentUser.email, orderedCategories: managerCategories });
    if (r.success) { showToast('分類順序已更新', 'success'); loadAllAgents(); }
    else { showToast(r.message || '排序失敗', 'error'); refreshAll(); }
  } catch (e) {
    showToast('排序失敗：' + e.message, 'error');
    refreshAll();
  }
}

// ---- Agent 拖曳 ----

function attachAgentDrag(row) {
  const handle = row.querySelector('.drag-handle');
  if (!handle) return;
  handle.addEventListener('dragstart', (e) => {
    agentDragSrc = row.dataset.agentId;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', agentDragSrc);
  });
  handle.addEventListener('dragend', () => {
    agentDragSrc = null;
    clearDropMarkers();
    document.querySelectorAll('#mgmtAgentList .agent-row').forEach((el) => el.classList.remove('dragging'));
  });
}

function initAgentListDrop() {
  const list = document.getElementById('mgmtAgentList');
  list.addEventListener('dragover', (e) => {
    if (!agentDragSrc) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const items = Array.from(list.querySelectorAll('.agent-row:not(.dragging)'));
    showDropLine(list, getInsertBefore(items, e.clientY));
  });
  list.addEventListener('dragleave', (e) => {
    if (!list.contains(e.relatedTarget)) clearDropMarkers();
  });
  list.addEventListener('drop', (e) => {
    if (!agentDragSrc) return;
    e.preventDefault();
    const items = Array.from(list.querySelectorAll('.agent-row:not(.dragging)'));
    const beforeEl = getInsertBefore(items, e.clientY);
    const beforeId = beforeEl ? beforeEl.dataset.agentId : null;
    clearDropMarkers();
    reorderAgentWithin(agentDragSrc, beforeId);
  });
}

function reorderAgentWithin(agentId, beforeId) {
  const arr = managerAgents[selectedCategory] || [];
  const from = arr.findIndex((a) => a.agentId === agentId);
  if (from === -1) return;
  const [moved] = arr.splice(from, 1);
  let insertIdx = beforeId ? arr.findIndex((a) => a.agentId === beforeId) : arr.length;
  if (insertIdx === -1) insertIdx = arr.length;
  arr.splice(insertIdx, 0, moved);
  managerAgents[selectedCategory] = arr;
  renderAgents();
  persistAgentOrder();
}

function moveAgentToCategory(agentId, targetCat) {
  if (targetCat === selectedCategory) return;
  const srcArr = managerAgents[selectedCategory] || [];
  const idx = srcArr.findIndex((a) => a.agentId === agentId);
  if (idx === -1) return;
  const [moved] = srcArr.splice(idx, 1);
  moved.category = targetCat;
  if (!managerAgents[targetCat]) managerAgents[targetCat] = [];
  managerAgents[targetCat].push(moved);
  selectedCategory = targetCat;
  renderCategories();
  renderAgents();
  persistAgentOrder();
}

async function persistAgentOrder() {
  const orderedAgents = [];
  managerCategories.forEach((cat) => {
    (managerAgents[cat] || []).forEach((a) => orderedAgents.push({ agentId: a.agentId, category: cat }));
  });
  try {
    const r = await apiCall('reorderAgents', { email: state.currentUser.email, orderedAgents });
    if (r.success) { showToast('Agent 順序已更新', 'success'); loadAllAgents(); }
    else { showToast(r.message || '排序失敗', 'error'); refreshAll(); }
  } catch (e) {
    showToast('排序失敗：' + e.message, 'error');
    refreshAll();
  }
}

// ---- 初始化拖曳容器監聽（容器本身只綁一次）----

export function initAgentManager() {
  initCatListDrop();
  initAgentListDrop();
}

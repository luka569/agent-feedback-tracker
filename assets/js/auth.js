// ============================================================
// 👤 使用者身份 / 角色驗證
// ============================================================

import { state } from './state.js';
import { SafeStorage } from './storage.js';
import { STORAGE_KEYS } from './config.js';
import { apiCall } from './api.js';
import { escapeHtml, showToast } from './utils.js';

export function loadUserInfo() {
  const name = SafeStorage.local.get(STORAGE_KEYS.USER_NAME);
  const email = SafeStorage.local.get(STORAGE_KEYS.USER_EMAIL);
  const role = SafeStorage.local.get(STORAGE_KEYS.USER_ROLE);
  if (name && email && role) {
    state.currentUser.name = name;
    state.currentUser.email = email;
    state.currentUserRole = role;
    updateUserDisplay();
    updateUIByRole();
  } else {
    document.getElementById('userSetupOverlay').style.display = 'flex';
  }
}

export function isTechEmail(email) {
  if (!email) return false;
  return state.optionsData.techEmails.indexOf(email.toLowerCase()) !== -1;
}

export async function saveUserInfo() {
  const name = document.getElementById('setupNameInput').value.trim();
  const email = document.getElementById('setupEmailInput').value.trim();
  if (!name || !email) { showToast('請填寫姓名和 Email', 'error'); return; }
  const pw = document.getElementById('setupPasswordInput').value.trim();

  try {
    const result = await apiCall('validateRole', { email, password: pw });
    state.currentUserRole = result.role;
    state.currentUser.name = name;
    state.currentUser.email = email;
    SafeStorage.local.set(STORAGE_KEYS.USER_NAME, name);
    SafeStorage.local.set(STORAGE_KEYS.USER_EMAIL, email);
    SafeStorage.local.set(STORAGE_KEYS.USER_ROLE, state.currentUserRole);
    document.getElementById('userSetupOverlay').style.display = 'none';
    updateUserDisplay();
    updateUIByRole();
    showToast('身份已設定為：' + getRoleLabel(state.currentUserRole), 'success');
    if (state.currentAgentId) {
      const { loadFeedbacks } = await import('./feedback.js');
      loadFeedbacks(state.currentAgentId);
    }
  } catch (e) {
    showToast('驗證失敗：' + e.message, 'error');
  }
}

export function showUserSetup() {
  document.getElementById('setupNameInput').value = state.currentUser.name;
  document.getElementById('setupEmailInput').value = state.currentUser.email;
  document.getElementById('setupPasswordInput').value = '';
  document.getElementById('userSetupOverlay').style.display = 'flex';
}

/**
 * 點擊 overlay 外部關閉 Modal（只有已有身份時允許關閉）
 */
export function closeSetupOverlay(event) {
  if (event.target === document.getElementById('userSetupOverlay')) {
    if (state.currentUser.name && state.currentUser.email) {
      document.getElementById('userSetupOverlay').style.display = 'none';
    }
  }
}

export function getRoleLabel(role) { return role === 'tech' ? '技術部' : '顧問'; }
export function getRoleBadgeClass(role) { return role === 'tech' ? 'role-tech' : 'role-consultant'; }

export function updateUserDisplay() {
  const roleLabel = getRoleLabel(state.currentUserRole);
  const badgeClass = getRoleBadgeClass(state.currentUserRole);
  document.getElementById('userDisplayLabel').innerHTML =
    `<span class="user-display-name">${escapeHtml(state.currentUser.name)}</span>` +
    `<span class="user-role-badge ${badgeClass}">${roleLabel}</span>`;
}

export function updateUIByRole() {
  const btnNewFeedback = document.getElementById('btnNewFeedback');
  if (btnNewFeedback) {
    btnNewFeedback.style.display =
      (state.currentUserRole === 'consultant' || state.currentUserRole === 'tech') ? '' : 'none';
  }
  const btnEditAnn = document.getElementById('btnEditAnnouncement');
  if (btnEditAnn) btnEditAnn.style.display = (state.currentUserRole === 'tech') ? '' : 'none';
}

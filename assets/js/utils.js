// ============================================================
// 🛠️ 純工具函式
// ============================================================

import { state } from './state.js';

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function linkify(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;word-break:break-all;">${url}</a>`
  );
}

/**
 * 將 HTML 內容消毒並標記搜尋關鍵字
 */
export function renderContent(str) {
  if (!str) return '';
  let cleanHtml;
  if (/<[a-z][\s\S]*>/i.test(str)) {
    let clean = str;
    clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
    clean = clean.replace(/javascript\s*:/gi, '');
    cleanHtml = clean;
  } else {
    cleanHtml = escapeHtml(str).replace(/\n/g, '<br>');
  }
  return highlightKeywords(cleanHtml);
}

/**
 * 把目前搜尋關鍵字反白（避開 HTML 標籤屬性區）
 */
export function highlightKeywords(text) {
  if (!text || state.searchKeywords.length === 0) return text;
  let result = text;
  state.searchKeywords.forEach((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(' + escaped + ')(?![^<]*>)', 'gi');
    result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
  });
  return result;
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span class="material-icons-round">${icons[type] || 'info'}</span>${escapeHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分鐘前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小時前';
  if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  const h = ('0' + date.getHours()).slice(-2);
  const min = ('0' + date.getMinutes()).slice(-2);
  return `${y}/${m}/${d} ${h}:${min}`;
}

export function setButtonLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons-round">hourglass_top</span>送出中...';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
  }
}

export function parseDocUrl(line) {
  const httpIdx = line.indexOf('http');
  if (httpIdx > 0) {
    const label = line.substring(0, httpIdx).replace(/[：:]\s*$/, '').trim();
    return { label, url: line.substring(httpIdx).trim() };
  }
  return { label: '', url: line.trim() };
}

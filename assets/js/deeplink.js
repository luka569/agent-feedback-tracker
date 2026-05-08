// ============================================================
// 🔗 深連結（URL 參數）與分享連結
// ============================================================

import { state } from './state.js';
import { showToast } from './utils.js';
import { selectAgent } from './agents.js';

/**
 * 從 query string 解析 ?agent=&fb= 並還原狀態
 */
export const URL_PARAMS = (() => {
  const sp = new URLSearchParams(window.location.search);
  const obj = {};
  for (const [k, v] of sp.entries()) obj[k] = v;
  return obj;
})();

export function handleDeepLink() {
  if (!URL_PARAMS || (!URL_PARAMS.agent && !URL_PARAMS.fb)) return;
  if (URL_PARAMS.agent) {
    const checkInterval = setInterval(() => {
      const agentEl = document.querySelector(`.agent-item[data-id="${URL_PARAMS.agent}"]`);
      if (agentEl) {
        clearInterval(checkInterval);
        if (URL_PARAMS.fb) state.pendingExpandFeedbackId = URL_PARAMS.fb;
        selectAgent(URL_PARAMS.agent, agentEl);
      }
    }, 200);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}

/**
 * 產生分享網址（指向當前 Pages 網頁）
 */
export function getShareUrl(agentId, feedbackId) {
  const baseUrl = window.location.origin + window.location.pathname;
  return baseUrl + '?agent=' + encodeURIComponent(agentId) + '&fb=' + encodeURIComponent(feedbackId);
}

export function copyShareLink(agentId, feedbackId, event) {
  event.stopPropagation();
  const url = getShareUrl(agentId, feedbackId);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('已複製分享連結', 'success'))
      .catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (ok) {
      showToast('已複製分享連結', 'success');
      return;
    }
  } catch (e) { /* 繼續到方案 3 */ }

  window.prompt('請複製以下連結：', text);
}

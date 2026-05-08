// ============================================================
// 🚀 入口（DOMContentLoaded）+ 把對外函式掛到 window 供內聯 onclick 使用
// ============================================================

import { loadOptions, loadDashboard, showDashboard, renderDashboard } from './dashboard.js';
import { loadUserInfo, saveUserInfo, showUserSetup, closeSetupOverlay, isTechEmail, updateUserDisplay, updateUIByRole } from './auth.js';
import { handleDeepLink, getShareUrl, copyShareLink } from './deeplink.js';
import { toggleSidebar, toggleMobileSidebar, closeMobileSidebar, initResizer } from './sidebar.js';
import { loadAllAgents, selectAgent, loadAgentInfo } from './agents.js';
import {
  renderAnnouncement, toggleAnnouncementEdit, addAnnouncementDoc, removeAnnouncementDoc,
  cancelAnnouncementEdit, saveAnnouncementContent
} from './announcement.js';
import {
  initSearch, removeSearchTag, clearSearch
} from './search.js';
import {
  loadFeedbacks, toggleFeedback, refreshSingleFeedback, expandAndScrollTo,
  toggleNewFeedbackForm, submitNewFeedback,
  showEditFeedbackForm, cancelEditFeedback, submitEditFeedback,
  confirmDeleteFeedback, closeConfirm, doDeleteFeedback,
  restoreSessionState
} from './feedback.js';
import { showReplyForm, cancelReplyForm, submitReply } from './reply.js';
import {
  execCmd, triggerImageUpload, handleImageUpload, handlePasteOrDropImage
} from './editor.js';

// ---- 把所有「會被 HTML 內聯 onclick 呼叫」的函式掛到 window ----
//
// ES Modules 預設是 module scope，內聯 onclick 找不到 module 內的函式。
// 我們用顯式 Object.assign 維持原本內聯事件寫法（不必改 HTML）。
Object.assign(window, {
  // 身份
  saveUserInfo, showUserSetup, closeSetupOverlay,
  // Dashboard / Sidebar
  showDashboard, toggleSidebar, toggleMobileSidebar, closeMobileSidebar,
  // Agent
  selectAgent,
  // Announcement
  toggleAnnouncementEdit, addAnnouncementDoc, removeAnnouncementDoc,
  cancelAnnouncementEdit, saveAnnouncementContent,
  // Search
  removeSearchTag, clearSearch,
  // Feedback
  toggleFeedback, refreshSingleFeedback, copyShareLink,
  toggleNewFeedbackForm, submitNewFeedback,
  showEditFeedbackForm, cancelEditFeedback, submitEditFeedback,
  confirmDeleteFeedback, closeConfirm, doDeleteFeedback,
  // Reply
  showReplyForm, cancelReplyForm, submitReply,
  // Editor
  execCmd, triggerImageUpload, handleImageUpload, handlePasteOrDropImage
});

// ---- 啟動流程 ----

document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  loadUserInfo();
  handleDeepLink();
  restoreSessionState();

  loadAllAgents();
  loadDashboard();
  initResizer();
  initSearch();
});

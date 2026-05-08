// ============================================================
// 🔧 全域狀態（取代原 Js.html 的 var 全域變數）
// ============================================================
//
// 用 export const 物件 + 直接 mutate 屬性的方式共享狀態。
// 各模組 `import { state } from './state.js'` 後可直接讀寫。

export const state = {
  currentUser: { name: '', email: '' },
  currentUserRole: '',                                          // 'tech' | 'consultant'
  currentAgentId: '',
  activeEditorId: null,
  activeUploadFeedbackId: null,
  editorCounter: 0,
  optionsData: {
    categories: [],
    statuses: [],
    techEmails: [],
    consultantEmails: [],
    agentCategories: [],
    severities: []
  },
  pendingExpandFeedbackId: null,
  searchKeywords: [],
  searchResults: null,
  announcementEditorId: null,
  announcementData: { content: '', docs: [] }
};

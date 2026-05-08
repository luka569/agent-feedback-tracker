// ============================================================
// ⚙️ 前端設定
// ============================================================
//
// API_URL：後端 GAS Web App 的 .../exec 網址。
// 部署順序：先用 clasp 部署後端 → 拿到網址 → 填入此處 → git push 前端。
//
// 若同一前端要切換不同後端（測試/正式），可改成從 query string 讀取，
// 例如 const API_URL = new URLSearchParams(location.search).get('api') || DEFAULT;
//
// 注意：access 權限必須手動到 GAS UI 改為「所有人」，否則 fetch 會收到 HTML 而非 JSON。

export const API_URL = 'https://script.google.com/macros/s/AKfycbwYFPqeFbDZTVgVz4E-Nl0xbdLq2xKWamlts9mT-OWo1zv3IoOETyLN9pazOXDEp7TQ1g/exec';

// ---- localStorage / sessionStorage 鍵名 ----
export const STORAGE_KEYS = {
  USER_NAME: 'agent_feedback_name',
  USER_EMAIL: 'agent_feedback_email',
  USER_ROLE: 'agent_feedback_role',
  CURRENT_AGENT: 'agent_feedback_currentAgent',
  EXPANDED_IDS: 'agent_feedback_expandedIds'
};

// ---- 拖曳區設定 ----
export const ZONE_IDS = ['activeFeedbacksZone', 'testingFeedbacksZone', 'completedFeedbacksZone'];

export const ZONE_STATUS_MAP = {
  activeFeedbacksZone: '處理中',
  testingFeedbacksZone: '測試中',
  completedFeedbacksZone: '已解決'
};

export const ZONE_LABEL_MAP = {
  '處理中': '回饋追蹤區',
  '測試中': '測試區',
  '已解決': '完成區'
};

export const ZONE_PLACEHOLDER_LABEL = {
  activeFeedbacksZone: '拖曳至回饋追蹤區',
  testingFeedbacksZone: '拖曳至測試區',
  completedFeedbacksZone: '拖曳至完成區'
};

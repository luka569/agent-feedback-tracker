// ============================================================
// 🔌 後端 API 封裝（取代 google.script.run）
// ============================================================
//
// 用 fetch + Content-Type: text/plain 規避 CORS preflight
// （GAS Web App 不支援 OPTIONS 預檢請求）。
// 後端 doPost 用 JSON.parse(e.postData.contents) 解析。
//
// 用法：
//   import { apiCall } from './api.js';
//   const result = await apiCall('getOptions');
//   const result = await apiCall('addFeedback', { agentId, title, ... });

import { API_URL } from './config.js';

export async function apiCall(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // 通常是 access 權限沒設成「所有人」，回的是 Google 的 HTML 提示頁
    throw new Error('回應非 JSON（請確認 GAS 部署的「誰可以存取」是否為「所有人」）');
  }
}

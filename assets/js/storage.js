// ============================================================
// 💾 SafeStorage — localStorage / sessionStorage 的容錯封裝
// ============================================================
// 在 iframe / 第三方上下文中 localStorage 可能丟例外，所以包一層 try/catch
// 並 fallback 到 window 物件屬性以維持運作。

export const SafeStorage = {
  local: {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return window['_ls_' + k]; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { window['_ls_' + k] = v; } },
    remove: (k) => { try { localStorage.removeItem(k); } catch (e) { delete window['_ls_' + k]; } }
  },
  session: {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return window['_ss_' + k]; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { window['_ss_' + k] = v; } },
    remove: (k) => { try { sessionStorage.removeItem(k); } catch (e) { delete window['_ss_' + k]; } }
  }
};

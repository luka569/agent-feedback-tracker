// ============================================================
// 🔲 側邊欄（收合 / 拖曳分割 / 行動版抽屜）
// ============================================================

export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const resizer = document.getElementById('resizer');
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  toggle.querySelector('.material-icons-round').textContent = isCollapsed ? 'chevron_right' : 'chevron_left';
  toggle.style.left = isCollapsed ? '0' : sidebar.offsetWidth + 'px';
  resizer.style.display = isCollapsed ? 'none' : '';
}

export function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('active');
}

export function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('active');
}

export function initResizer() {
  const resizer = document.getElementById('resizer');
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  if (!resizer || !sidebar) return;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      const newWidth = Math.max(180, Math.min(500, ev.clientX));
      sidebar.style.width = newWidth + 'px';
      toggle.style.left = newWidth + 'px';
    }

    function onUp() {
      resizer.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

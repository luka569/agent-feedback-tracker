// ============================================================
// ✏️ 富文字編輯器 + 圖片上傳 + 圖片控制
// ============================================================

import { state } from './state.js';
import { apiCall } from './api.js';
import { escapeAttr, escapeHtml, showToast } from './utils.js';

export function nextEditorId() {
  state.editorCounter++;
  return 'ed' + state.editorCounter;
}

export function createEditorHtml(eid, placeholder, initialContent, feedbackId) {
  const fbId = feedbackId || '';
  let html = `<div class="rich-editor" id="rich-editor-${eid}" data-feedback-id="${escapeAttr(fbId)}">`;
  html += '<div class="editor-toolbar">';
  html += `<button type="button" onmousedown="event.preventDefault()" onclick="execCmd('${eid}','bold')" title="粗體"><span class="material-icons-round">format_bold</span></button>`;
  html += `<button type="button" onmousedown="event.preventDefault()" onclick="execCmd('${eid}','italic')" title="斜體"><span class="material-icons-round">format_italic</span></button>`;
  html += '<div class="sep"></div>';
  html += `<button type="button" onmousedown="event.preventDefault()" onclick="execCmd('${eid}','insertOrderedList')" title="編號清單"><span class="material-icons-round">format_list_numbered</span></button>`;
  html += `<button type="button" onmousedown="event.preventDefault()" onclick="execCmd('${eid}','insertUnorderedList')" title="項目符號"><span class="material-icons-round">format_list_bulleted</span></button>`;
  html += '<div class="sep"></div>';
  html += `<button type="button" onmousedown="event.preventDefault()" onclick="triggerImageUpload('${eid}')" title="上傳圖片"><span class="material-icons-round">image</span></button>`;
  html += '</div>';
  html += `<div class="editor-content" id="editor-content-${eid}" contenteditable="true" data-placeholder="${escapeAttr(placeholder)}" onpaste="handlePasteOrDropImage(event, '${eid}')" ondrop="handlePasteOrDropImage(event, '${eid}')">${initialContent || ''}</div>`;
  html += `<div class="editor-resize-handle" data-editor-id="${eid}"><span class="material-icons-round">drag_handle</span></div>`;
  html += '</div>';
  return html;
}

export function initEditorResize() {
  document.querySelectorAll('.editor-resize-handle').forEach((handle) => {
    if (handle.dataset.bound) return;
    handle.dataset.bound = 'true';
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const editorContent = document.getElementById('editor-content-' + handle.dataset.editorId);
      if (!editorContent) return;
      const startY = e.clientY;
      const startHeight = editorContent.offsetHeight;
      function onMove(ev) { editorContent.style.height = Math.max(80, startHeight + (ev.clientY - startY)) + 'px'; }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

export function execCmd(eid, command) {
  const editor = document.getElementById('editor-content-' + eid);
  if (editor) editor.focus();
  document.execCommand(command, false, null);
}

export function getEditorContent(eid) {
  const el = document.getElementById('editor-content-' + eid);
  if (!el) return '';
  const html = el.innerHTML.trim();
  if (html === '<br>' || html === '<div><br></div>') return '';
  return html;
}

// ============================================================
// 🖼️ 圖片上傳
// ============================================================

export function triggerImageUpload(eid) {
  state.activeEditorId = eid;
  const editorWrapper = document.getElementById('rich-editor-' + eid);
  state.activeUploadFeedbackId = editorWrapper ? (editorWrapper.dataset.feedbackId || '') : '';
  document.getElementById('globalImageInput').click();
}

export function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    showToast('圖片上傳中...', 'info');
    try {
      const result = await apiCall('uploadImage', {
        base64Data: base64,
        fileName: file.name,
        mimeType: file.type,
        feedbackId: state.activeUploadFeedbackId
      });
      if (result.success) {
        const editor = document.getElementById('editor-content-' + state.activeEditorId);
        if (editor) {
          editor.focus();
          document.execCommand('insertHTML', false,
            `<br><img src="${result.url}" style="max-width:100%;border-radius:8px;margin:8px 0;"><br>`);
        }
        showToast('圖片上傳成功', 'success');
      } else {
        showToast('圖片上傳失敗：' + result.message, 'error');
      }
    } catch (err) {
      showToast('圖片上傳失敗：' + err.message, 'error');
    }
  };
  reader.readAsDataURL(file);
  input.value = '';
}

export function handlePasteOrDropImage(e, eid) {
  const files = [];
  if (e.type === 'paste') {
    const items = (e.clipboardData || window.clipboardData).items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) files.push(items[i].getAsFile());
      }
    }
  } else if (e.type === 'drop') {
    const dragFiles = e.dataTransfer.files;
    if (dragFiles) {
      for (let j = 0; j < dragFiles.length; j++) {
        if (dragFiles[j].type.indexOf('image') === 0) files.push(dragFiles[j]);
      }
    }
  }

  if (files.length === 0) return;

  e.preventDefault();
  const editorWrapper = document.getElementById('rich-editor-' + eid);
  const editorFeedbackId = editorWrapper ? (editorWrapper.dataset.feedbackId || '') : '';
  const file = files[0];
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const base64 = evt.target.result.split(',')[1];
    const editor = document.getElementById('editor-content-' + eid);
    if (editor) editor.focus();

    const tempId = 'img-loading-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
    const placeholderHtml =
      `<span id="${tempId}" style="display:inline-block; padding: 10px; background: rgba(0,0,0,0.05); color: var(--text-muted); border-radius: 8px; font-size: 13px; margin: 8px 0; border: 1px dashed var(--border-glass-hover);">[圖片上傳中...請稍候]</span>`;
    document.execCommand('insertHTML', false, placeholderHtml);
    showToast('貼上圖片上傳中...', 'info');

    try {
      const result = await apiCall('uploadImage', {
        base64Data: base64,
        fileName: file.name || ('pasted-image-' + new Date().getTime() + '.png'),
        mimeType: file.type,
        feedbackId: editorFeedbackId
      });
      const tempSpan = document.getElementById(tempId);
      if (result.success) {
        const imgHtml = `<br><img src="${result.url}" style="max-width:100%;border-radius:8px;margin:8px 0;"><br>`;
        if (tempSpan) {
          tempSpan.outerHTML = imgHtml;
        } else if (editor) {
          editor.focus();
          document.execCommand('insertHTML', false, imgHtml);
        }
        showToast('圖片上傳成功', 'success');
      } else {
        if (tempSpan) tempSpan.outerHTML =
          `<span style="color:var(--danger); font-size: 13px;">[上傳失敗: ${escapeHtml(result.message)}]</span>`;
        showToast('圖片上傳失敗：' + result.message, 'error');
      }
    } catch (err) {
      const tempSpan = document.getElementById(tempId);
      if (tempSpan) tempSpan.outerHTML =
        `<span style="color:var(--danger); font-size: 13px;">[上傳失敗: ${escapeHtml(err.message)}]</span>`;
      showToast('圖片上傳失敗：' + err.message, 'error');
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================
// 🖼️ 圖片控制（隱藏 / 縮放）
// ============================================================

let resizing = null;

export function processContentImages(container) {
  container.querySelectorAll('.content-block-body img').forEach((img) => {
    if (img.closest('.img-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'img-wrapper';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    const hideBtn = document.createElement('button');
    hideBtn.className = 'img-btn-hide';
    hideBtn.title = '隱藏圖片';
    hideBtn.innerHTML = '<span class="material-icons-round">visibility_off</span>';
    hideBtn.onclick = (e) => { e.stopPropagation(); toggleImageHide(wrapper); };
    wrapper.appendChild(hideBtn);

    const handle = document.createElement('div');
    handle.className = 'img-resize-handle';
    handle.addEventListener('mousedown', (e) => startResize(e, img));
    wrapper.appendChild(handle);
  });
}

export function toggleImageHide(wrapper) {
  const img = wrapper.querySelector('img');
  const hideBtn = wrapper.querySelector('.img-btn-hide');
  const handle = wrapper.querySelector('.img-resize-handle');
  if (img.style.display === 'none') {
    img.style.display = 'block';
    if (hideBtn) hideBtn.style.display = '';
    if (handle) handle.style.display = '';
    const ph = wrapper.querySelector('.img-placeholder');
    if (ph) ph.remove();
  } else {
    img.style.display = 'none';
    if (hideBtn) hideBtn.style.display = 'none';
    if (handle) handle.style.display = 'none';
    const ph = document.createElement('div');
    ph.className = 'img-placeholder';
    ph.innerHTML = '<span class="material-icons-round">image</span>顯示圖片';
    ph.onclick = () => toggleImageHide(wrapper);
    wrapper.appendChild(ph);
  }
}

function startResize(e, img) {
  e.preventDefault();
  e.stopPropagation();
  resizing = { img, startX: e.clientX, startWidth: img.offsetWidth };
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

function doResize(e) {
  if (!resizing) return;
  resizing.img.style.width = Math.max(60, resizing.startWidth + (e.clientX - resizing.startX)) + 'px';
  resizing.img.style.maxWidth = '100%';
}

function stopResize() {
  resizing = null;
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
}

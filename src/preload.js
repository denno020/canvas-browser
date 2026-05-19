const { ipcRenderer } = require('electron');

function isInputFocused() {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'option' || active.isContentEditable;
}

function isLinkEvent(e) {
  if (typeof e.composedPath === 'function') {
    for (const el of e.composedPath()) {
      if (el.tagName) {
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'a' || el.hasAttribute('href') || (typeof el.getAttribute === 'function' && el.getAttribute('role') === 'link')) {
          return true;
        }
      }
    }
  } else if (e.target && typeof e.target.closest === 'function') {
    if (e.target.closest('a, [href], [role="link"]')) {
      return true;
    }
  }
  return false;
}

window.addEventListener('mousedown', (e) => {
  if (e.button === 1) {
    if (!isLinkEvent(e)) {
      ipcRenderer.sendToHost('middle-mousedown', {
        clientX: e.clientX,
        clientY: e.clientY
      });
    }
  }
});

// Intercept mouse back/forward clicks
window.addEventListener('mouseup', (e) => {
  // e.button === 3: Browser Back
  // e.button === 4: Browser Forward
  if (e.button === 3) {
    ipcRenderer.sendToHost('go-back');
  } else if (e.button === 4) {
    ipcRenderer.sendToHost('go-forward');
  }
});

// Intercept standard keyboard shortcuts for back/forward and new tab
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    if (!isInputFocused()) {
      ipcRenderer.sendToHost('space-keydown');
      e.preventDefault();
    }
    return;
  }

  const isAlt = e.altKey;
  const isCmd = e.metaKey;
  const isCtrl = e.ctrlKey;
  const isCmdOrCtrl = isCmd || isCtrl;

  if ((isAlt || isCmd) && e.key === 'ArrowLeft') {
    ipcRenderer.sendToHost('go-back');
    e.preventDefault();
  } else if ((isAlt || isCmd) && e.key === 'ArrowRight') {
    ipcRenderer.sendToHost('go-forward');
    e.preventDefault();
  } else if (isCmdOrCtrl && e.key.toLowerCase() === 't') {
    if (e.shiftKey) {
      ipcRenderer.sendToHost('reopen-tab');
    } else {
      ipcRenderer.sendToHost('new-tab');
    }
    e.preventDefault();
  } else if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
    ipcRenderer.sendToHost('close-tab');
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === ' ') {
    ipcRenderer.sendToHost('space-keyup');
  }
});

window.addEventListener('blur', () => {
  ipcRenderer.sendToHost('space-keyup');
});

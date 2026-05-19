// Spatial Canvas Web Browser Renderer Process
const { ipcRenderer } = require('electron');
const path = require('path');

const canvasContainer = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const svgConnections = document.getElementById('svg-connections');
const zoomLevelEl = document.getElementById('zoom-level');
const windowCountEl = document.getElementById('window-count');
const btnFitAll = document.getElementById('btn-fit-all');
const clickModeSelect = document.getElementById('click-mode');

// Application State
let windows = [];
const closedWindows = [];
const closedIdToNewIdMap = new Map();
let nextWindowId = 1;
let maxZIndex = 100;
let defaultSizePreset = localStorage.getItem('default-window-size-preset') || 'dynamic';

function getDefaultDimensions(fallbackW, fallbackH) {
  if (defaultSizePreset === 'dynamic') {
    return { width: fallbackW, height: fallbackH };
  }
  const parts = defaultSizePreset.split('x');
  if (parts.length === 2) {
    const w = parseInt(parts[0]);
    const h = parseInt(parts[1]);
    if (!isNaN(w) && !isNaN(h)) {
      return { width: w, height: h };
    }
  }
  return { width: fallbackW, height: fallbackH };
}

// Canvas Pan & Zoom State
let zoom = 0.8; // Start slightly zoomed out to see the infinite canvas context
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
let startPanX = 0;
let startPanY = 0;
let spacePressed = false;

// Window Dragging & Resizing State
let isDragging = false;
let activeDragWindowId = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartWinX = 0;
let dragStartWinY = 0;

let isResizing = false;
let activeResizeWindowId = null;
let resizeDirection = '';
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWinX = 0;
let resizeStartWinY = 0;
let resizeStartWinW = 0;
let resizeStartWinH = 0;

function updateSpaceState(pressed) {
  spacePressed = pressed;
  if (spacePressed) {
    document.body.classList.add('space-pressed');
    canvasContainer.style.cursor = 'grab';
  } else {
    if (!isPanning) {
      document.body.classList.remove('space-pressed');
      canvasContainer.style.cursor = 'default';
    }
  }
}

window.addEventListener('blur', () => {
  updateSpaceState(false);
});

// Track general keyboard interaction
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    const active = document.activeElement;
    const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (!isInput) {
      updateSpaceState(true);
    }
  }

  // Intercept New Tab, Close Tab, and Reopen Closed Tab shortcuts in the main window
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;
  if (isCmdOrCtrl) {
    const keyLower = e.key.toLowerCase();
    if (keyLower === 't') {
      e.preventDefault();
      if (e.shiftKey) {
        reopenLastClosedWindow();
      } else {
        spawnWindow('about:blank');
      }
    } else if (keyLower === 'w') {
      e.preventDefault();
      const activeWin = windows.find(w => w.element.classList.contains('active'));
      if (activeWin) {
        closeWindow(activeWin.id);
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === ' ') {
    updateSpaceState(false);
  }
});

// Initialize Canvas positioning to center on (25000, 25000)
function initCanvas() {
  const rect = canvasContainer.getBoundingClientRect();
  panX = rect.width / 2 - 25000 * zoom;
  panY = rect.height / 2 - 25000 * zoom;
  updateCanvasTransform();
}

function updateCanvasTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLevelEl.innerText = `${Math.round(zoom * 100)}%`;
}

// Zoom and pan the canvas viewport to fit all windows within the viewport
function fitAll() {
  const rect = canvasContainer.getBoundingClientRect();
  if (windows.length === 0) {
    zoom = 0.8;
    panX = rect.width / 2 - 25000 * zoom;
    panY = rect.height / 2 - 25000 * zoom;
  } else {
    // Compute bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    windows.forEach(w => {
      if (w.x < minX) minX = w.x;
      if (w.x + w.width > maxX) maxX = w.x + w.width;
      if (w.y < minY) minY = w.y;
      if (w.y + w.height > maxY) maxY = w.y + w.height;
    });

    const padding = 80; // 80px padding for safety margin around the bounding box
    const viewW = rect.width;
    const viewH = rect.height;

    if (viewW && viewH) {
      const boundingW = maxX - minX;
      const boundingH = maxY - minY;

      const zoomX = (viewW - padding) / boundingW;
      const zoomY = (viewH - padding) / boundingH;

      // Choose the smaller zoom to fit the entire bounding box
      let targetZoom = Math.min(zoomX, zoomY);
      // Clamp zoom to allowed range [0.15, 3.0]
      targetZoom = Math.max(0.15, Math.min(targetZoom, 3.0));

      zoom = targetZoom;

      const centerX = minX + boundingW / 2;
      const centerY = minY + boundingH / 2;

      panX = viewW / 2 - centerX * zoom;
      panY = viewH / 2 - centerY * zoom;
    }
  }

  canvas.classList.add('smooth-pan');
  updateCanvasTransform();

  setTimeout(() => {
    canvas.classList.remove('smooth-pan');
  }, 600);
}


// Canvas Panning Handlers
canvasContainer.addEventListener('mousedown', (e) => {
  // Middle click (button 1) or Space + Left click (button 0)
  if (e.button === 1 || (e.button === 0 && spacePressed)) {
    if (typeof hideContextMenu === 'function') hideContextMenu();
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    canvasContainer.style.cursor = 'grabbing';
    document.body.classList.add('panning-active');
    e.preventDefault();
  }
});

window.addEventListener('mousemove', (e) => {
  if (isPanning) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panX = startPanX + dx;
    panY = startPanY + dy;
    updateCanvasTransform();
  }
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvasContainer.style.cursor = spacePressed ? 'grab' : 'default';
    document.body.classList.remove('panning-active');
    if (!spacePressed) {
      document.body.classList.remove('space-pressed');
    }
  }
});

// Canvas Zooming Handler (Zoom relative to cursor position)
canvasContainer.addEventListener('wheel', (e) => {
  if (typeof hideContextMenu === 'function') hideContextMenu();
  e.preventDefault();
  
  const zoomFactor = 1.08;
  const oldZoom = zoom;
  
  if (e.deltaY < 0) {
    zoom = Math.min(zoom * zoomFactor, 3.0);
  } else {
    zoom = Math.max(zoom / zoomFactor, 0.15);
  }
  
  const scaleRatio = zoom / oldZoom;
  const rect = canvasContainer.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  panX = mx - (mx - panX) * scaleRatio;
  panY = my - (my - panY) * scaleRatio;
  
  updateCanvasTransform();
}, { passive: false });

// Create SVG connections paths between parent and children
function updateConnections() {
  // Clear all existing connection paths
  const paths = svgConnections.querySelectorAll('.connection-path');
  paths.forEach(p => p.remove());

  windows.forEach(w => {
    if (w.parentId) {
      const parent = windows.find(p => p.id === w.parentId);
      if (parent) {
        // Parent right-edge center
        const x1 = parent.x + parent.width;
        const y1 = parent.y + 24; // Align with the title bar height index
        
        // Child left-edge center
        let x2 = w.x;
        let y2 = w.y + 24; // Align with title bar height index

        // Prevent SVG bounding box collapse (Chromium bug where horizontal/vertical lines with filters disappear)
        if (x1 === x2) x2 += 0.1;
        if (y1 === y2) y2 += 0.1;

        // Horizontal control point distance
        const dx = Math.max(120, Math.abs(x2 - x1) * 0.5);

        // Path definition (Cubic Bezier curve)
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'connection-path');
        svgConnections.appendChild(path);
      }
    }
  });
}

// Bring a window to front and highlight it
function activateWindow(id) {
  let activated = false;
  windows.forEach(w => {
    if (w.id === id) {
      if (!w.element.classList.contains('active')) {
        w.element.classList.add('active');
        activated = true;
      }
      maxZIndex++;
      w.element.style.zIndex = maxZIndex;
    } else {
      w.element.classList.remove('active');
    }
  });

  if (activated) {
    const win = windows.find(w => w.id === id);
    if (win && win.webview) {
      try {
        win.webview.focus();
      } catch (e) {}
    }
  }
}

// Check overlap of window bounds to avoid overlaps
function findFreePosition(startX, startY, w, h) {
  let x = startX;
  let y = startY;
  const margin = 60;
  let collision = true;
  let attempts = 0;

  while (collision && attempts < 100) {
    collision = false;
    for (const win of windows) {
      const overlapX = (x < win.x + win.width + margin) && (x + w + margin > win.x);
      const overlapY = (y < win.y + win.height + margin) && (y + h + margin > win.y);
      if (overlapX && overlapY) {
        collision = true;
        y = win.y + win.height + margin; // cascade downwards below the collided window
        break;
      }
    }
    attempts++;
  }
  return { x, y };
}

// Smoothly scroll the canvas viewport to center on the specified window
function scrollToWindow(winObj) {
  const rect = canvasContainer.getBoundingClientRect();
  const targetCenterX = winObj.x + winObj.width / 2;
  const targetCenterY = winObj.y + winObj.height / 2;

  panX = rect.width / 2 - targetCenterX * zoom;
  panY = rect.height / 2 - targetCenterY * zoom;

  canvas.classList.add('smooth-pan');
  updateCanvasTransform();

  setTimeout(() => {
    canvas.classList.remove('smooth-pan');
    updateConnections();
  }, 600);
}

// Zoom and pan the canvas viewport to fit the entire window perfectly
function fitWindowInViewport(winObj) {
  const rect = canvasContainer.getBoundingClientRect();
  const padding = 80; // 80px padding for safety margin around the window
  const viewW = rect.width;
  const viewH = rect.height;

  if (!viewW || !viewH) return;

  const winW = winObj.width;
  const winH = winObj.height;

  const zoomX = (viewW - padding) / winW;
  const zoomY = (viewH - padding) / winH;

  // Choose the smaller zoom to fit the entire window
  let targetZoom = Math.min(zoomX, zoomY);
  // Clamp zoom to allowed range [0.15, 3.0]
  targetZoom = Math.max(0.15, Math.min(targetZoom, 3.0));

  zoom = targetZoom;

  const centerX = winObj.x + winW / 2;
  const centerY = winObj.y + winH / 2;

  panX = viewW / 2 - centerX * zoom;
  panY = viewH / 2 - centerY * zoom;

  canvas.classList.add('smooth-pan');
  updateCanvasTransform();

  setTimeout(() => {
    canvas.classList.remove('smooth-pan');
  }, 600);
}

// Spawns a new window panel
function spawnWindow(url, parentId = null, restoreState = null) {
  const shouldFocus = !parentId || restoreState;
  let winObj = null;
  const id = nextWindowId++;
  let x = 25000;
  let y = 25000;
  
  // Calculate fallback dynamic default size based on 80% of canvas container height
  const rect = canvasContainer.getBoundingClientRect();
  const fallbackHeight = rect.height ? Math.round(rect.height * 0.8) : 800;
  const fallbackWidth = fallbackHeight;

  let width, height;
  if (restoreState) {
    width = restoreState.width;
    height = restoreState.height;
  } else if (parentId) {
    const parent = windows.find(w => w.id === parentId);
    if (parent) {
      width = parent.width;
      height = parent.height;
    } else {
      const dims = getDefaultDimensions(fallbackWidth, fallbackHeight);
      width = dims.width;
      height = dims.height;
    }
  } else {
    const dims = getDefaultDimensions(fallbackWidth, fallbackHeight);
    width = dims.width;
    height = dims.height;
  }

  if (restoreState) {
    x = restoreState.x;
    y = restoreState.y;
  } else {
    // Determine the reference window: either the specified parent, or the currently active window
    const activeWin = windows.find(w => w.element.classList.contains('active'));
    const parent = parentId ? windows.find(w => w.id === parentId) : null;
    const refWin = parent || activeWin;

    if (refWin) {
      // Spawn to the right of the reference window
      x = refWin.x + refWin.width + 160;
      y = refWin.y;
    } else {
      // If no reference window exists, center in the current viewport space
      const rect = canvasContainer.getBoundingClientRect();
      const viewportCenterX = (rect.width / 2 - panX) / zoom;
      const viewportCenterY = (rect.height / 2 - panY) / zoom;
      x = viewportCenterX - width / 2;
      y = viewportCenterY - height / 2;
    }
  }

  // Adjust coordinates to avoid overlaps if we are not restoring
  if (!restoreState) {
    const freePos = findFreePosition(x, y, width, height);
    x = freePos.x;
    y = freePos.y;
  }

  // Create elements
  const winEl = document.createElement('div');
  winEl.className = 'browser-window';
  winEl.id = `win-${id}`;
  winEl.style.left = `${x}px`;
  winEl.style.top = `${y}px`;
  winEl.style.width = `${width}px`;
  winEl.style.height = `${height}px`;

  // Create Title Bar
  const titleBar = document.createElement('div');
  titleBar.className = 'title-bar';

  // Navigation Buttons
  const navControls = document.createElement('div');
  navControls.className = 'nav-controls';

  const backBtn = document.createElement('button');
  backBtn.className = 'nav-btn';
  backBtn.innerHTML = '←';
  backBtn.disabled = true;

  const forwardBtn = document.createElement('button');
  forwardBtn.className = 'nav-btn';
  forwardBtn.innerHTML = '→';
  forwardBtn.disabled = true;

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'nav-btn';
  refreshBtn.innerHTML = '⟳';

  navControls.appendChild(backBtn);
  navControls.appendChild(forwardBtn);
  navControls.appendChild(refreshBtn);

  // Title Text
  const titleText = document.createElement('span');
  titleText.className = 'window-title';
  titleText.innerText = 'Loading...';
  titleText.style.fontSize = '12px';
  titleText.style.color = '#94a3b8';
  titleText.style.fontWeight = '600';
  titleText.style.maxWidth = '140px';
  titleText.style.overflow = 'hidden';
  titleText.style.textOverflow = 'ellipsis';
  titleText.style.whiteSpace = 'nowrap';
  titleText.style.marginRight = '8px';

  titleBar.appendChild(navControls);
  titleBar.appendChild(titleText);

  // Address Bar
  const addressContainer = document.createElement('div');
  addressContainer.className = 'address-container';

  const addressInput = document.createElement('input');
  addressInput.className = 'address-input';
  addressInput.type = 'text';
  addressInput.value = url === 'about:blank' ? '' : url;
  addressInput.placeholder = 'Search Google or type a URL';

  // Highlight entire URL on click/focus
  let addressInputFocused = false;
  addressInput.addEventListener('mousedown', () => {
    addressInputFocused = (document.activeElement === addressInput);
  });
  addressInput.addEventListener('mouseup', () => {
    if (!addressInputFocused) {
      setTimeout(() => {
        addressInput.select();
      }, 0);
    }
  });
  addressInput.addEventListener('focus', () => {
    activateWindow(id);
    setTimeout(() => {
      addressInput.select();
    }, 0);
  });

  addressContainer.appendChild(addressInput);
  titleBar.appendChild(addressContainer);

  // Close Button
  const actionControls = document.createElement('div');
  actionControls.className = 'action-controls';

  // Preset Size dropdown
  const presetSelect = document.createElement('select');
  presetSelect.className = 'preset-select';
  presetSelect.title = 'Resize Preset';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.text = '📐 Size';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  presetSelect.appendChild(defaultOption);

  const presets = [
    { name: 'Compact Square (600×600)', w: 600, h: 600 },
    { name: 'Standard Square (800×800)', w: 800, h: 800 },
    { name: 'Large Square (1000×1000)', w: 1000, h: 1000 },
    { name: 'Mobile Portrait (390×844)', w: 390, h: 844 },
    { name: 'Narrow Column (600×1000)', w: 600, h: 1000 },
    { name: 'Wide Column (800×1200)', w: 800, h: 1200 },
    { name: 'Tall Reader (1000×1500)', w: 1000, h: 1500 }
  ];

  presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = `${p.w}x${p.h}`;
    opt.text = p.name;
    presetSelect.appendChild(opt);
  });

  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (!val) return;
    const [w, h] = val.split('x').map(Number);
    if (winObj) {
      winObj.width = w;
      winObj.height = h;
      winObj.element.style.width = `${w}px`;
      winObj.element.style.height = `${h}px`;
      if (winObj.badgeElement) {
        winObj.badgeElement.innerText = `${w} × ${h}`;
      }
      updateConnections();
    }
    presetSelect.value = '';
  });

  const fitBtn = document.createElement('button');
  fitBtn.className = 'win-btn win-btn-fit';
  fitBtn.innerHTML = '⛶';
  fitBtn.title = 'Zoom to Fit Window';
  fitBtn.addEventListener('click', () => {
    if (winObj) {
      fitWindowInViewport(winObj);
    }
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'win-btn win-btn-close';
  closeBtn.innerHTML = '✕';

  actionControls.appendChild(presetSelect);
  actionControls.appendChild(fitBtn);
  actionControls.appendChild(closeBtn);
  titleBar.appendChild(actionControls);

  // Webview Container
  const webviewContainer = document.createElement('div');
  webviewContainer.className = 'webview-container';

  // Themed Start Page Overlay for Blank Windows
  const startPage = document.createElement('div');
  startPage.className = 'start-page';
  startPage.innerHTML = `
    <div class="start-page-content">
      <div class="start-page-logo">🪐</div>
      <div class="start-page-title">New Canvas Node</div>
      <div class="start-page-subtitle">Type a URL or search in the address bar above to begin.</div>
    </div>
  `;
  webviewContainer.appendChild(startPage);

  const webview = document.createElement('webview');
  webview.className = 'webview-element';
  webview.src = url;
  webview.preload = path.join(__dirname, 'preload.js');

  const handleNavigationState = (targetUrl) => {
    if (targetUrl && targetUrl !== 'about:blank') {
      startPage.style.display = 'none';
      webview.style.display = 'flex';
    } else {
      startPage.style.display = 'flex';
      webview.style.display = 'none';
    }
  };

  handleNavigationState(url);

  webviewContainer.appendChild(webview);
  winEl.appendChild(titleBar);
  winEl.appendChild(webviewContainer);

  // Dimension Badge
  const badge = document.createElement('div');
  badge.className = 'window-dimensions-badge';
  badge.innerText = `${width} × ${height}`;
  winEl.appendChild(badge);

  // Multi-Directional Resize Handles
  const resizeDirections = ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'];
  resizeDirections.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    winEl.appendChild(handle);

    handle.addEventListener('mousedown', (e) => {
      if (typeof hideContextMenu === 'function') hideContextMenu();
      isResizing = true;
      activeResizeWindowId = id;
      resizeDirection = dir;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeStartWinX = winObj.x;
      resizeStartWinY = winObj.y;
      resizeStartWinW = winObj.width;
      resizeStartWinH = winObj.height;

      winEl.classList.add('resizing');

      document.body.classList.add('interacting');
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Add to canvas
  canvas.appendChild(winEl);

  // Track window object
  winObj = {
    id,
    x,
    y,
    width,
    height,
    parentId,
    element: winEl,
    webview,
    badgeElement: badge
  };
  windows.push(winObj);

  // Add Events
  if (shouldFocus) {
    activateWindow(id);
  }
  updateWindowCount();
  updateConnections();

  // Focus Activation Event
  winEl.addEventListener('mousedown', () => {
    activateWindow(id);
  });

  webview.addEventListener('focus', () => {
    activateWindow(id);
  });

  // Navigation events
  webview.addEventListener('did-navigate', (e) => {
    handleNavigationState(e.url);
    const displayUrl = e.url === 'about:blank' ? '' : e.url;
    if (document.activeElement !== addressInput && addressInput.value !== displayUrl) {
      addressInput.value = displayUrl;
    }
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    handleNavigationState(e.url);
    const displayUrl = e.url === 'about:blank' ? '' : e.url;
    if (document.activeElement !== addressInput && addressInput.value !== displayUrl) {
      addressInput.value = displayUrl;
    }
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
  });

  addressInput.addEventListener('blur', () => {
    try {
      const currentUrl = webview.getURL();
      const displayUrl = currentUrl === 'about:blank' ? '' : currentUrl;
      if (currentUrl && addressInput.value !== displayUrl) {
        addressInput.value = displayUrl;
      }
    } catch (err) {
      // webview might not be ready or getURL fails
    }
  });

  webview.addEventListener('page-title-updated', (e) => {
    titleText.innerText = e.title;
  });

  // Handle IPC messages from preload.js for mouse back/forward and hotkey navigation
  webview.addEventListener('ipc-message', (e) => {
    if (e.channel === 'go-back') {
      if (webview.canGoBack()) webview.goBack();
    } else if (e.channel === 'go-forward') {
      if (webview.canGoForward()) webview.goForward();
    } else if (e.channel === 'new-tab') {
      spawnWindow('about:blank');
    } else if (e.channel === 'reopen-tab') {
      reopenLastClosedWindow();
    } else if (e.channel === 'close-tab') {
      const activeWin = windows.find(w => w.element.classList.contains('active'));
      if (activeWin) {
        closeWindow(activeWin.id);
      }
    } else if (e.channel === 'space-keydown') {
      updateSpaceState(true);
    } else if (e.channel === 'space-keyup') {
      updateSpaceState(false);
    } else if (e.channel === 'middle-mousedown') {
      const { clientX, clientY } = e.args[0];
      const webviewRect = webview.getBoundingClientRect();
      const scaleX = webviewRect.width / webview.clientWidth;
      const scaleY = webviewRect.height / webview.clientHeight;

      isPanning = true;
      startX = webviewRect.left + clientX * scaleX;
      startY = webviewRect.top + clientY * scaleY;
      startPanX = panX;
      startPanY = panY;

      document.body.classList.add('panning-active');
      canvasContainer.style.cursor = 'grabbing';
    }
  });

  // Action listeners
  backBtn.addEventListener('click', () => {
    if (webview.canGoBack()) webview.goBack();
  });

  forwardBtn.addEventListener('click', () => {
    if (webview.canGoForward()) webview.goForward();
  });

  refreshBtn.addEventListener('click', () => {
    webview.reload();
  });

  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      let targetUrl = addressInput.value.trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
          targetUrl = 'https://' + targetUrl;
        } else {
          targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(targetUrl);
        }
      }
      webview.src = targetUrl;
      webview.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    closeWindow(id);
  });

  // Dragging event registration
  titleBar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.nav-btn') || e.target.closest('.address-input') || e.target.closest('.win-btn') || e.target.closest('.preset-select')) {
      return; // prevent dragging if child controls clicked
    }

    if (typeof hideContextMenu === 'function') hideContextMenu();

    isDragging = true;
    activeDragWindowId = id;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartWinX = winObj.x;
    dragStartWinY = winObj.y;
    
    winEl.classList.add('dragging');
    document.body.classList.add('interacting');
    
    e.preventDefault();
  });

  // Resizing event registration handled dynamically on handle creation

  // Webview Tab Spawning Logic
  // Check new-window events for standard _blank link behavior
  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    spawnWindow(e.url, id);
  });

  // Intercept navigation if Link Spawning Mode is active
  webview.addEventListener('will-navigate', (e) => {
    if (clickModeSelect && clickModeSelect.value === 'new-node') {
      const currentUrl = webview.getURL();
      // If navigating to the same URL or it's an initial load, let it pass
      // Otherwise, prevent default navigation and spawn a new window panel
      if (e.url && e.url !== currentUrl && currentUrl !== 'about:blank') {
        e.preventDefault();
        spawnWindow(e.url, id);
      }
    }
  });

  // Automatically pan to center the newly created window if focused
  if (shouldFocus) {
    scrollToWindow(winObj);
  }

  // Force a connection update and SVG redraw shortly after spawning to ensure the link line is visible immediately
  setTimeout(() => {
    updateConnections();
    // Force SVG redraw/reflow
    svgConnections.style.display = 'none';
    svgConnections.offsetHeight;
    svgConnections.style.display = '';
  }, 50);

  // Highlight URL bar automatically for manual new windows (shortcut or main startup)
  if (!parentId && !restoreState) {
    setTimeout(() => {
      addressInput.focus();
      addressInput.select();
    }, 100);
  }

  return winObj;
}

function closeWindow(id, skipHistory = false) {
  const currentWinObj = windows.find(w => w.id === id);
  if (!currentWinObj) return null;

  let currentUrl = currentWinObj.webview.src;
  try {
    currentUrl = currentWinObj.webview.getURL() || currentWinObj.webview.src;
  } catch (e) {
    // webview might not be ready or getURL fails
  }

  const closedData = {
    id: id,
    url: currentUrl,
    x: currentWinObj.x,
    y: currentWinObj.y,
    width: currentWinObj.width,
    height: currentWinObj.height,
    parentId: currentWinObj.parentId
  };

  if (!skipHistory) {
    // Store as an array batch of size 1
    closedWindows.push([closedData]);
  }

  const wasActive = currentWinObj.element.classList.contains('active');

  // Remove window element
  currentWinObj.element.remove();
  windows = windows.filter(w => w.id !== id);
  updateWindowCount();
  updateConnections();

  // If the closed window was active, activate the next one
  if (wasActive && windows.length > 0) {
    let nextActive = null;
    let maxZ = -1;
    windows.forEach(w => {
      const z = parseInt(w.element.style.zIndex) || 0;
      if (z > maxZ) {
        maxZ = z;
        nextActive = w;
      }
    });
    if (nextActive) {
      activateWindow(nextActive.id);
    } else {
      activateWindow(windows[windows.length - 1].id);
    }
  }

  return closedData;
}

// Collect all descendant window IDs recursively (children, grandchildren, …)
function getDescendantIds(rootId) {
  const result = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = windows.filter(w => w.parentId === currentId);
    children.forEach(child => {
      result.push(child.id);
      queue.push(child.id);
    });
  }
  return result;
}

// Close a window and every window in its subtree (branch = root + descendants)
function closeBranch(rootId) {
  const toClose = [rootId, ...getDescendantIds(rootId)];
  const batch = [];
  // Close in reverse so children are removed before parents
  toClose.reverse().forEach(id => {
    const closedObj = closeWindow(id, true);
    if (closedObj) batch.push(closedObj);
  });
  if (batch.length > 0) closedWindows.push(batch);
}

// Close only the descendant windows (children of rootId), leaving rootId open
function closeDescendants(rootId) {
  const toClose = getDescendantIds(rootId);
  const batch = [];
  toClose.reverse().forEach(id => {
    const closedObj = closeWindow(id, true);
    if (closedObj) batch.push(closedObj);
  });
  if (batch.length > 0) closedWindows.push(batch);
}

function reopenLastClosedWindow() {
  if (closedWindows.length === 0) return;
  const batch = closedWindows.pop();
  
  // The batch contains windows in the order they were closed.
  // For branches, children were closed first, then parents.
  // To reopen them correctly, we should spawn parents first, so we reverse the batch.
  const toRestore = Array.isArray(batch) ? [...batch].reverse() : [batch];

  toRestore.forEach(closedWin => {
    // Resolve parentId if the parent was also closed and reopened
    let resolvedParentId = closedWin.parentId;
    if (resolvedParentId && closedIdToNewIdMap.has(resolvedParentId)) {
      resolvedParentId = closedIdToNewIdMap.get(resolvedParentId);
    }
    
    // Spawn the window with the restored state
    const newWin = spawnWindow(closedWin.url, resolvedParentId, closedWin);
    
    if (newWin) {
      // Record the mapping from old ID to new ID
      closedIdToNewIdMap.set(closedWin.id, newWin.id);
      
      // Update any active windows that had the old parent ID
      windows.forEach(w => {
        if (w.parentId === closedWin.id) {
          w.parentId = newWin.id;
        }
      });
    }
  });
  
  // Update connections after healing parentIds
  updateConnections();
}

// ── Custom Context Menu ─────────────────────────────────────────────────────
const contextMenu = document.getElementById('custom-context-menu');
let contextMenuTargetId = null; // window id the menu was opened for (null = canvas)

function showContextMenu(x, y, mode, winId) {
  contextMenuTargetId = winId || null;
  contextMenu.dataset.mode = mode; // 'window' | 'canvas'

  // Grey-out branch/descendants items if there are no children
  const hasChildren = winId !== null && windows.some(w => w.parentId === winId);
  const menuCloseBranch = document.getElementById('menu-close-branch');
  const menuCloseDesc = document.getElementById('menu-close-descendants');
  if (menuCloseBranch) menuCloseBranch.style.opacity = hasChildren ? '1' : '0.35';
  if (menuCloseDesc)   menuCloseDesc.style.opacity   = hasChildren ? '1' : '0.35';

  contextMenu.style.display = 'block';

  // Prevent menu from overflowing off screen
  const menuW = contextMenu.offsetWidth  || 220;
  const menuH = contextMenu.offsetHeight || 200;
  const posX = Math.min(x, window.innerWidth  - menuW - 8);
  const posY = Math.min(y, window.innerHeight - menuH - 8);
  contextMenu.style.left = `${posX}px`;
  contextMenu.style.top  = `${posY}px`;

  // Re-trigger animation
  contextMenu.style.animation = 'none';
  contextMenu.offsetHeight; // reflow
  contextMenu.style.animation = '';
}

function hideContextMenu() {
  contextMenu.style.display = 'none';
  contextMenuTargetId = null;
}

// Wire up context-menu actions
document.getElementById('menu-fit').addEventListener('click', () => {
  if (contextMenuTargetId !== null) {
    const w = windows.find(w => w.id === contextMenuTargetId);
    if (w) fitWindowInViewport(w);
  }
  hideContextMenu();
});

document.getElementById('menu-close').addEventListener('click', () => {
  if (contextMenuTargetId !== null) closeWindow(contextMenuTargetId);
  hideContextMenu();
});

document.getElementById('menu-close-branch').addEventListener('click', () => {
  if (contextMenuTargetId !== null) {
    const hasChildren = windows.some(w => w.parentId === contextMenuTargetId);
    if (hasChildren) closeBranch(contextMenuTargetId);
    else closeWindow(contextMenuTargetId); // no children → just close self
  }
  hideContextMenu();
});

document.getElementById('menu-close-descendants').addEventListener('click', () => {
  if (contextMenuTargetId !== null) {
    const hasChildren = windows.some(w => w.parentId === contextMenuTargetId);
    if (hasChildren) closeDescendants(contextMenuTargetId);
  }
  hideContextMenu();
});

document.getElementById('menu-canvas-new').addEventListener('click', () => {
  spawnWindow('about:blank');
  hideContextMenu();
});

document.getElementById('menu-canvas-reopen').addEventListener('click', () => {
  reopenLastClosedWindow();
  hideContextMenu();
});

document.getElementById('menu-canvas-fit-all').addEventListener('click', () => {
  fitAll();
  hideContextMenu();
});

// Context menu handling
window.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.address-input') || e.target.closest('.webview-element')) {
    return;
  }

  const clickedWindow = e.target.closest('.browser-window');
  if (clickedWindow) {
    e.preventDefault();
    const idAttr = clickedWindow.id;
    const id = parseInt(idAttr.replace('win-', ''));
    showContextMenu(e.clientX, e.clientY, 'window', id);
    return;
  }

  if (e.target.closest('#hud') || e.target.closest('#custom-context-menu')) {
    return;
  }

  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, 'canvas', null);
});

// Dismiss on any outside click or Escape
document.addEventListener('mousedown', (e) => {
  if (contextMenu.style.display !== 'none' && !contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && contextMenu.style.display !== 'none') {
    hideContextMenu();
  }
});

// Global Drag & Resize Mousemove Listeners
window.addEventListener('mousemove', (e) => {
  if (isDragging && activeDragWindowId !== null) {
    const winObj = windows.find(w => w.id === activeDragWindowId);
    if (winObj) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      
      // Calculate canvas-space offsets by scaling by zoom
      const canvasDx = dx / zoom;
      const canvasDy = dy / zoom;

      winObj.x = dragStartWinX + canvasDx;
      winObj.y = dragStartWinY + canvasDy;

      winObj.element.style.left = `${winObj.x}px`;
      winObj.element.style.top = `${winObj.y}px`;

      updateConnections();
    }
  }

  if (isResizing && activeResizeWindowId !== null) {
    const winObj = windows.find(w => w.id === activeResizeWindowId);
    if (winObj) {
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      
      // Scale resizing bounds by zoom
      const canvasDx = dx / zoom;
      const canvasDy = dy / zoom;

      const minW = 300;
      const minH = 200;

      let newW = winObj.width;
      let newH = winObj.height;
      let newX = winObj.x;
      let newY = winObj.y;

      // Resize horizontally
      if (resizeDirection.includes('e')) {
        newW = Math.max(minW, resizeStartWinW + canvasDx);
      } else if (resizeDirection.includes('w')) {
        newW = Math.max(minW, resizeStartWinW - canvasDx);
        newX = resizeStartWinX + (resizeStartWinW - newW);
      }

      // Resize vertically
      if (resizeDirection.includes('s')) {
        newH = Math.max(minH, resizeStartWinH + canvasDy);
      } else if (resizeDirection.includes('n')) {
        newH = Math.max(minH, resizeStartWinH - canvasDy);
        newY = resizeStartWinY + (resizeStartWinH - newH);
      }

      // Update object and DOM style
      winObj.x = newX;
      winObj.y = newY;
      winObj.width = newW;
      winObj.height = newH;

      winObj.element.style.left = `${newX}px`;
      winObj.element.style.top = `${newY}px`;
      winObj.element.style.width = `${newW}px`;
      winObj.element.style.height = `${newH}px`;

      // Update badge text dynamically
      if (winObj.badgeElement) {
        winObj.badgeElement.innerText = `${Math.round(newW)} × ${Math.round(newH)}`;
      }

      updateConnections();
    }
  }
});

window.addEventListener('mouseup', () => {
  if (isDragging && activeDragWindowId !== null) {
    const winObj = windows.find(w => w.id === activeDragWindowId);
    if (winObj) {
      winObj.element.classList.remove('dragging');
    }
    isDragging = false;
    activeDragWindowId = null;
  }

  if (isResizing) {
    if (activeResizeWindowId !== null) {
      const winObj = windows.find(w => w.id === activeResizeWindowId);
      if (winObj) {
        winObj.element.classList.remove('resizing');
      }
    }
    isResizing = false;
    activeResizeWindowId = null;
  }

  document.body.classList.remove('interacting');
});

// Update window count HUD
function updateWindowCount() {
  windowCountEl.innerText = windows.length;
}

// Hook HUD controls
btnFitAll.addEventListener('click', fitAll);

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  initCanvas();

  // Set up settings panel select for default size
  const sizeSelect = document.getElementById('default-size-select');
  if (sizeSelect) {
    sizeSelect.value = defaultSizePreset;
    sizeSelect.addEventListener('change', () => {
      defaultSizePreset = sizeSelect.value;
      localStorage.setItem('default-window-size-preset', defaultSizePreset);
    });
  }

  // Spawn the initial centered window
  spawnWindow('https://en.wikipedia.org');
  fitAll();
});

// IPC Listener to spawn windows from webview actions (middle-click, target="_blank", window.open)
ipcRenderer.on('spawn-spatial-window', (event, data) => {
  let parentId = null;
  const parentWin = windows.find(w => {
    try {
      return w.webview.getWebContentsId() === data.parentWebContentsId;
    } catch (e) {
      return false;
    }
  });
  if (parentWin) {
    parentId = parentWin.id;
  }
  spawnWindow(data.url, parentId);
});

// IPC Listener to close the active tab/window
ipcRenderer.on('close-active-window', () => {
  const activeWin = windows.find(w => w.element.classList.contains('active'));
  if (activeWin) {
    closeWindow(activeWin.id);
  }
});

// IPC Listener to reopen the last closed tab/window
ipcRenderer.on('reopen-last-closed-window', () => {
  reopenLastClosedWindow();
});


const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadLayout(storageKey, defaults) {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem(storageKey) || '{}'),
    };
  } catch (_err) {
    return { ...defaults };
  }
}

function saveLayout(storageKey, layout) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch (_err) {
    // Layout preferences are nice-to-have; never block the app.
  }
}

export function initResizablePanels({
  shell,
  sidebarHandle,
  toolsHandle,
  responseHandle,
  storageKey = 'postboy_panel_layout',
} = {}) {
  if (!shell) return;

  const defaults = {
    sidebarWidth: 320,
    toolsWidth: 320,
    responseHeight: 360,
  };
  const limits = {
    sidebarMin: 240,
    sidebarMax: 460,
    toolsMin: 260,
    toolsMax: 460,
    responseMin: 240,
    responseMax: 620,
  };
  const layout = loadLayout(storageKey, defaults);

  function applyLayout() {
    layout.sidebarWidth = clamp(readNumber(layout.sidebarWidth, defaults.sidebarWidth), limits.sidebarMin, limits.sidebarMax);
    layout.toolsWidth = clamp(readNumber(layout.toolsWidth, defaults.toolsWidth), limits.toolsMin, limits.toolsMax);
    layout.responseHeight = clamp(readNumber(layout.responseHeight, defaults.responseHeight), limits.responseMin, limits.responseMax);
    shell.style.setProperty('--sidebar-width', `${layout.sidebarWidth}px`);
    shell.style.setProperty('--tools-width', `${layout.toolsWidth}px`);
    shell.style.setProperty('--response-height', `${layout.responseHeight}px`);
    sidebarHandle?.setAttribute('aria-valuenow', String(layout.sidebarWidth));
    toolsHandle?.setAttribute('aria-valuenow', String(layout.toolsWidth));
    responseHandle?.setAttribute('aria-valuenow', String(layout.responseHeight));
  }

  function bindHandle(handle, onMove) {
    if (!handle) return;
    handle.addEventListener('pointerdown', (event) => {
      if (window.matchMedia('(max-width: 1180px)').matches && handle !== responseHandle) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      shell.classList.add('is-resizing');
      const start = {
        x: event.clientX,
        y: event.clientY,
        sidebarWidth: readNumber(layout.sidebarWidth, defaults.sidebarWidth),
        toolsWidth: readNumber(layout.toolsWidth, defaults.toolsWidth),
        responseHeight: readNumber(layout.responseHeight, defaults.responseHeight),
      };

      function move(moveEvent) {
        onMove(moveEvent, start);
        applyLayout();
      }

      function stop() {
        shell.classList.remove('is-resizing');
        saveLayout(storageKey, layout);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
      }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    });
  }

  bindHandle(sidebarHandle, (event, start) => {
    layout.sidebarWidth = clamp(start.sidebarWidth + event.clientX - start.x, limits.sidebarMin, limits.sidebarMax);
  });

  bindHandle(toolsHandle, (event, start) => {
    layout.toolsWidth = clamp(start.toolsWidth - (event.clientX - start.x), limits.toolsMin, limits.toolsMax);
  });

  bindHandle(responseHandle, (event, start) => {
    layout.responseHeight = clamp(start.responseHeight - (event.clientY - start.y), limits.responseMin, Math.min(limits.responseMax, window.innerHeight - 260));
  });

  function bindKeyboard(handle, property, min, max, direction = 1) {
    if (!handle) return;
    handle.setAttribute('aria-valuemin', String(min));
    handle.setAttribute('aria-valuemax', String(max));
    handle.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 40 : 16;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      layout[property] = clamp(readNumber(layout[property], defaults[property]) + (positive ? step : -step) * direction, min, max);
      applyLayout();
      saveLayout(storageKey, layout);
    });
  }

  bindKeyboard(sidebarHandle, 'sidebarWidth', limits.sidebarMin, limits.sidebarMax);
  bindKeyboard(toolsHandle, 'toolsWidth', limits.toolsMin, limits.toolsMax, -1);
  bindKeyboard(responseHandle, 'responseHeight', limits.responseMin, limits.responseMax, -1);

  applyLayout();
}

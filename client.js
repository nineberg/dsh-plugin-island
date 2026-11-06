// Plugin Island — a Dynamic-Island-style plugin launcher for the Harness Web UI.
//
// Browser half. Registers one occupant into the root-scoped `shell.overlay`
// slot: a compact pill floating above the frame. Every plugin panel that is
// collapsed into a small sidebar icon (the live `sidebar.panellist`
// registrations) can be dragged into the island; docked chips reopen their
// panel through `ctx.layout.selectPanel`. The docked set and the island
// position persist in localStorage.
//
// Layout: up to five docked chips, an ellipsis button (full docked list in
// a popover), and a plus button (undocked panels in a compact popover).
// The pill never expands on hover; it is freely draggable.
window.__ModuleLoader__.load({
  id: '@local/plugin-island',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const OVERLAY_SLOT = 'shell.overlay';
    const PANEL_LIST_SLOT = 'sidebar.panellist';
    const STORE_KEY = 'dsh.plugin-island.v1';
    const POS_KEY = 'dsh.plugin-island.pos.v1';
    const MIME = 'application/x-dsh-plugin-island';
    const MAX_VISIBLE_CHIPS = 5;

    const STRINGS = {
      en: {
        regionLabel: 'Plugin Island',
        dockEmpty: 'Drag plugin icons here',
        dockHint: 'Drop plugin icons here to dock them in the island.',
        allDocked: 'Docked panels',
        availableTitle: 'Add to island',
        availableEmpty: 'Every panel is already docked.',
        remove: 'Remove from island',
        open: 'Open {name}',
        add: 'Dock {name} in island',
        dragOutHint: 'Drag a docked icon out of the island to remove it.',
        more: 'All docked panels',
        fallbackConversation: 'Conversation',
        fallbackPlugins: 'Plugins',
        moveIsland: 'Drag to move the island',
      },
      zh: {
        regionLabel: '插件灵动岛',
        dockEmpty: '把插件图标拖到这里',
        dockHint: '把插件图标拖进灵动岛即可收纳。',
        allDocked: '已收纳的面板',
        availableTitle: '加入灵动岛',
        availableEmpty: '所有面板都已在岛中。',
        remove: '移出灵动岛',
        open: '打开{name}',
        add: '将{name}收进灵动岛',
        dragOutHint: '把已收进的图标拖出灵动岛即可移除。',
        more: '全部已收纳面板',
        fallbackConversation: '会话',
        fallbackPlugins: '插件',
        moveIsland: '拖动移动灵动岛',
      },
    };

    function fmt(template, values) {
      return template.replace(/\{(\w+)\b/g, (m, k) =>
        values && values[k] !== undefined ? String(values[k]) : m,
      );
    }

    function resolveSlotLabel(options) {
      const label = options && options.label;
      if (typeof label === 'function') {
        try {
          const value = label();
          return typeof value === 'string' ? value : undefined;
        } catch {
          return undefined;
        }
      }
      return typeof label === 'string' ? label : undefined;
    }

    // ---- Original stroke glyphs. Strokes follow currentColor so the host
    // ---- theme (label-primary/secondary) drives their appearance.
    function glyphProps(size) {
      return {
        width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true,
        style: { display: 'block' },
      };
    }
    function GlyphChat(size) {
      return h('svg', { ...glyphProps(size), fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinejoin: 'round' },
        h('path', { d: 'M4.5 6.2a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-6.7l-4.8 3.8v-3.8h-.5a2 2 0 0 1-2-2z' }));
    }
    function GlyphGrid(size) {
      return h('svg', { ...glyphProps(size), fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinejoin: 'round' },
        h('rect', { x: 4, y: 4, width: 6.5, height: 6.5, rx: 1.6 }),
        h('rect', { x: 13.5, y: 4, width: 6.5, height: 6.5, rx: 1.6 }),
        h('rect', { x: 4, y: 13.5, width: 6.5, height: 6.5, rx: 1.6 }),
        h('rect', { x: 13.5, y: 13.5, width: 6.5, height: 6.5, rx: 1.6 }));
    }
    function GlyphPlug(size) {
      return h('svg', { ...glyphProps(size), fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M9 2.8v4.4M15 2.8v4.4' }),
        h('path', { d: 'M6 7.2h12v3.6a6 6 0 0 1-12 0z' }),
        h('path', { d: 'M12 16.8v4.4' }));
    }
    function glyphFor(id) {
      if (id === 'conversation') return GlyphChat;
      if (id === 'plugins') return GlyphGrid;
      return GlyphPlug;
    }

    /** Render a panel's own registered icon component when available. */
    function PanelIcon(panel, size) {
      const Icon = panel && panel.Icon
      if (Icon) {
        try {
          return h(Icon, { size });
        } catch {
          /* fall back to the generic glyph */
        }
      }
      const Glyph = glyphFor(panel ? panel.id : '');
      return h(Glyph, size);
    }

    const CSS = [
      '.dsw-pli-root{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(var(--dsh-frame-top-clearance,0px),0px) + 10px);z-index:60;pointer-events:none;}',
      '.dsw-pli-island{pointer-events:auto;box-sizing:border-box;min-width:64px;max-width:min(480px,calc(100vw - 32px));background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:19px;padding:6px 8px 7px;box-shadow:0 10px 32px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:border-radius .25s cubic-bezier(.2,.8,.2,1),box-shadow .2s,border-color .15s;cursor:grab;touch-action:none;}',
      '.dsw-pli-root:hover .dsw-pli-island,.dsw-pli-root:focus-within .dsw-pli-island{border-radius:22px;}',
      '.dsw-pli-island[data-dragover="true"]{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent);}',
      '.dsw-pli-dock{display:flex;align-items:center;gap:5px;min-height:32px;overflow:hidden;}',
      '.dsw-pli-empty{font-size:12px;color:var(--dsw-alias-label-secondary);padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dsw-pli-chip{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:grab;padding:0;user-select:none;-webkit-user-select:none;}',
      '.dsw-pli-chip:hover,.dsw-pli-chip:focus-visible{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);outline:none;}',
      '.dsw-pli-chip:active{cursor:grabbing;}',
      '.dsw-pli-chip[data-standalone="true"]{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2);}',
      '.dsw-pli-chip[data-standalone="true"]:hover,.dsw-pli-chip[data-standalone="true"]:focus-visible{background:var(--dsw-alias-bg-layer-2);}',
      '.dsw-pli-chip[data-dropside]::before{content:"";position:absolute;left:-4px;top:6px;bottom:6px;width:2.5px;border-radius:2px;background:var(--dsw-alias-brand-primary);}',
      '.dsw-pli-x{position:absolute;top:-5px;right:-5px;display:none;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;cursor:pointer;padding:0;}',
      '.dsw-pli-chip:hover .dsw-pli-x,.dsw-pli-x:focus-visible{display:inline-flex;}',
      '.dsw-pli-btn{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer;padding:0;user-select:none;-webkit-user-select:none;}',
      '.dsw-pli-btn:hover,.dsw-pli-btn:focus-visible{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);outline:none;}',
      '.dsw-pli-btn[data-open="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);}',
      '.dsw-pli-pop{position:absolute;top:calc(100% + 8px);right:0;width:236px;max-height:224px;overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:0 10px 28px rgba(0,0,0,.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:6px;z-index:5;}',
      '.dsw-pli-pop-head{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin:6px 10px 4px;white-space:nowrap;}',
      '.dsw-pli-row{display:flex;align-items:center;gap:8px;width:100%;border:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;text-align:left;border-radius:999px;padding:6px 10px;cursor:pointer;user-select:none;-webkit-user-select:none;}',
      '.dsw-pli-row:hover,.dsw-pli-row:focus-visible{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);outline:none;}',
      '.dsw-pli-row-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsw-pli-row-x{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;cursor:pointer;padding:0;}',
      '.dsw-pli-row-x:hover{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);}',
      '.dsw-pli-empty2{font-size:12px;color:var(--dsw-alias-label-secondary);padding:8px;white-space:nowrap;}',
    ].join('\n');

    function readLocaleId(ctx) {
      try {
        const snap = ctx.locale.getLocale();
        const raw = snap && (snap.id ?? snap.locale ?? snap.language ?? snap.name);
        if (typeof raw === 'string' && raw) return raw.toLowerCase().startsWith('zh') ? 'zh' : 'en';
      } catch { /* fall through */ }
      return 'en';
    }

    function createIsland(ctx) {
      const localeState = { id: readLocaleId(ctx) };

      function tr() {
        const dict = STRINGS[localeState.id] || STRINGS.en;
        return dict;
      }

      function pickIconComponent(entry) {
        if (!entry) return null;
        const candidates = [entry.component, entry.render, entry.Content, entry.options && entry.options.icon];
        for (const candidate of candidates) {
          if (typeof candidate === 'function') return candidate;
          if (candidate && typeof candidate === 'object' && typeof candidate.type !== 'undefined') return candidate;
        }
        return null;
      }

      function readPanels() {
        let entries = [];
        try {
          const list = ctx.slots.entries(PANEL_LIST_SLOT);
          if (Array.isArray(list)) entries = list;
        } catch { /* fall back below */ }
        const seen = new Set();
        const out = [];
        for (const entry of entries) {
          const options = entry && entry.options;
          if (!options) continue;
          const id = options.id;
          if (typeof id !== 'string' || !id || seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            order: typeof options.order === 'number' ? options.order : 100,
            label: resolveSlotLabel(options),
            Icon: pickIconComponent(entry),
            // Panels may declare that dragging them out of the island
            // tears them off into a standalone floating widget.
            standalone: options.islandStandalone === true,
          });
        }
        out.sort((a, b) => a.order - b.order);
        if (out.length === 0) {
          // Static fallback so the island stays useful even when the panel
          // list slot cannot be read: the two shipped global panels.
          out.push({ id: 'conversation', order: 0, label: undefined, Icon: null });
          out.push({ id: 'plugins', order: 1, label: undefined, Icon: null });
        }
        return out;
      }

      function readPinned() {
        try {
          const raw = window.localStorage.getItem(STORE_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
        } catch { /* ignore */ }
        return [];
      }

      function readIslandPos() {
        try {
          const raw = window.localStorage.getItem(POS_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
        } catch { /* ignore */ }
        return null;
      }

      function writeIslandPos(point) {
        try { window.localStorage.setItem(POS_KEY, JSON.stringify(point)); } catch { /* ignore */ }
      }

      function clampIslandPos(x, y, width, height) {
        const margin = 8;
        return {
          x: Math.min(Math.max(x, margin), Math.max(margin, window.innerWidth - width - margin)),
          y: Math.min(Math.max(y, margin), Math.max(margin, window.innerHeight - height - margin)),
        };
      }

      function openPanel(id) {
        try {
          if (ctx.layout && typeof ctx.layout.selectPanel === 'function') ctx.layout.selectPanel(id);
        } catch { /* unknown panel id: selectPanel throws and keeps the current panel */ }
      }

      function readPayload(event) {
        try {
          const raw = event.dataTransfer.getData(MIME) || event.dataTransfer.getData('text/plain');
          if (!raw) return null;
          const data = JSON.parse(raw);
          if (data && (data.from === 'palette' || data.from === 'dock') && typeof data.id === 'string') return data;
        } catch { /* not ours */ }
        return null;
      }

      function labelOf(panel, t) {
        if (panel.label) return panel.label;
        if (panel.id === 'conversation') return t.fallbackConversation;
        if (panel.id === 'plugins') return t.fallbackPlugins;
        return panel.id;
      }

      function Island() {
        const islandRef = React.useRef(null);
        const rootRef = React.useRef(null);
        const [panels, setPanels] = React.useState(readPanels);
        const [pinned, setPinned] = React.useState(readPinned);
        const [dragOver, setDragOver] = React.useState(false);
        const [dropSide, setDropSide] = React.useState(null);
        const [popover, setPopover] = React.useState('none'); // 'none' | 'more' | 'add'
        const [pos, setPos] = React.useState(readIslandPos);
        const [, setLocaleTick] = React.useState(0);

        React.useEffect(() => {
          const offs = [];
          try {
            if (ctx.slots && typeof ctx.slots.subscribe === 'function') {
              offs.push(ctx.slots.subscribe(PANEL_LIST_SLOT, () => setPanels(readPanels())));
            }
          } catch { /* optional */ }
          try {
            if (ctx.locale && typeof ctx.locale.subscribe === 'function') {
              offs.push(ctx.locale.subscribe(() => {
                localeState.id = readLocaleId(ctx);
                setLocaleTick((n) => n + 1);
              }));
            }
          } catch { /* optional */ }
          return () => { for (const off of offs) { try { off(); } catch { /* gone */ } } };
        }, []);

        React.useEffect(() => {
          try { window.localStorage.setItem(STORE_KEY, JSON.stringify(pinned)); } catch { /* ignore */ }
        }, [pinned]);

        // Close the popover when clicking anywhere outside the island.
        React.useEffect(() => {
          const onDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) setPopover('none');
          };
          document.addEventListener('mousedown', onDown);
          return () => document.removeEventListener('mousedown', onDown);
        }, []);

        const t = tr();
        const panelsById = new Map(panels.map((p) => [p.id, p]));
        const dockedPanels = pinned.filter((id) => panelsById.has(id)).map((id) => panelsById.get(id));
        const availablePanels = panels.filter((p) => !pinned.includes(p.id));

        function addPinned(id) {
          setPinned((prev) => (prev.includes(id) ? prev : prev.concat(id)));
        }
        function insertPinnedBefore(id, beforeId) {
          setPinned((prev) => {
            const rest = prev.filter((x) => x !== id);
            const at = rest.indexOf(beforeId);
            if (at < 0) return rest.concat(id);
            return rest.slice(0, at).concat(id, rest.slice(at));
          });
        }
        function removePinned(id) {
          setPinned((prev) => prev.filter((x) => x !== id));
        }

        /** Pointer drag on the pill body moves the whole island. */
        function beginMove(event) {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          const root = rootRef.current;
          if (!root) return;
          const handle = event.currentTarget;
          const rect = root.getBoundingClientRect();
          const offsetX = event.clientX - rect.left;
          const offsetY = event.clientY - rect.top;
          let last = null;
          try { handle.setPointerCapture(event.pointerId); } catch { /* best-effort */ }
          document.body.style.userSelect = 'none';
          const move = (moveEvent) => {
            last = clampIslandPos(
              moveEvent.clientX - offsetX,
              moveEvent.clientY - offsetY,
              root.offsetWidth,
              root.offsetHeight,
            );
            setPos(last);
          };
          const finish = (finishEvent) => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', finish);
            handle.removeEventListener('pointercancel', finish);
            try {
              if (finishEvent && finishEvent.pointerId !== undefined) handle.releasePointerCapture(finishEvent.pointerId);
            } catch { /* already released */ }
            document.body.style.userSelect = '';
            if (last) writeIslandPos(last);
          };
          handle.addEventListener('pointermove', move);
          handle.addEventListener('pointerup', finish);
          handle.addEventListener('pointercancel', finish);
        }

        function dockDragOver(event) {
          const types = event.dataTransfer && Array.from(event.dataTransfer.types || []);
          if (!types.includes(MIME) && !types.includes('text/plain')) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragOver(true);
        }
        function islandDragLeave(event) {
          const to = event.relatedTarget;
          if (islandRef.current && to && typeof to.nodeType === 'number' && islandRef.current.contains(to)) return;
          setDragOver(false);
          setDropSide(null);
        }
        function islandDrop(event) {
          setDragOver(false);
          setDropSide(null);
          const payload = readPayload(event);
          if (!payload) return;
          event.preventDefault();
          if (payload.from === 'palette') addPinned(payload.id);
          else insertPinnedBefore(payload.id, null);
        }
        function chipDrop(event, beforeId) {
          event.stopPropagation();
          setDragOver(false);
          setDropSide(null);
          const payload = readPayload(event);
          if (!payload) return;
          event.preventDefault();
          insertPinnedBefore(payload.id, beforeId);
        }

        function DockChip(panel) {
          const label = labelOf(panel, t);
          const payload = JSON.stringify({ from: 'dock', id: panel.id });
          return h('div', {
            key: panel.id,
            className: 'dsw-pli-chip',
            role: 'button',
            tabIndex: 0,
            'aria-label': fmt(t.open, { name: label }),
            title: label,
            draggable: true,
            'data-dropside': dropSide === panel.id ? 'left' : undefined,
            'data-standalone': panel.standalone ? 'true' : undefined,
            onPointerDown(event) { event.stopPropagation(); },
            onDragStart(event) {
              event.dataTransfer.setData(MIME, payload);
              event.dataTransfer.setData('text/plain', payload);
              event.dataTransfer.effectAllowed = 'copyMove';
            },
            onDragEnd(event) {
              // Dropped outside the island (and not a cancelled 0,0 drag):
              // dragging a docked icon out of the island removes it. The
              // eject broadcast lets the owning plugin react — e.g. tear
              // off into its own floating widget at the drop point.
              if (event.clientX === 0 && event.clientY === 0) return;
              let inside = true;
              try {
                const el = document.elementFromPoint(event.clientX, event.clientY);
                inside = !!(el && islandRef.current && islandRef.current.contains(el));
              } catch { /* keep */ }
              if (!inside) {
                removePinned(panel.id);
                try {
                  window.dispatchEvent(new CustomEvent('plugin-island:eject', {
                    detail: { id: panel.id, x: event.clientX, y: event.clientY },
                  }));
                } catch { /* CustomEvent unavailable */ }
              }
            },
            onDragOver(event) { dockDragOver(event); setDropSide(panel.id); },
            onDragLeave(event) { if (dropSide === panel.id) setDropSide(null); },
            onDrop(event) { chipDrop(event, panel.id); },
            onClick() { openPanel(panel.id); },
            onKeyDown(event) {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPanel(panel.id); }
            },
          },
            PanelIcon(panel, 17),
            h('button', {
              className: 'dsw-pli-x',
              type: 'button',
              'aria-label': fmt(t.remove, {}),
              title: t.remove,
              draggable: false,
              onClick(event) { event.stopPropagation(); removePinned(panel.id); },
            }, '×'));
        }

        function MoreRow(panel) {
          const label = labelOf(panel, t);
          return h('div', {
            key: panel.id,
            style: { display: 'flex', alignItems: 'center', gap: 6 },
          },
            h('button', {
              className: 'dsw-pli-row',
              type: 'button',
              title: label,
              onPointerDown(event) { event.stopPropagation(); },
              onClick() { setPopover('none'); openPanel(panel.id); },
            },
              h('span', { style: { display: 'inline-flex', color: 'var(--dsw-alias-label-secondary)' } }, PanelIcon(panel, 16)),
              h('span', { className: 'dsw-pli-row-label' }, label)),
            h('button', {
              className: 'dsw-pli-row-x',
              type: 'button',
              'aria-label': fmt(t.remove, {}),
              title: t.remove,
              onPointerDown(event) { event.stopPropagation(); },
              onClick() { removePinned(panel.id); },
            }, '×'));
        }

        function AddRow(panel) {
          const label = labelOf(panel, t);
          return h('button', {
            key: panel.id,
            className: 'dsw-pli-row',
            type: 'button',
            title: label,
            onPointerDown(event) { event.stopPropagation(); },
            onClick() { addPinned(panel.id); },
          },
            h('span', { style: { display: 'inline-flex', color: 'var(--dsw-alias-label-secondary)' } }, PanelIcon(panel, 16)),
            h('span', { className: 'dsw-pli-row-label' }, label),
            h('span', { style: { flex: 'none', color: 'var(--dsw-alias-label-secondary)', fontSize: 14, lineHeight: 1 } }, '+'));
        }

        const visibleChips = dockedPanels.slice(0, MAX_VISIBLE_CHIPS);
        const hasOverflow = dockedPanels.length > MAX_VISIBLE_CHIPS;

        const rootStyle = pos
          ? { left: pos.x, top: pos.y, transform: 'none' }
          : undefined;

        return h('div', { className: 'dsw-pli-root', ref: rootRef, style: rootStyle },
          h('style', null, CSS),
          h('div', {
            className: 'dsw-pli-island',
            ref: islandRef,
            role: 'region',
            'aria-label': t.regionLabel,
            title: t.moveIsland,
            'data-dragover': dragOver ? 'true' : undefined,
            style: { position: 'relative' },
            onPointerDown: beginMove,
            onDragOver: dockDragOver,
            onDragLeave: islandDragLeave,
            onDrop: islandDrop,
            onKeyDown(event) { if (event.key === 'Escape') setPopover('none'); },
          },
            h('div', { className: 'dsw-pli-dock', 'data-droppable': 'true' },
              dockedPanels.length === 0
                ? h('span', { className: 'dsw-pli-empty' }, t.dockEmpty)
                : visibleChips.map(DockChip),
              hasOverflow
                ? h('button', {
                    className: 'dsw-pli-btn',
                    type: 'button',
                    'aria-label': t.more,
                    title: t.more,
                    'data-open': popover === 'more' ? 'true' : undefined,
                    onPointerDown(event) { event.stopPropagation(); },
                    onClick() { setPopover((p) => (p === 'more' ? 'none' : 'more')); },
                  }, '⋯')
                : null,
              h('button', {
                className: 'dsw-pli-btn',
                type: 'button',
                'aria-label': t.availableTitle,
                title: t.availableTitle,
                'data-open': popover === 'add' ? 'true' : undefined,
                onPointerDown(event) { event.stopPropagation(); },
                onClick() { setPopover((p) => (p === 'add' ? 'none' : 'add')); },
              }, '+'),
            ),
            popover === 'more'
              ? h('div', { className: 'dsw-pli-pop' },
                  h('div', { className: 'dsw-pli-pop-head' }, `${t.allDocked} (${dockedPanels.length})`),
                  dockedPanels.map(MoreRow))
              : null,
            popover === 'add'
              ? h('div', { className: 'dsw-pli-pop' },
                  h('div', { className: 'dsw-pli-pop-head' }, t.availableTitle),
                  availablePanels.length === 0
                    ? h('div', { className: 'dsw-pli-empty2' }, t.availableEmpty)
                    : availablePanels.map(AddRow),
                  h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', padding: '6px 8px 2px', borderTop: '1px solid var(--dsw-alias-border-l1)', marginTop: 4 } }, t.dragOutHint))
              : null,
          ),
        );
      }

      return Island;
    }

    return {
      inject: ['slots', 'layout', 'locale'],
      apply(ctx) {
        const Island = createIsland(ctx);
        ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
          name: OVERLAY_SLOT,
          id: 'plugin-island',
          order: 10,
          label: () => (readLocaleId(ctx) === 'zh' ? '插件灵动岛' : 'Plugin Island'),
        }, Island));
      },
    };
  },
});

(() => {
  const KEY = 66;
  const ROWS = ["qwertyuiop", "asdfghjkl'", "zxcvbnm-"];
  const SIDE = ["Backspace", "Numbers and symbols", "Change language"];
  const NAMES = { "'": "Single Quote", "-": "Dash" };
  const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];
  const SIDE_COLUMN = 10;

  const layout = [];
  ROWS.forEach((row, r) => [...row].forEach((ch, c) => layout.push({ name: NAMES[ch] || ch, col: c, row: r })));
  SIDE.forEach((name, r) => layout.push({ name, col: SIDE_COLUMN, row: r }));

  const label = el => {
    const key = el.tagName === "YT-KEYBOARD-KEY" ? el : el.querySelector("yt-keyboard-key");
    return key ? key.getAttribute("aria-label") : null;
  };

  const move = (el, dx, dy) => {
    const value = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
    if (el.style.transform !== value) el.style.transform = value;
  };

  let state = null;

  const arrange = keyboard => {
    const grid = keyboard.querySelector("yt-keyboard-key-grid");
    const list = keyboard.querySelector("yt-keyboard-key-list");
    if (!grid) return (state = null);

    const containers = [...grid.querySelectorAll("yt-keyboard-key-container")];
    const byLabel = new Map(containers.map(c => [label(c), c]));

    if (!LETTERS.every(letter => byLabel.has(letter))) {
      containers.forEach(c => move(c, 0, 0));
      if (list) move(list, 0, 0);
      return (state = null);
    }

    const originX = Math.min(...containers.map(c => c.offsetLeft));
    const originY = Math.min(...containers.map(c => c.offsetTop));
    layout.forEach(({ name, col, row }) => {
      const container = byLabel.get(name);
      if (container) move(container, originX + col * KEY - container.offsetLeft, originY + row * KEY - container.offsetTop);
    });
    if (list) move(list, 0, -KEY);

    state = { byLabel, bottom: list ? [...list.querySelectorAll("yt-keyboard-key")] : [] };
  };

  const cellOf = name => layout.find(cell => cell.name === name);

  const keyAt = (col, row) => {
    const rowCells = layout.filter(cell => cell.row === row);
    const exact = rowCells.find(cell => cell.col === col);
    if (exact) return exact;
    if (col === SIDE_COLUMN) return null;
    return rowCells.filter(cell => cell.col < SIDE_COLUMN).pop();
  };

  const focusKey = name => {
    const container = state.byLabel.get(name);
    const key = container && container.querySelector("yt-keyboard-key");
    if (key) key.focus();
    return !!key;
  };

  const target = (current, direction) => {
    const bottomIndex = state.bottom.indexOf(current);
    if (bottomIndex !== -1) {
      if (direction !== "ArrowUp") return null;
      return { key: keyAt([1, 4, 6][bottomIndex] ?? 6, ROWS.length - 1).name };
    }

    const cell = cellOf(label(current));
    if (!cell) return null;
    const lastRow = ROWS.length - 1;

    if (direction === "ArrowLeft") {
      if (cell.col === SIDE_COLUMN) return { key: keyAt(ROWS[cell.row].length - 1, cell.row).name };
      return cell.col === 0 ? null : { key: keyAt(cell.col - 1, cell.row).name };
    }
    if (direction === "ArrowRight") {
      if (cell.col === SIDE_COLUMN) return null;
      const next = layout.find(c => c.row === cell.row && c.col === cell.col + 1);
      return { key: (next || keyAt(SIDE_COLUMN, cell.row)).name };
    }
    if (direction === "ArrowUp") return cell.row === 0 ? null : { key: keyAt(cell.col, cell.row - 1).name };
    if (direction === "ArrowDown") {
      if (cell.row === lastRow) return { bottom: cell.col <= 2 ? 0 : cell.col <= 5 ? 1 : 2 };
      const below = keyAt(cell.col, cell.row + 1);
      return below ? { key: below.name } : null;
    }
    return null;
  };

  document.addEventListener("keydown", event => {
    if (!state || !event.key.startsWith("Arrow")) return;
    const current = document.activeElement;
    if (!current || current.tagName !== "YT-KEYBOARD-KEY") return;
    const next = target(current, event.key);
    if (!next) return;
    const moved = next.bottom !== undefined ? (state.bottom[next.bottom] && (state.bottom[next.bottom].focus(), true)) : focusKey(next.key);
    if (moved) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const methods = obj => {
    const names = new Set();
    for (let o = obj; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) Object.getOwnPropertyNames(o).forEach(n => names.add(n));
    return [...names];
  };

  const panel = document.createElement("pre");
  panel.style.cssText = "position:fixed;left:0;top:450px;width:1900px;height:540px;margin:0;padding:8px;background:rgba(0,0,0,.92);color:#0f0;font:14px/16px monospace;z-index:2147483646;overflow:hidden;white-space:pre-wrap;pointer-events:none";
  document.documentElement.appendChild(panel);

  const fakeKey = (target, type, keyCode, key) => {
    const event = new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true });
    Object.defineProperty(event, "keyCode", { get: () => keyCode });
    Object.defineProperty(event, "which", { get: () => keyCode });
    target.dispatchEvent(event);
  };

  document.addEventListener("keydown", event => {
    const code = event.keyCode;
    if (code === 227 || code === 412) {
      const key = state.byLabel.get("z").querySelector("yt-keyboard-key");
      key.focus();
      setTimeout(() => {
        fakeKey(key, "keydown", 13, "Enter");
        fakeKey(key, "keyup", 13, "Enter");
        window.qwertyTest = "fake enter on z";
      }, 100);
      event.stopImmediatePropagation();
    }
    if (code === 228 || code === 417) {
      const kb = document.querySelector("ytlr-search-keyboard");
      const labels = () => [...kb.querySelectorAll("yt-keyboard-key")].map(k => `${k.getAttribute("aria-label")}|${k.textContent.trim()}`).join("  ");
      const before = labels();
      const num = state.byLabel.get("Numbers and symbols").querySelector("yt-keyboard-key");
      num.focus();
      setTimeout(() => {
        fakeKey(num, "keydown", 13, "Enter");
        fakeKey(num, "keyup", 13, "Enter");
        setTimeout(() => {
          panel.textContent = ["LETTERS:", before, "SYMBOLS:", labels(), "active: " + (document.activeElement && document.activeElement.getAttribute("aria-label"))].join(String.fromCharCode(10, 10));
        }, 800);
      }, 100);
      event.stopImmediatePropagation();
    }
  }, true);

  const badge = document.createElement("div");
  badge.style.cssText = "position:fixed;right:20px;bottom:20px;background:#06c;color:#fff;font:28px sans-serif;padding:8px 14px;z-index:2147483647";
  document.documentElement.appendChild(badge);

  setInterval(() => {
    const keyboard = document.querySelector("ytlr-search-keyboard");
    if (keyboard) arrange(keyboard);
    const active = document.activeElement;
    const zylon = document.querySelector("yt-keyboard-key.zylon-focus");
    const box = document.querySelector("ytlr-search-text-box");
    badge.textContent = `dom: ${active && label(active)} | zylon: ${zylon && label(zylon)} | text: ${box && box.textContent.trim()} | ${window.qwertyTest || ''}`;
  }, 300);
})();

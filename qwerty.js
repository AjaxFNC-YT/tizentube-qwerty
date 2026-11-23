(() => {
  const UNIT = 66;
  const ROWS = [
    { keys: "qwertyuiop", offset: 0 },
    { keys: "asdfghjkl", offset: 0.5 },
    { keys: "zxcvbnm-'", offset: 1 },
  ];
  const SIDE = ["Backspace", "Numbers and symbols", "Change language"];
  const SIDE_OFFSET = 10.25;
  const NAMES = { "'": "Single Quote", "-": "Dash" };
  const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];
  const LAYOUT_KEYS = ["Numbers and symbols", "Letters"];
  const PASS_THROUGH = ["Numbers and symbols", "Letters", "Change language"];

  let state = null;
  let cursor = 0;
  let lastText = "";
  let busy = false;
  let caret = null;
  const arrows = {};

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  const keyOf = el => (el.tagName === "YT-KEYBOARD-KEY" ? el : el.querySelector("yt-keyboard-key"));
  const labelOf = el => {
    const key = keyOf(el);
    return key ? key.getAttribute("aria-label") || key.textContent.trim().toUpperCase() : null;
  };
  const charOf = key => {
    const label = labelOf(key);
    if (label === "SPACE") return " ";
    const text = key.textContent.trim();
    return text.length === 1 ? text.toLowerCase() : null;
  };

  const translate = (el, dx, dy) => {
    const value = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
    if (el.style.transform !== value) el.style.transform = value;
  };

  const textNode = () => {
    const box = document.querySelector("ytlr-search-text-box");
    if (!box) return null;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent.trim()) return node;
    return null;
  };

  const isPlaceholder = node => {
    const color = getComputedStyle(node.parentElement).color.match(/[\d.]+/g) || [];
    return color.length === 4 && Number(color[3]) < 0.6;
  };

  const currentText = () => {
    const node = textNode();
    if (!node || isPlaceholder(node)) return "";
    return node.textContent.replace(/ /g, " ");
  };

  const makeArrow = (name, points) => {
    const button = document.createElement("div");
    button.tabIndex = -1;
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", name === "left" ? "Move cursor left" : "Move cursor right");
    button.style.cssText = "position:absolute;width:54px;height:54px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;outline:none";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    Object.entries({ width: 28, height: 28, viewBox: "0 0 24 24" }).forEach(([k, v]) => svg.setAttribute(k, v));
    Object.entries({ d: points, fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }).forEach(([k, v]) => path.setAttribute(k, v));
    svg.appendChild(path);
    button.appendChild(svg);
    button.addEventListener("focus", () => {
      button.style.background = "#f1f1f1";
      button.style.color = "#0f0f0f";
    });
    button.addEventListener("blur", () => {
      button.style.background = "transparent";
      button.style.color = "#aaa";
    });
    return button;
  };

  const ensureArrows = keyboard => {
    if (!arrows.left) {
      arrows.left = makeArrow("left", "M15 5 L8 12 L15 19");
      arrows.right = makeArrow("right", "M9 5 L16 12 L9 19");
    }
    [arrows.left, arrows.right].forEach(button => {
      if (button.parentElement !== keyboard) keyboard.appendChild(button);
      button.style.display = "flex";
    });
  };

  const hideArrows = () => [arrows.left, arrows.right].forEach(button => button && (button.style.display = "none"));

  const arrange = keyboard => {
    const grid = keyboard.querySelector("yt-keyboard-key-grid");
    const list = keyboard.querySelector("yt-keyboard-key-list");
    if (!grid) return (state = null);

    const containers = [...grid.querySelectorAll("yt-keyboard-key-container")];
    const byLabel = new Map(containers.map(c => [labelOf(c), c]));
    const bottom = list ? [...list.querySelectorAll("yt-keyboard-key")] : [];
    const originX = Math.min(...containers.map(c => c.offsetLeft));
    const originY = Math.min(...containers.map(c => c.offsetTop));
    const items = [];

    if (!LETTERS.every(letter => byLabel.has(letter))) {
      containers.forEach(c => translate(c, 0, 0));
      if (list) translate(list, 0, 0);
      hideArrows();
      state = { byLabel, bottom, items: null, keyboard };
      return;
    }

    const place = (container, x, row) => {
      if (!container) return;
      translate(container, originX + x - container.offsetLeft, originY + row * UNIT - container.offsetTop);
      items.push({ el: keyOf(container), x: x + container.offsetWidth / 2, row });
    };

    ROWS.forEach(({ keys, offset }, row) => [...keys].forEach((ch, i) => place(byLabel.get(NAMES[ch] || ch), (offset + i) * UNIT, row)));
    SIDE.forEach((name, row) => place(byLabel.get(name), SIDE_OFFSET * UNIT, row));

    ensureArrows(keyboard);
    const bottomY = originY + ROWS.length * UNIT;
    [arrows.left, arrows.right].forEach((button, i) => {
      button.style.left = `${originX + i * UNIT + 6}px`;
      button.style.top = `${bottomY + 6}px`;
      items.push({ el: button, x: i * UNIT + UNIT / 2, row: ROWS.length });
    });

    if (list) {
      const listX = 2.25 * UNIT;
      const first = list.querySelector("yt-keyboard-key-container");
      const firstLeft = first ? first.offsetLeft : 0;
      translate(list, originX + listX - list.offsetLeft - firstLeft, bottomY - list.offsetTop);
      bottom.forEach(key => {
        const container = key.parentElement;
        items.push({ el: key, x: listX + container.offsetLeft - firstLeft + container.offsetWidth / 2, row: ROWS.length });
      });
    }

    state = { byLabel, bottom, items, keyboard };
  };

  const nearest = (candidates, x) => candidates.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0] || null;

  const neighbour = (current, direction) => {
    const from = state.items.find(item => item.el === current);
    if (!from) return null;
    if (direction === "ArrowLeft" || direction === "ArrowRight") {
      const sign = direction === "ArrowRight" ? 1 : -1;
      return nearest(state.items.filter(item => item.row === from.row && (item.x - from.x) * sign > 0), from.x);
    }
    const row = from.row + (direction === "ArrowDown" ? 1 : -1);
    return nearest(state.items.filter(item => item.row === row), from.x);
  };

  const handOff = (current, direction) => {
    const from = state.items.find(item => item.el === current);
    if (!from) return;
    if (direction === "ArrowDown") {
      if (state.bottom[0]) state.bottom[0].focus();
      return;
    }
    const anchors = { ArrowLeft: ["a", "h", "o", "v"], ArrowUp: ["d"] };
    const names = anchors[direction];
    if (!names) return;
    const container = state.byLabel.get(names[Math.min(from.row, names.length - 1)]);
    if (container) keyOf(container).focus();
  };

  const fakeKey = (target, type, keyCode, key) => {
    const event = new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true });
    Object.defineProperty(event, "keyCode", { get: () => keyCode });
    Object.defineProperty(event, "which", { get: () => keyCode });
    target.dispatchEvent(event);
  };

  const refresh = () => {
    const keyboard = document.querySelector("ytlr-search-keyboard");
    if (keyboard) arrange(keyboard);
  };

  const findKey = ch => {
    if (ch === " ") return state.bottom.find(key => labelOf(key) === "SPACE");
    for (const container of state.byLabel.values()) {
      const key = keyOf(container);
      if (key && charOf(key) === ch) return key;
    }
    return null;
  };

  const findLabel = label => {
    const container = state.byLabel.get(label);
    return container ? keyOf(container) : null;
  };

  const press = async (locate, changesText = true) => {
    refresh();
    const key = locate();
    if (!key || !key.__instance || typeof key.__instance.onSelect !== "function") return false;
    const before = currentText();
    try {
      key.__instance.onSelect({ type: "click", target: key, currentTarget: key, stopPropagation() {}, preventDefault() {} });
    } catch (e) {
      return false;
    }
    for (let i = 0; i < 30 && changesText && currentText() === before; i++) await wait(20);
    await wait(changesText ? 30 : 250);
    return true;
  };

  const switchLayout = async () => {
    const toggle = LAYOUT_KEYS.find(name => state.byLabel.has(name));
    if (!toggle || !(await press(() => findLabel(toggle), false))) return false;
    refresh();
    return true;
  };

  const typeChar = async ch => {
    refresh();
    if (!findKey(ch) && !(await switchLayout())) return false;
    return press(() => findKey(ch));
  };

  const typable = text => [...text].every(ch => /[a-z0-9 &#()@!?:.\-_"\/$%+\[\]']/.test(ch));

  const rewrite = async target => {
    for (let step = 0; step < target.length * 3 + 40; step++) {
      const text = currentText();
      if (text === target) return true;
      const ok = target.startsWith(text) ? await typeChar(target[text.length]) : await press(() => findLabel("Backspace"));
      if (!ok) return false;
    }
    return false;
  };

  const edit = async (insert, origin) => {
    const text = currentText();
    const tail = text.slice(cursor);
    const head = insert === null ? text.slice(0, cursor - 1) : text.slice(0, cursor) + insert;
    if (!typable(head + tail)) {
      cursor = text.length;
      return false;
    }
    const label = labelOf(origin);
    const wasLetters = !!state.items;
    busy = true;
    try {
      const done = await rewrite(head + tail);
      if (!!state.items !== wasLetters) await switchLayout();
      cursor = done ? head.length : currentText().length;
      lastText = currentText();
    } finally {
      const restore = () => {
        refresh();
        const back = [...state.byLabel.values()].map(keyOf).concat(state.bottom).find(key => key && labelOf(key) === label);
        const target = back || origin;
        if (document.activeElement !== target) target.focus();
        syncHighlight();
      };
      for (const delay of [150, 200, 300]) {
        await wait(delay);
        restore();
      }
      busy = false;
    }
    return true;
  };

  const drawCaret = () => {
    if (!caret) {
      caret = document.createElement("div");
      caret.style.cssText = "position:fixed;width:3px;background:#3ea6ff;border-radius:2px;z-index:2147483647;pointer-events:none;animation:qwerty-blink 1s steps(1) infinite";
      const style = document.createElement("style");
      style.textContent = "@keyframes qwerty-blink{50%{opacity:0}}";
      document.documentElement.appendChild(style);
      document.documentElement.appendChild(caret);
    }
    const node = textNode();
    const text = currentText();
    if (!state || !node || !text || cursor >= text.length) {
      caret.style.display = "none";
      return;
    }
    const range = document.createRange();
    range.setStart(node, cursor);
    range.setEnd(node, cursor + 1);
    const rect = range.getBoundingClientRect();
    caret.style.display = "block";
    caret.style.left = `${rect.left - 2}px`;
    caret.style.top = `${rect.top}px`;
    caret.style.height = `${rect.height}px`;
  };

  const moveCursor = step => {
    cursor = Math.min(Math.max(0, cursor + step), currentText().length);
    drawCaret();
  };

  const paint = (key, styles) => {
    Object.entries(styles).forEach(([name, value]) => {
      if (key.style.getPropertyValue(name) === value) return;
      if (value) key.style.setProperty(name, value, "important");
      else key.style.removeProperty(name);
    });
  };

  const syncHighlight = () => {
    if (!state) return;
    const active = document.activeElement;
    const onArrow = active === arrows.left || active === arrows.right;
    const onKey = !!active && active.tagName === "YT-KEYBOARD-KEY" && state.keyboard.contains(active);
    state.keyboard.querySelectorAll("yt-keyboard-key").forEach(key => {
      if ((onArrow || onKey) && key === active) {
        paint(key, { "background-color": "#f1f1f1", color: "#0f0f0f", "border-radius": "8px" });
      } else if ((onArrow || onKey) && key.classList.contains("zylon-focus")) {
        paint(key, { "background-color": "transparent", color: "#aaa", "border-radius": "" });
      } else {
        paint(key, { "background-color": "", color: "", "border-radius": "" });
      }
    });
  };

  const swallow = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onKey = event => {
    if (!event.isTrusted || !state) return;
    const current = document.activeElement;
    const onArrow = !!current && (current === arrows.left || current === arrows.right);
    const inKeyboard = onArrow || (!!current && state.keyboard.contains(current));

    if (busy) {
      if (inKeyboard) swallow(event);
      return;
    }

    if (!inKeyboard) return;

    if (event.key.startsWith("Arrow") && state.items) {
      if (event.type !== "keydown") {
        if (onArrow) swallow(event);
        return;
      }
      const next = neighbour(current, event.key);
      if (next) {
        next.el.focus();
        syncHighlight();
        swallow(event);
      } else if (event.key === "ArrowRight") {
        swallow(event);
      } else {
        handOff(current, event.key);
      }
      return;
    }

    if (event.key !== "Enter" && event.keyCode !== 13) return;

    if (onArrow) {
      if (event.type === "keydown") moveCursor(current === arrows.left ? -1 : 1);
      swallow(event);
      return;
    }

    const label = labelOf(current);
    const text = currentText();
    if (cursor >= text.length || PASS_THROUGH.includes(label) || label === "SEARCH" || label === "CLEAR") return;

    const isBackspace = label === "Backspace";
    const insert = isBackspace ? null : charOf(current);
    if (!isBackspace && insert === null) return;

    swallow(event);
    if (event.type !== "keydown" || (isBackspace && cursor === 0)) return;
    edit(insert, current);
  };

  document.addEventListener("keydown", onKey, true);
  document.addEventListener("keyup", onKey, true);

  setInterval(() => {
    const keyboard = document.querySelector("ytlr-search-keyboard");
    if (!keyboard) {
      state = null;
      if (caret) caret.style.display = "none";
      return;
    }
    if (busy) return;
    arrange(keyboard);
    syncHighlight();
    const text = currentText();
    if (text !== lastText) {
      if (cursor >= lastText.length || cursor > text.length) cursor = text.length;
      lastText = text;
    }
    drawCaret();
  }, 200);
})();

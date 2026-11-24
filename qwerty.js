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
  const ARROW_CODES = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  const EXIT_ANCHORS = { ArrowLeft: ["a", "h", "o", "v"], ArrowUp: ["d"], ArrowDown: ["SPACE"] };

  let state = null;
  let intended = null;
  let cursor = 0;
  let lastText = "";
  let queue = Promise.resolve();
  let pending = 0;
  let caret = null;
  const arrows = {};

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const enqueue = task => {
    pending++;
    queue = queue.then(task).catch(() => {}).then(() => pending--);
  };

  const keyOf = el => (el.tagName === "YT-KEYBOARD-KEY" ? el : el.querySelector("yt-keyboard-key"));
  const labelOf = el => {
    if (!el) return null;
    if (el === arrows.left || el === arrows.right) return el.getAttribute("aria-label");
    const key = keyOf(el);
    return key ? key.getAttribute("aria-label") || key.textContent.trim().toUpperCase() : null;
  };
  const charOf = key => {
    if (labelOf(key) === "SPACE") return " ";
    const text = key.textContent.trim();
    return text.length === 1 ? text.toLowerCase() : null;
  };
  const isArrow = el => !!el && (el === arrows.left || el === arrows.right);

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

  const makeArrow = (label, points) => {
    const button = document.createElement("div");
    button.setAttribute("aria-label", label);
    button.style.cssText = "position:absolute;width:54px;height:54px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    Object.entries({ width: 28, height: 28, viewBox: "0 0 24 24" }).forEach(([k, v]) => svg.setAttribute(k, v));
    Object.entries({ d: points, fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }).forEach(([k, v]) => path.setAttribute(k, v));
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  };

  const showArrows = (keyboard, visible) => {
    if (!arrows.left) {
      arrows.left = makeArrow("Cursor left", "M15 5 L8 12 L15 19");
      arrows.right = makeArrow("Cursor right", "M9 5 L16 12 L9 19");
    }
    [arrows.left, arrows.right].forEach(button => {
      if (visible && button.parentElement !== keyboard) keyboard.appendChild(button);
      button.style.display = visible ? "flex" : "none";
    });
  };

  const arrange = keyboard => {
    const grid = keyboard.querySelector("yt-keyboard-key-grid");
    const list = keyboard.querySelector("yt-keyboard-key-list");
    if (!grid) return (state = null);

    const containers = [...grid.querySelectorAll("yt-keyboard-key-container")];
    const byLabel = new Map(containers.map(c => [labelOf(c), c]));
    const bottom = list ? [...list.querySelectorAll("yt-keyboard-key")] : [];
    bottom.forEach(key => byLabel.set(labelOf(key), key.parentElement));
    const originX = Math.min(...containers.map(c => c.offsetLeft));
    const originY = Math.min(...containers.map(c => c.offsetTop));
    const letters = LETTERS.every(letter => byLabel.has(letter));
    const items = [];

    if (!letters) {
      containers.forEach(c => translate(c, 0, 0));
      if (list) translate(list, 0, 0);
      showArrows(keyboard, false);
      state = { keyboard, byLabel, bottom, items: null };
      return;
    }

    const place = (container, x, row) => {
      if (!container) return;
      translate(container, originX + x - container.offsetLeft, originY + row * UNIT - container.offsetTop);
      items.push({ el: keyOf(container), x: x + container.offsetWidth / 2, row });
    };

    ROWS.forEach(({ keys, offset }, row) => [...keys].forEach((ch, i) => place(byLabel.get(NAMES[ch] || ch), (offset + i) * UNIT, row)));
    SIDE.forEach((name, row) => place(byLabel.get(name), SIDE_OFFSET * UNIT, row));

    showArrows(keyboard, true);
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

    state = { keyboard, byLabel, bottom, items };
  };

  const refresh = () => {
    const keyboard = document.querySelector("ytlr-search-keyboard");
    if (keyboard) arrange(keyboard);
    else state = null;
  };

  const findLabel = label => {
    const container = state && state.byLabel.get(label);
    return container ? keyOf(container) : null;
  };

  const resolve = el => {
    if (!el || isArrow(el) || el.isConnected) return el;
    return findLabel(labelOf(el));
  };

  const ytFocused = () => (state ? state.keyboard.querySelector("yt-keyboard-key.zylon-focus") : null);

  const home = key => {
    const container = key.parentElement;
    const list = container.closest("yt-keyboard-key-list");
    const x = container.offsetLeft + container.offsetWidth / 2 + (list ? list.offsetLeft : 0);
    const y = container.offsetTop + container.offsetHeight / 2 + (list ? list.offsetTop : 0);
    return { x, y };
  };

  const fakeKey = (target, type, keyCode, key) => {
    const event = new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true });
    Object.defineProperty(event, "keyCode", { get: () => keyCode });
    Object.defineProperty(event, "which", { get: () => keyCode });
    target.dispatchEvent(event);
  };

  const sendArrow = async direction => {
    const target = document.activeElement || document.body;
    const before = ytFocused();
    fakeKey(target, "keydown", ARROW_CODES[direction], direction);
    fakeKey(target, "keyup", ARROW_CODES[direction], direction);
    for (let i = 0; i < 15 && ytFocused() === before; i++) await wait(15);
    return ytFocused() !== before;
  };

  const moveTo = async target => {
    for (let step = 0; step < 24; step++) {
      refresh();
      const goal = resolve(target);
      const current = ytFocused();
      if (!goal || !current || current === goal) return current === goal;
      const from = home(current);
      const to = home(goal);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const vertical = Math.abs(dy) > 20 ? (dy > 0 ? "ArrowDown" : "ArrowUp") : null;
      const horizontal = Math.abs(dx) > 20 ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : null;
      if (await sendArrow(vertical || horizontal)) continue;
      if (!vertical || !horizontal || !(await sendArrow(horizontal))) return false;
    }
    return false;
  };

  const select = async key => {
    refresh();
    const live = resolve(key);
    if (!live || !live.__instance || typeof live.__instance.onSelect !== "function") return false;
    const before = currentText();
    live.__instance.onSelect({ type: "click", target: live, currentTarget: live, stopPropagation() {}, preventDefault() {} });
    for (let i = 0; i < 30 && currentText() === before; i++) await wait(15);
    await wait(30);
    return true;
  };

  const findChar = ch => {
    if (ch === " ") return findLabel("SPACE");
    for (const container of state.byLabel.values()) {
      const key = keyOf(container);
      if (key && charOf(key) === ch) return key;
    }
    return null;
  };

  const switchLayout = async () => {
    const toggle = LAYOUT_KEYS.find(name => state.byLabel.has(name));
    if (!toggle) return false;
    await select(findLabel(toggle));
    await wait(250);
    refresh();
    return true;
  };

  const typeChar = async ch => {
    refresh();
    if (!findChar(ch) && !(await switchLayout())) return false;
    const key = findChar(ch);
    return key ? select(key) : false;
  };

  const typable = text => [...text].every(ch => /[a-z0-9 &#()@!?:.\-_"\/$%+\[\]']/.test(ch));

  const rewrite = async target => {
    for (let step = 0; step < target.length * 3 + 40; step++) {
      const text = currentText();
      if (text === target) return true;
      const ok = target.startsWith(text) ? await typeChar(target[text.length]) : await select(findLabel("Backspace"));
      if (!ok) return false;
    }
    return false;
  };

  const edit = async (insert, origin) => {
    const text = currentText();
    const head = insert === null ? text.slice(0, Math.max(0, cursor - 1)) : text.slice(0, cursor) + insert;
    const tail = text.slice(cursor);
    if (!typable(head + tail)) {
      cursor = text.length;
      return;
    }
    const wasLetters = !!state.items;
    const done = await rewrite(head + tail);
    refresh();
    if (!!state.items !== wasLetters) await switchLayout();
    cursor = done ? head.length : currentText().length;
    lastText = currentText();
    await moveTo(origin);
  };

  const neighbour = (from, direction) => {
    const item = state.items.find(entry => entry.el === from);
    if (!item) return null;
    const nearest = list => list.sort((a, b) => Math.abs(a.x - item.x) - Math.abs(b.x - item.x))[0] || null;
    if (direction === "ArrowLeft" || direction === "ArrowRight") {
      const sign = direction === "ArrowRight" ? 1 : -1;
      return nearest(state.items.filter(entry => entry.row === item.row && (entry.x - item.x) * sign > 0));
    }
    const row = item.row + (direction === "ArrowDown" ? 1 : -1);
    return nearest(state.items.filter(entry => entry.row === row));
  };

  const exitAnchor = (from, direction) => {
    const names = EXIT_ANCHORS[direction];
    if (!names) return null;
    const item = state.items.find(entry => entry.el === from);
    const row = item ? Math.min(item.row, names.length - 1) : 0;
    return findLabel(names[row]);
  };

  const parkFor = el => (isArrow(el) ? findLabel("SPACE") : el);

  const paint = (el, styles) => {
    Object.entries(styles).forEach(([name, value]) => {
      if (el.style.getPropertyValue(name) === value) return;
      if (value) el.style.setProperty(name, value, "important");
      else el.style.removeProperty(name);
    });
  };

  const ON = { "background-color": "#f1f1f1", color: "#0f0f0f", "border-radius": "8px" };
  const OFF = { "background-color": "transparent", color: "#aaa", "border-radius": "" };
  const OFF_BOTTOM = { "background-color": "rgba(255, 255, 255, 0.1)", color: "#aaa", "border-radius": "" };
  const CLEAR = { "background-color": "", color: "", "border-radius": "" };

  const syncHighlight = () => {
    if (!state) return;
    const target = state.items ? resolve(intended) : null;
    state.keyboard.querySelectorAll("yt-keyboard-key").forEach(key => {
      if (!target) paint(key, CLEAR);
      else if (key === target) paint(key, ON);
      else if (key.classList.contains("zylon-focus")) paint(key, state.bottom.includes(key) ? OFF_BOTTOM : OFF);
      else paint(key, CLEAR);
    });
    [arrows.left, arrows.right].forEach(button => button && paint(button, button === target ? ON : OFF));
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

  const swallow = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const activate = async target => {
    if (isArrow(target)) {
      moveCursor(target === arrows.left ? -1 : 1);
      return;
    }
    const key = resolve(target);
    if (!key) return;
    const label = labelOf(key);
    const text = currentText();
    const editable = cursor < text.length && (label === "Backspace" || charOf(key) !== null);
    if (editable) {
      if (label === "Backspace" && cursor === 0) return;
      await edit(label === "Backspace" ? null : charOf(key), key);
      return;
    }
    await moveTo(key);
    await select(key);
    refresh();
    if (state && state.items && !resolve(intended)) intended = ytFocused();
  };

  const onKey = event => {
    if (!event.isTrusted) return;
    refresh();
    if (!state) return;

    const focusInside = state.keyboard.contains(document.activeElement);
    if (!focusInside && !pending) {
      intended = null;
      return;
    }
    if (!intended || !state.items) intended = ytFocused() || intended;
    if (!intended) return;

    const isEnter = event.key === "Enter" || event.keyCode === 13;
    const isArrowKey = event.key in ARROW_CODES;
    if (!isEnter && !isArrowKey) return;

    if (!state.items) {
      if (isEnter && cursor < currentText().length) {
        swallow(event);
        if (event.type === "keydown") enqueue(() => activate(ytFocused()));
      }
      return;
    }

    swallow(event);
    if (event.type !== "keydown") return;

    if (isEnter) {
      const target = intended;
      enqueue(() => activate(target));
      return;
    }

    const next = neighbour(resolve(intended), event.key);
    if (next) {
      intended = next.el;
      syncHighlight();
      const park = parkFor(next.el);
      enqueue(() => moveTo(park));
      return;
    }

    const anchor = exitAnchor(resolve(intended), event.key);
    if (!anchor) return;
    const direction = event.key;
    intended = null;
    syncHighlight();
    enqueue(async () => {
      await moveTo(anchor);
      await sendArrow(direction);
    });
  };

  const probePanel = document.createElement("pre");
  probePanel.style.cssText = "position:fixed;left:0;top:480px;width:1920px;height:600px;margin:0;padding:6px;background:rgba(0,0,0,.93);color:#0f0;font:14px/16px monospace;z-index:2147483647;pointer-events:none;white-space:pre-wrap;overflow:hidden";
  document.documentElement.appendChild(probePanel);
  const describeProps = (name, el) => {
    if (!el || !el.__instance) return `${name}: none`;
    const props = el.__instance.props || {};
    const entries = Object.keys(props).map(k => {
      const v = props[k];
      const t = typeof v;
      if (t === "function") return `${k}()`;
      if (t === "string") return `${k}="${v.slice(0, 30)}"`;
      if (v && t === "object") return `${k}{${Object.keys(v).slice(0, 8).join(",")}}`;
      return `${k}=${v}`;
    });
    return `${name}: ${entries.join("  ")}`;
  };
  setInterval(() => {
    const kb = document.querySelector("ytlr-search-keyboard");
    if (!kb) return;
    probePanel.textContent = [
      describeProps("keyboard", kb),
      describeProps("key", kb.querySelector("yt-keyboard-key")),
      describeProps("textbox", document.querySelector("ytlr-search-text-box")),
      describeProps("bar", document.querySelector("ytlr-search-bar")),
      describeProps("page", document.querySelector("ytlr-classic-search-page")),
      describeProps("container", document.querySelector("ytlr-search-container")),
    ].join(String.fromCharCode(10, 10));
  }, 1000);

  ["keydown", "keyup", "keypress"].forEach(type => window.addEventListener(type, onKey, true));

  setInterval(() => {
    refresh();
    if (!state) {
      intended = null;
      if (caret) caret.style.display = "none";
      return;
    }
    if (!pending) {
      if (!state.keyboard.contains(document.activeElement)) intended = null;
      else if (!state.items || !resolve(intended)) intended = ytFocused();
    }
    syncHighlight();
    const text = currentText();
    if (text !== lastText) {
      if (cursor >= lastText.length || cursor > text.length) cursor = text.length;
      lastText = text;
    }
    drawCaret();
  }, 150);
})();

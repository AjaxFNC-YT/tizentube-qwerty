(() => {
  const KEY = 66;
  const ROWS = ["qwertyuiop", "asdfghjkl'", "zxcvbnm-"];
  const SIDE = ["Backspace", "Numbers and symbols", "Change language"];
  const NAMES = { "'": "Single Quote", "-": "Dash" };
  const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];

  const label = container => {
    const key = container.querySelector("yt-keyboard-key");
    return key ? key.getAttribute("aria-label") : null;
  };

  const move = (el, dx, dy) => {
    const value = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
    if (el.style.transform !== value) el.style.transform = value;
  };

  const arrange = keyboard => {
    const grid = keyboard.querySelector("yt-keyboard-key-grid");
    const list = keyboard.querySelector("yt-keyboard-key-list");
    if (!grid) return;

    const containers = [...grid.querySelectorAll("yt-keyboard-key-container")];
    const byLabel = new Map(containers.map(c => [label(c), c]));
    const isLetters = LETTERS.every(letter => byLabel.has(letter));

    if (!isLetters) {
      containers.forEach(c => move(c, 0, 0));
      if (list) move(list, 0, 0);
      return;
    }

    const originX = Math.min(...containers.map(c => c.offsetLeft));
    const originY = Math.min(...containers.map(c => c.offsetTop));
    const place = (container, column, row) => {
      if (!container) return;
      move(container, originX + column * KEY - container.offsetLeft, originY + row * KEY - container.offsetTop);
    };

    ROWS.forEach((row, r) => [...row].forEach((ch, c) => place(byLabel.get(NAMES[ch] || ch), c, r)));
    SIDE.forEach((name, r) => place(byLabel.get(name), 10, r));
    if (list) move(list, 0, -KEY);
  };

  const badge = document.createElement("div");
  badge.style.cssText = "position:fixed;right:20px;bottom:20px;background:#06c;color:#fff;font:28px sans-serif;padding:8px 14px;z-index:2147483647";
  document.documentElement.appendChild(badge);

  setInterval(() => {
    const keyboard = document.querySelector("ytlr-search-keyboard");
    if (keyboard) arrange(keyboard);
    const active = document.querySelector("yt-keyboard-key.zylon-focus, yt-keyboard-key:focus");
    badge.textContent = `focus: ${active ? active.getAttribute("aria-label") : "-"}`;
  }, 300);
})();

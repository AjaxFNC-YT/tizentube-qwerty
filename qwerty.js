(() => {
  const panel = document.createElement("pre");
  panel.style.cssText = "position:fixed;left:0;top:0;width:1920px;height:1080px;margin:0;padding:8px;background:rgba(0,0,0,.92);color:#0f0;font:13px/15px monospace;z-index:2147483647;overflow:hidden;white-space:pre-wrap;pointer-events:none;display:none";
  document.documentElement.appendChild(panel);

  const describe = (el, depth, out) => {
    if (out.length > 140 || depth > 14) return;
    const cls = typeof el.className === "string" ? el.className.split(" ").filter(Boolean).slice(0, 3).join(".") : "";
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join("").slice(0, 24);
    const attrs = ["role", "aria-label", "tabindex", "hybridnavfocusable"].filter(a => el.hasAttribute && el.hasAttribute(a)).map(a => `${a}=${el.getAttribute(a)}`).join(" ");
    out.push(`${"  ".repeat(depth)}${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${attrs ? " [" + attrs + "]" : ""}${own ? ' "' + own + '"' : ""}`);
    [...el.children].forEach(child => describe(child, depth + 1, out));
  };

  const keys = [];
  document.addEventListener("keydown", e => {
    keys.push(`${e.key}/${e.keyCode}`);
    if (keys.length > 12) keys.shift();
  }, true);

  setInterval(() => {
    const keyboard = document.querySelector("ytlr-search-keyboard, ytlr-keyboard, [class*=keyboard]");
    if (!location.hash.includes("search") || !keyboard) {
      panel.style.display = "none";
      return;
    }
    let root = keyboard;
    for (let i = 0; i < 2 && root.parentElement; i++) root = root.parentElement;
    const out = [`hash=${location.hash}  keys=${keys.join(" ")}`, `active=${document.activeElement && document.activeElement.outerHTML.slice(0, 200)}`];
    describe(root, 0, out);
    panel.textContent = out.join("\n");
    panel.style.display = "block";
  }, 3000);
})();

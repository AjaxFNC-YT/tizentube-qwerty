(() => {
  console.warn("[qwerty] addon running");
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
    const tags = new Set();
    document.querySelectorAll("*").forEach(el => {
      const t = el.tagName.toLowerCase();
      if (/search|key/.test(t) || (typeof el.className === "string" && /keyboard/i.test(el.className))) tags.add(t + (typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""));
    });
    const keyEl = [...document.querySelectorAll("*")].find(el => el.children.length === 0 && el.textContent.trim() === "SPACE");
    let root = keyEl;
    for (let i = 0; i < 6 && root && root.parentElement; i++) root = root.parentElement;
    const out = [`TT=${typeof window.tizentube !== "undefined" || !!document.querySelector("[id^=tt-]")} hash=${location.hash}  keys=${keys.join(" ")}`, `tags=${[...tags].join(" ")}`, `active=${document.activeElement && document.activeElement.outerHTML.slice(0, 200)}`];
    if (root) describe(root, 0, out);
    panel.textContent = out.join("\n");
    panel.style.display = "block";
  }, 3000);
})();

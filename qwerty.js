(() => {
  const panel = document.createElement("pre");
  panel.style.cssText = "position:fixed;left:0;top:0;width:1920px;height:1080px;margin:0;padding:8px;background:rgba(0,0,0,.92);color:#0f0;font:13px/15px monospace;z-index:2147483647;overflow:hidden;white-space:pre-wrap;pointer-events:none;display:none";
  document.documentElement.appendChild(panel);

  const keys = [];
  document.addEventListener("keydown", e => {
    keys.push(`${e.key}`);
    if (keys.length > 10) keys.shift();
  }, true);

  const style = el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return `disp=${s.display} pos=${s.position} flexdir=${s.flexDirection} wrap=${s.flexWrap} gtc=${s.gridTemplateColumns} rect=${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)} tf=${s.transform}`;
  };

  const describe = (el, depth, out) => {
    if (out.length > 60 || depth > 6 || el.tagName === "YT-KEYBOARD-KEY") return;
    out.push(`${"  ".repeat(depth)}${el.tagName.toLowerCase()} kids=${el.children.length} ${style(el)}`);
    [...el.children].forEach(child => describe(child, depth + 1, out));
  };

  setInterval(() => {
    const keyboard = document.querySelector("ytlr-search-keyboard");
    if (!keyboard) {
      panel.style.display = "none";
      return;
    }
    const out = [`keys=${keys.join(" ")}`, `active=${document.activeElement && document.activeElement.outerHTML.slice(0, 160)}`];
    describe(keyboard, 0, out);
    const all = [...keyboard.querySelectorAll("yt-keyboard-key")];
    out.push(`total keys=${all.length}`);
    out.push(all.map(k => {
      const r = k.getBoundingClientRect();
      return `${k.getAttribute("aria-label")}@${Math.round(r.left)},${Math.round(r.top)}`;
    }).join("  "));
    const first = all[0];
    if (first) {
      out.push(`key parent chain: ${[first.parentElement, first.parentElement.parentElement].map(p => p.tagName.toLowerCase() + " kids=" + p.children.length).join(" < ")}`);
      out.push(`key html: ${first.outerHTML.slice(0, 400)}`);
      out.push(`key style: ${style(first)}`);
    }
    out.push(`props: ${Object.keys(first || {}).slice(0, 20).join(",")}`);
    panel.textContent = out.join("\n");
    panel.style.display = "block";
  }, 2000);
})();

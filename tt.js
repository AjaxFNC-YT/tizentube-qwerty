(() => {
  const upstream = "https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js";
  const addon = "https://cdn.jsdelivr.net/gh/AjaxFNC-YT/tizentube-qwerty@main/qwerty.js";

  const report = message => {
    const badge = document.createElement("div");
    badge.textContent = message;
    badge.style.cssText = "position:fixed;left:20px;bottom:20px;background:#e00;color:#fff;font:24px sans-serif;padding:10px;z-index:2147483647;max-width:1800px";
    document.documentElement.appendChild(badge);
  };

  let policy = null;
  try {
    if (window.trustedTypes) policy = trustedTypes.createPolicy(`qwerty-${Date.now()}`, { createScriptURL: url => url });
  } catch (e) {
    report(`policy: ${e.message}`);
  }

  const load = (src, tag) => {
    try {
      const url = `${src}?v=${tag}`;
      const script = document.createElement("script");
      script.src = policy ? policy.createScriptURL(url) : url;
      script.async = false;
      script.onerror = () => report(`failed: ${src}`);
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      report(`load: ${e.message}`);
    }
  };

  load(upstream, Date.now());
  load(addon, Date.now());
})();

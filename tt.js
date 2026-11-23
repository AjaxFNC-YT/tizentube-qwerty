(() => {
  const upstream = "https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js";
  const addon = "https://cdn.jsdelivr.net/gh/AjaxFNC-YT/tizentube-qwerty@main/qwerty.js";

  let version = "";
  try {
    version = new URL(document.currentScript.src).searchParams.get("v") || "";
  } catch (e) {}

  const load = (src, tag) => {
    const script = document.createElement("script");
    script.src = `${src}?v=${tag}`;
    script.async = false;
    script.onerror = () => console.warn(`[qwerty] failed to load ${src}`);
    (document.head || document.documentElement).appendChild(script);
  };

  load(upstream, version || Date.now());
  load(addon, Math.floor(Date.now() / 600000));
})();

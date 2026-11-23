(() => {
  console.warn("[qwerty] loader running");
  const upstream = "https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js";
  const addon = "https://cdn.jsdelivr.net/gh/AjaxFNC-YT/tizentube-qwerty@main/qwerty.js";

  let version = String(Date.now());
  try {
    version = new URL(document.currentScript.src).searchParams.get("v") || version;
  } catch (e) {}

  const load = src => {
    const script = document.createElement("script");
    script.src = `${src}?v=${version}`;
    script.async = false;
    script.onerror = () => console.warn(`[qwerty] failed ${src}`);
    script.onload = () => console.warn(`[qwerty] loaded ${src}`);
    (document.head || document.documentElement).appendChild(script);
  };

  load(upstream);
  load(addon);
})();

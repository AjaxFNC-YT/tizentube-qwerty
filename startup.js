(() => {
  const upstream = "https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js";
  const addon = "https://cdn.jsdelivr.net/gh/AjaxFNC-YT/tizentube-qwerty/qwerty.js";

  let version = String(Date.now());
  try {
    version = new URL(document.currentScript.src).searchParams.get("v") || version;
  } catch (e) {}

  const load = src => {
    const script = document.createElement("script");
    script.src = `${src}?v=${version}`;
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
  };

  load(upstream);
  load(addon);
})();

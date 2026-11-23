(() => {
  const upstream = "https://cdn.jsdelivr.net/npm/@foxreis/tizentube/dist/userScript.js";
  const repo = "AjaxFNC-YT/tizentube-qwerty";

  let policy = null;
  try {
    if (window.trustedTypes) policy = trustedTypes.createPolicy(`qwerty-${Date.now()}`, { createScriptURL: url => url });
  } catch (e) {}

  const load = url => {
    const script = document.createElement("script");
    script.src = policy ? policy.createScriptURL(url) : url;
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
  };

  load(`${upstream}?v=${Date.now()}`);

  fetch(`https://api.github.com/repos/${repo}/commits/main`, { headers: { Accept: "application/vnd.github.sha" } })
    .then(response => (response.ok ? response.text() : Promise.reject()))
    .then(sha => load(`https://cdn.jsdelivr.net/gh/${repo}@${sha.trim()}/qwerty.js`))
    .catch(() => load(`https://cdn.jsdelivr.net/gh/${repo}@main/qwerty.js?v=${Date.now()}`));
})();

(function () {
  "use strict";
  const tabs = Array.from(document.querySelectorAll("[data-medical-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-medical-panel]"));
  if (!tabs.length || !panels.length) return;

  function activate(name, focus, updateHash) {
    if (!tabs.some((tab) => tab.dataset.medicalTab === name)) name = "start";
    tabs.forEach((tab) => {
      const active = tab.dataset.medicalTab === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.medicalPanel !== name; });
    if (updateHash) history.replaceState(null, "", "#" + name);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab.dataset.medicalTab, false, true));
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[next].dataset.medicalTab, true, true);
    });
  });

  window.addEventListener("hashchange", () => activate(location.hash.slice(1), false, false));
  activate(location.hash.slice(1) || "start", false, false);
})();

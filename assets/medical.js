(function () {
  "use strict";
  const tabs = Array.from(document.querySelectorAll("[data-medical-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-medical-panel]"));
  if (!tabs.length || !panels.length) return;

  const wounds = document.querySelector('[data-medical-panel="wounds"]');
  const woundsTable = wounds && wounds.querySelector(".table-wrap");
  if (woundsTable) {
    const figures = document.createElement("div");
    figures.className = "figure-grid medical-figure-pair";
    figures.innerHTML = '<figure class="guide-figure"><img src="assets/guides/ace-bandage-tab.png" alt="ACE bandage treatment tab"><figcaption>Select the wounded body part, then choose an available dressing.</figcaption></figure><figure class="guide-figure"><img src="assets/guides/ace-bandage-treatment.png" alt="ACE bandage treatment in progress"><figcaption>Keep the patient and treater still while the treatment completes.</figcaption></figure>';
    wounds.insertBefore(figures, woundsTable);
    const splintFigure = document.createElement("figure");
    splintFigure.className = "guide-figure medical-splint-figure";
    splintFigure.innerHTML = '<img src="assets/guides/ace-splint-treatment.png" alt="ACE splint treatment"><figcaption>Splint fractured limbs after immediate threats to life have been controlled.</figcaption>';
    const woundCards = wounds.querySelector(".grid.two");
    if (woundCards) wounds.insertBefore(splintFigure, woundCards);
  }

  const coreIcons = {
    IV: ["assets/guides/items/ace-iv.svg", "ACE intravenous fluid icon"],
    Rx: ["assets/guides/items/ace-injector.svg", "ACE medication injector icon"],
    SK: ["assets/guides/items/ace-kit.svg", "ACE medical kit icon"]
  };
  document.querySelectorAll(".equipment-list .item-symbol").forEach((symbol) => {
    const icon = coreIcons[symbol.textContent.trim()];
    if (!icon) return;
    const image = document.createElement("img");
    image.className = "item-icon";
    image.src = icon[0];
    image.alt = icon[1];
    symbol.replaceWith(image);
  });

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

(function() {
  function closePanels(except) {
    document.querySelectorAll(".info-panel").forEach(panel => {
      if (panel !== except) panel.remove();
    });
    document.querySelectorAll(".info-dot[aria-expanded='true']").forEach(button => {
      if (!except || button.getAttribute("aria-controls") !== except.id) {
        button.setAttribute("aria-expanded", "false");
      }
    });
  }

  function panelHost(button) {
    return button.closest(".details-card, .task-card, .menu-card, .menu-section, .app-header") || button.parentElement;
  }

  function toggleInfo(button) {
    const host = panelHost(button);
    if (!host) return;

    const existingId = button.getAttribute("aria-controls");
    const existing = existingId ? document.getElementById(existingId) : null;
    if (existing) {
      existing.remove();
      button.setAttribute("aria-expanded", "false");
      return;
    }

    closePanels();

    const panel = document.createElement("div");
    panel.className = "info-panel";
    panel.id = "info_" + Math.random().toString(36).slice(2);
    panel.textContent = button.dataset.info || "Keine Beschreibung hinterlegt.";
    panel.addEventListener("click", event => event.stopPropagation());

    if (host.tagName && host.tagName.toLowerCase() === "details") {
      host.open = true;
      const summary = host.querySelector("summary");
      if (summary) {
        summary.insertAdjacentElement("afterend", panel);
      } else {
        host.appendChild(panel);
      }
    } else {
      host.appendChild(panel);
    }

    button.setAttribute("aria-controls", panel.id);
    button.setAttribute("aria-expanded", "true");
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-info]");
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      toggleInfo(button);
      return;
    }
    if (!event.target.closest(".info-panel")) closePanels();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePanels();
  });
})();

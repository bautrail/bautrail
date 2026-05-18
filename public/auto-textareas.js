(function() {
  function resize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(
      textarea.scrollHeight,
      54
    ) + "px";
  }

  function init() {
    document
      .querySelectorAll("textarea")
      .forEach(textarea => {
        resize(textarea);

        if (textarea.dataset.autoResizeBound) return;

        textarea.dataset.autoResizeBound = "true";

        textarea.addEventListener("input", () => {
          resize(textarea);
        });
      });
  }

  window.BaudokuAutoTextareas = {
    init,
    resize
  };

  document.addEventListener(
    "DOMContentLoaded",
    init
  );
})();

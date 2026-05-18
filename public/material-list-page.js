(function() {
  function makeId() {
    return "item_" +
      Date.now() +
      "_" +
      Math.random()
      .toString(36)
      .slice(2);
  }

  function getConfig() {
    return window.MaterialPageConfig;
  }

  function getItems() {
    return window.BaudokuNotifications
      .getItems(getConfig().storageKey);
  }

  function saveItems(items) {
    window.BaudokuNotifications
      .saveItems(
        getConfig().storageKey,
        items
      );
  }

  function render() {
    const list =
      document.getElementById("materialList");

    list.innerHTML = "";

    getItems().forEach(item => {
      const row =
        document.createElement("div");

      row.className =
        "task-card";

      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="checkbox" ${item.done ? "checked" : ""}>
          <div style="flex:1;${item.done ? "text-decoration:line-through;opacity:0.5;" : ""}">
            ${item.text}
          </div>
          <button class="delete-btn" style="width:auto;margin-top:0;padding:8px 10px;">X</button>
        </div>
      `;

      row
        .querySelector("input")
        .addEventListener("change", event => {
          saveItems(
            getItems().map(existing => {
              if (existing.id !== item.id) return existing;

              return {
                ...existing,
                done: event.target.checked
              };
            })
          );

          render();
        });

      row
        .querySelector("button")
        .addEventListener("click", () => {
          saveItems(
            getItems()
              .filter(existing =>
                existing.id !== item.id
              )
          );

          render();
        });

      list.appendChild(row);
    });
  }

  function addItem() {
    const input =
      document.getElementById("materialInput");

    const text =
      input.value.trim();

    if (!text) return;

    const items =
      getItems();

    items.unshift({
      id: makeId(),
      text,
      done: false,
      created_at: new Date().toISOString()
    });

    saveItems(items);

    input.value = "";

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const config =
      getConfig();

    document.getElementById("pageTitle").textContent =
      config.title;

    document.getElementById("pageSubtitle").textContent =
      config.subtitle;

    document.getElementById("materialInput").placeholder =
      config.placeholder;

    document
      .getElementById("addMaterialBtn")
      .addEventListener("click", addItem);

    document
      .getElementById("materialInput")
      .addEventListener("keydown", event => {
        if (event.key === "Enter") {
          addItem();
        }
      });

    render();
  });
})();

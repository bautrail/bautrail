(function() {
  const MATERIAL_KEY = "baudokuMaterialFavorites";
  const TEMPLATE_KEY = "baudokuJobTemplates";

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function makeId(prefix) {
    return [
      prefix,
      Date.now(),
      Math.random().toString(36).slice(2)
    ].join("_");
  }

  function getMaterialFavorites() {
    return readJson(MATERIAL_KEY);
  }

  function saveMaterialFavorite(text) {
    const value = normalizeText(text);
    if (!value) return getMaterialFavorites();

    const items =
      getMaterialFavorites().filter(item =>
        item.toLowerCase() !== value.toLowerCase()
      );

    items.unshift(value);
    writeJson(MATERIAL_KEY, items.slice(0, 20));
    return getMaterialFavorites();
  }

  function removeMaterialFavorite(text) {
    writeJson(
      MATERIAL_KEY,
      getMaterialFavorites().filter(item => item !== text)
    );

    return getMaterialFavorites();
  }

  function getJobTemplates() {
    return readJson(TEMPLATE_KEY);
  }

  function saveJobTemplate(template) {
    const cleaned = {
      id: template.id || makeId("template"),
      name: normalizeText(template.name) || "Vorlage",
      beschreibung: normalizeText(template.beschreibung),
      material: normalizeText(template.material),
      priority: normalizeText(template.priority) || "normal"
    };

    const items =
      getJobTemplates().filter(item => item.id !== cleaned.id);

    items.unshift(cleaned);
    writeJson(TEMPLATE_KEY, items.slice(0, 20));
    return getJobTemplates();
  }

  function removeJobTemplate(id) {
    writeJson(
      TEMPLATE_KEY,
      getJobTemplates().filter(item => item.id !== id)
    );

    return getJobTemplates();
  }

  window.BaudokuPresets = {
    getMaterialFavorites,
    saveMaterialFavorite,
    removeMaterialFavorite,
    getJobTemplates,
    saveJobTemplate,
    removeJobTemplate
  };
})();

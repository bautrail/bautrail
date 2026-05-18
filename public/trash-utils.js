(function() {
  const FALLBACK_KEY = "baudokuTrashFallback";

  function readFallback() {
    try {
      return JSON.parse(localStorage.getItem(FALLBACK_KEY)) || [];
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  function writeFallback(items) {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
  }

  function makeFallbackId() {
    return [
      "trash",
      Date.now(),
      Math.random().toString(36).slice(2)
    ].join("_");
  }

  async function archiveItem(item) {
    const payload = {
      item_type: item.item_type,
      source_id: String(item.source_id || ""),
      title: item.title || item.item_type || "Eintrag",
      payload: item.payload || {},
      deleted_at: item.deleted_at || new Date().toISOString(),
      restore_until: item.restore_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      purged: false
    };

    if (window.db && navigator.onLine) {
      const { data, error } =
        await window.db
          .from("trash_items")
          .insert([payload])
          .select()
          .single();

      if (!error && data) {
        return data;
      }

      console.log(error);
    }

    const fallback = readFallback();
    const saved = {
      id: makeFallbackId(),
      ...payload,
      fallback: true
    };

    fallback.unshift(saved);
    writeFallback(fallback);
    return saved;
  }

  async function loadItems() {
    if (window.db && navigator.onLine) {
      const { data, error } =
        await window.db
          .from("trash_items")
          .select("*")
          .eq("purged", false)
          .order("deleted_at", { ascending: false });

      if (!error) {
        const now = Date.now();
        return (data || []).filter(item => new Date(item.restore_until || 0).getTime() > now);
      }

      console.log(error);
    }

    const now = Date.now();
    return readFallback().filter(item => new Date(item.restore_until || 0).getTime() > now);
  }

  async function removeItem(id) {
    if (window.db && navigator.onLine && !String(id).startsWith("trash_")) {
      const { error } =
        await window.db
          .from("trash_items")
          .delete()
          .eq("id", id);

      if (!error) {
        return true;
      }

      console.log(error);
    }

    writeFallback(
      readFallback().filter(item => String(item.id) !== String(id))
    );

    return true;
  }

  window.BaudokuTrash = {
    archiveItem,
    loadItems,
    removeItem
  };
})();

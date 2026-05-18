(function() {
  const SETTINGS_KEY = "baudokuProfileSettings";
  const VEHICLE_KEY = "baudokuVehicleMaterial";
  const ORDER_KEY = "baudokuOrderMaterial";
  const SENT_KEY = "baudokuSentNotifications";

  function todayKey() {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  function currentTimeKey() {
    const now = new Date();

    return String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(
        localStorage.getItem(key)
      ) || fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  }

  function getSettings() {
    return {
      vehicleTime: "06:30",
      orderTime: "16:30",
      customerMaterialTime: "18:00",
      companyName: "Firma Musterbau",
      companyOwner: "Max Mustermann",
      companyStreet: "Musterstrasse 1",
      companyZip: "12345",
      companyCity: "Musterstadt",
      companyPhone: "",
      companyEmail: "",
      companyWebsite: "",
      companyTaxId: "",
      companyVatId: "",
      companyLogo: "",
      ...readJson(SETTINGS_KEY, {})
    };
  }

  function saveSettings(settings) {
    writeJson(
      SETTINGS_KEY,
      {
        ...getSettings(),
        ...settings
      }
    );
  }

  function getItems(key) {
    return readJson(key, []);
  }

  function saveItems(key, items) {
    writeJson(key, items);
  }

  function wasSent(kind) {
    const sent =
      readJson(SENT_KEY, {});

    return sent[kind] === todayKey();
  }

  function markSent(kind) {
    const sent =
      readJson(SENT_KEY, {});

    sent[kind] = todayKey();

    writeJson(SENT_KEY, sent);
  }

  async function ensurePermission() {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      return false;
    }

    const permission =
      await Notification.requestPermission();

    return permission === "granted";
  }

  async function notify(kind, title, body) {
    if (wasSent(kind)) return;

    const allowed =
      await ensurePermission();

    if (!allowed) return;

    new Notification(title, {
      body
    });

    markSent(kind);
  }

  function openItemsText(key) {
    return getItems(key)
      .filter(item => !item.done)
      .map(item => "- " + item.text)
      .join("\n");
  }

  async function customerMaterialText() {
    if (!window.db) {
      return "Material fuer morgige Kunden pruefen.";
    }

    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const day =
      tomorrow
        .toISOString()
        .slice(0, 10);

    const { data:jobs, error } =
      await window.db
      .from("auftraege")
      .select("id, customer, project")
      .eq("done", false)
      .eq("faelligkeit", day);

    if (error || !jobs || !jobs.length) {
      return "Keine Kundenmaterialien fuer morgen gefunden.";
    }

    const ids =
      jobs.map(job => job.id);

    const { data:materials } =
      await window.db
      .from("auftrag_material")
      .select("auftrag_id, text, done")
      .in("auftrag_id", ids);

    return jobs.map(job => {
      const texts =
        (materials || [])
        .filter(item =>
          item.auftrag_id === job.id &&
          !item.done
        )
        .map(item => item.text)
        .join(", ");

      return "- " +
        (job.customer || "Kunde") +
        " / " +
        (job.project || "Projekt") +
        (texts ? ": " + texts : "");
    }).join("\n");
  }

  async function checkNotifications() {
    const settings =
      getSettings();

    const now =
      currentTimeKey();

    if (now === settings.vehicleTime) {
      const body =
        openItemsText(VEHICLE_KEY);

      if (body) {
        await notify(
          "vehicle",
          "Fahrzeug Material ersetzen",
          body
        );
      }
    }

    if (now === settings.orderTime) {
      const body =
        openItemsText(ORDER_KEY);

      if (body) {
        await notify(
          "order",
          "Material bestellen",
          body
        );
      }
    }

    if (now === settings.customerMaterialTime) {
      await notify(
        "customerMaterial",
        "Kundenmaterial fuer morgen",
        await customerMaterialText()
      );
    }
  }

  window.BaudokuNotifications = {
    SETTINGS_KEY,
    VEHICLE_KEY,
    ORDER_KEY,
    getSettings,
    saveSettings,
    getItems,
    saveItems,
    ensurePermission,
    checkNotifications
  };

  document.addEventListener("DOMContentLoaded", () => {
    checkNotifications();
    setInterval(checkNotifications, 30000);
  });
})();

(function() {
  const SETTINGS_KEY = "baudokuProfileSettings";
  const VEHICLE_KEY = "baudokuVehicleMaterial";
  const ORDER_KEY = "baudokuOrderMaterial";
  const SENT_KEY = "baudokuSentNotifications";
  let onlineSettingsCache = null;
  let onlineSettingsFetchedAt = 0;

  function localDateKey(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function currentTimeKey() {
    const now = new Date();
    return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (err) { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getSettings() {
    return {
      vehicleTime: "06:30",
      orderTime: "16:30",
      customerMaterialTime: "18:00",
      dailyReportTime: "17:30",
      timesheetTime: "17:45",
      dailyReportReminderEnabled: true,
      timesheetReminderEnabled: true,
      ...readJson(SETTINGS_KEY, {})
    };
  }

  function saveSettings(settings) {
    writeJson(SETTINGS_KEY, { ...getSettings(), ...settings });
  }

  function getItems(key) { return readJson(key, []); }
  function saveItems(key, items) { writeJson(key, items); }
  function wasSent(kind) { return readJson(SENT_KEY, {})[kind] === localDateKey(); }
  function markSent(kind) { const sent = readJson(SENT_KEY, {}); sent[kind] = localDateKey(); writeJson(SENT_KEY, sent); }

  async function ensurePermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return await Notification.requestPermission() === "granted";
  }

  async function notify(kind, title, body) {
    if (!body || wasSent(kind)) return;
    if (!await ensurePermission()) return;
    new Notification(title, { body });
    markSent(kind);
  }

  function openItemsText(key) {
    return getItems(key).filter(item => !item.done).map(item => "- " + item.text).join("\n");
  }
  async function loadAuthContext() {
    if (!window.BaudokuAuthContext || !window.db) return null;
    try { return await window.BaudokuAuthContext.loadAuthContext(); }
    catch (err) { console.log(err); return null; }
  }

  async function loadOnlineSettings(context) {
    if (!window.db || !context || !context.company_id) return {};
    if (onlineSettingsCache && Date.now() - onlineSettingsFetchedAt < 5 * 60 * 1000) return onlineSettingsCache;
    const { data, error } = await window.db
      .from("companies")
      .select("vehicle_time, order_time, customer_material_time, daily_report_time, timesheet_time, daily_report_reminder_enabled, timesheet_reminder_enabled")
      .eq("id", context.company_id)
      .maybeSingle();
    if (error || !data) {
      if (error) console.log(error);
      return {};
    }
    onlineSettingsCache = {
      vehicleTime: data.vehicle_time || "06:30",
      orderTime: data.order_time || "16:30",
      customerMaterialTime: data.customer_material_time || "18:00",
      dailyReportTime: data.daily_report_time || "17:30",
      timesheetTime: data.timesheet_time || "17:45",
      dailyReportReminderEnabled: data.daily_report_reminder_enabled !== false,
      timesheetReminderEnabled: data.timesheet_reminder_enabled !== false
    };
    onlineSettingsFetchedAt = Date.now();
    return onlineSettingsCache;
  }

  async function effectiveSettings(context) {
    return { ...getSettings(), ...await loadOnlineSettings(context) };
  }

  async function customerMaterialText(context) {
    if (!window.db) return "Material für morgige Kunden prüfen.";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = localDateKey(tomorrow);
    let query = window.db.from("auftraege").select("id, customer, project").eq("done", false).eq("faelligkeit", day);
    if (context && context.company_id) query = query.eq("company_id", context.company_id);
    const { data: jobs, error } = await query;
    if (error || !jobs || !jobs.length) return "Keine Kundenmaterialien für morgen gefunden.";
    const ids = jobs.map(job => job.id);
    const { data: materials } = await window.db.from("auftrag_material").select("auftrag_id, text, done").in("auftrag_id", ids);
    return jobs.map(job => {
      const texts = (materials || []).filter(item => item.auftrag_id === job.id && !item.done).map(item => item.text).join(", ");
      return "- " + (job.customer || "Kunde") + " / " + (job.project || "Projekt") + (texts ? ": " + texts : "");
    }).join("\n");
  }

  async function missingDailyReportText(context) {
    if (!window.db || !context || !context.company_id || !context.user_id) return "";
    if (context.role !== "angestellter") return "";
    const today = localDateKey();
    const { data, error } = await window.db
      .from("stundennachweise")
      .select("id")
      .eq("company_id", context.company_id)
      .eq("created_by", context.user_id)
      .eq("arbeitsdatum", today)
      .is("deleted_at", null)
      .limit(1);
    if (error) { console.log(error); return ""; }
    return data && data.length ? "" : "Bitte deinen Stundennachweis für heute noch speichern.";
  }
  async function missingTimesheetText(context) {
    if (!window.db || !context || !context.company_id || !context.user_id) return "";
    if (context.role !== "angestellter") return "";
    const today = localDateKey();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = localDateKey(tomorrowDate);
    const { data, error } = await window.db
      .from("employee_timesheets")
      .select("id")
      .eq("company_id", context.company_id)
      .eq("user_id", context.user_id)
      .gte("start_time", today + "T00:00:00")
      .lt("start_time", tomorrow + "T00:00:00")
      .limit(1);
    if (error) { console.log(error); return ""; }
    return data && data.length ? "" : "Bitte deine Arbeitszeit für heute noch eintragen.";
  }

  async function checkNotifications() {
    const context = await loadAuthContext();
    const settings = await effectiveSettings(context);
    const now = currentTimeKey();

    if (now === settings.vehicleTime) {
      await notify("vehicle", "Fahrzeug Material ersetzen", openItemsText(VEHICLE_KEY));
    }

    if (now === settings.orderTime) {
      await notify("order", "Material bestellen", openItemsText(ORDER_KEY));
    }

    if (now === settings.customerMaterialTime) {
      await notify("customerMaterial", "Kundenmaterial für morgen", await customerMaterialText(context));
    }

    if (settings.dailyReportReminderEnabled && now === settings.dailyReportTime) {
      await notify("dailyReport", "Stundennachweis fehlt", await missingDailyReportText(context));
    }

    if (settings.timesheetReminderEnabled && now === settings.timesheetTime) {
      await notify("timesheet", "Arbeitszeit fehlt", await missingTimesheetText(context));
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

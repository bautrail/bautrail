(function(){const SETTINGS_KEY="baudokuProfileSettings",VEHICLE_KEY="baudokuVehicleMaterial",ORDER_KEY="baudokuOrderMaterial",SENT_KEY="baudokuSentNotifications",STATE_KEY="baudokuNotificationRuntimeState";let onlineSettingsCache=null,onlineSettingsFetchedAt=0;function localDateKey(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}function currentTimeKey(){const n=new Date();return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0")}function readJson(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch(e){return f}}function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}function getSettings(){return{vehicleTime:"06:30",orderTime:"16:30",customerMaterialTime:"18:00",dailyReportTime:"17:30",timesheetTime:"17:45",dueOrderTime:"07:00",dailyReportReminderEnabled:true,timesheetReminderEnabled:true,dueOrderReminderEnabled:true,newReportNotificationEnabled:true,...readJson(SETTINGS_KEY,{})}}function saveSettings(s){writeJson(SETTINGS_KEY,{...getSettings(),...s})}function getRuntimeState(){return{reportCheckpointByCompany:{},reportNotifiedIdsByCompany:{},...readJson(STATE_KEY,{})}}function saveRuntimeState(n){writeJson(STATE_KEY,{...getRuntimeState(),...n})}function getItems(k){return readJson(k,[])}function saveItems(k,i){writeJson(k,i)}function wasSent(k){return readJson(SENT_KEY,{})[k]===localDateKey()}function markSent(k){const s=readJson(SENT_KEY,{});s[k]=localDateKey();writeJson(SENT_KEY,s)}async function ensurePermission(){if(!("Notification"in window))return false;if(Notification.permission==="granted")return true;if(Notification.permission==="denied")return false;return await Notification.requestPermission()==="granted"}async function showNotification(t,b){if(!b)return false;if(!await ensurePermission())return false;new Notification(t,{body:b});return true}async function notify(k,t,b){if(!b||wasSent(k))return;if(!await showNotification(t,b))return;markSent(k)}function openItemsText(k){return getItems(k).filter(i=>!i.done).map(i=>"- "+i.text).join("\n")}async function loadAuthContext(){if(!window.BaudokuAuthContext||!window.db)return null;try{return await window.BaudokuAuthContext.loadAuthContext()}catch(e){console.log(e);return null}}async function loadOnlineSettings(c){if(!window.db||!c||!c.company_id)return{};if(onlineSettingsCache&&Date.now()-onlineSettingsFetchedAt<3e5)return onlineSettingsCache;const{data,error}=await window.db.from("companies").select("*").eq("id",c.company_id).maybeSingle();if(error||!data){if(error)console.log(error);return{}}onlineSettingsCache={vehicleTime:data.vehicle_time||"06:30",orderTime:data.order_time||"16:30",customerMaterialTime:data.customer_material_time||"18:00",dailyReportTime:data.daily_report_time||"17:30",timesheetTime:data.timesheet_time||"17:45",dueOrderTime:data.due_order_time||"07:00",dailyReportReminderEnabled:data.daily_report_reminder_enabled!==false,timesheetReminderEnabled:data.timesheet_reminder_enabled!==false,dueOrderReminderEnabled:data.due_order_reminder_enabled!==false,newReportNotificationEnabled:data.new_report_notification_enabled!==false};onlineSettingsFetchedAt=Date.now();return onlineSettingsCache}async function effectiveSettings(c){return{...getSettings(),...await loadOnlineSettings(c)}}async function customerMaterialText(c){if(!window.db)return"Material fuer morgige Kunden pruefen.";const t=new Date();t.setDate(t.getDate()+1);const day=localDateKey(t);let q=window.db.from("auftraege").select("id, customer, project").eq("done",false).eq("faelligkeit",day);if(c&&c.company_id)q=q.eq("company_id",c.company_id);const{data:jobs,error}=await q;if(error||!jobs||!jobs.length)return"Keine Kundenmaterialien fuer morgen gefunden.";const ids=jobs.map(j=>j.id);const{data:materials}=await window.db.from("auftrag_material").select("auftrag_id, text, done").in("auftrag_id",ids);return jobs.map(j=>{const texts=(materials||[]).filter(i=>i.auftrag_id===j.id&&!i.done).map(i=>i.text).join(", ");return"- "+(j.customer||"Kunde")+" / "+(j.project||"Projekt")+(texts?": "+texts:"")}).join("\n")}async function missingDailyReportText(c){if(!window.db||!c||!c.company_id||!c.user_id||c.role!=="angestellter")return"";const today=localDateKey();const{data,error}=await window.db.from("stundennachweise").select("id").eq("company_id",c.company_id).eq("created_by",c.user_id).eq("arbeitsdatum",today).is("deleted_at",null).limit(1);if(error){console.log(error);return""}return data&&data.length?"":"Bitte deinen Stundennachweis fuer heute noch speichern."}async function missingTimesheetText(c){if(!window.db||!c||!c.company_id||!c.user_id||c.role!=="angestellter")return"";const today=localDateKey(),tm=new Date();tm.setDate(tm.getDate()+1);const tomorrow=localDateKey(tm);const{data,error}=await window.db.from("employee_timesheets").select("id").eq("company_id",c.company_id).eq("user_id",c.user_id).gte("start_time",today+"T00:00:00").lt("start_time",tomorrow+"T00:00:00").limit(1);if(error){console.log(error);return""}return data&&data.length?"":"Bitte deine Arbeitszeit fuer heute noch eintragen."}async function dueOrdersText(c){if(!window.db||!c||!c.company_id||!["chef","buero"].includes(String(c.role||"")))return"";const today=localDateKey();const{data,error}=await window.db.from("auftraege").select("id, customer, project, objekt").eq("company_id",c.company_id).eq("done",false).eq("faelligkeit",today).limit(6);if(error){console.log(error);return""}if(!data||!data.length)return"";const lines=data.slice(0,3).map(i=>"- "+(i.customer||"Kunde")+" / "+(i.project||i.objekt||"Auftrag"));return"Heute faellige Auftraege:\n"+lines.join("\n")+(data.length>3?"\n+"+(data.length-3)+" weitere":"")}async function checkNewReportNotifications(c,s){if(!window.db||!c||!c.company_id||!s.newReportNotificationEnabled||!["chef","buero"].includes(String(c.role||"")))return;const key=String(c.company_id),state=getRuntimeState(),checkpoint=(state.reportCheckpointByCompany||{})[key]||null,notified=new Set((state.reportNotifiedIdsByCompany||{})[key]||[]);const{data,error}=await window.db.from("stundennachweise").select("id, customer, objekt, created_at, created_by").eq("company_id",c.company_id).is("deleted_at",null).order("created_at",{ascending:false}).limit(8);if(error||!data||!data.length){if(error)console.log(error);return}const latest=data[0].created_at;if(!checkpoint){state.reportCheckpointByCompany[key]=latest;state.reportNotifiedIdsByCompany[key]=Array.from(notified).slice(-20);saveRuntimeState(state);return}const fresh=data.filter(i=>i.created_at>checkpoint).filter(i=>String(i.created_by||"")!==String(c.user_id||"")).filter(i=>!notified.has(String(i.id)));if(!fresh.length){state.reportCheckpointByCompany[key]=latest;saveRuntimeState(state);return}const newest=fresh[0],body=fresh.length===1?((newest.customer||"Kunde")+(newest.objekt?" - "+newest.objekt:"")+" hat einen neuen Nachweis."):(fresh.length+" neue Stundennachweise sind eingegangen.");if(!await showNotification("Neuer Stundennachweis",body))return;fresh.forEach(i=>notified.add(String(i.id)));state.reportCheckpointByCompany[key]=latest;state.reportNotifiedIdsByCompany[key]=Array.from(notified).slice(-30);saveRuntimeState(state)}async function checkNotifications(){const c=await loadAuthContext(),s=await effectiveSettings(c),now=currentTimeKey();if(now===s.vehicleTime)await notify("vehicle","Fahrzeug Material ersetzen",openItemsText(VEHICLE_KEY));if(now===s.orderTime)await notify("order","Material bestellen",openItemsText(ORDER_KEY));if(now===s.customerMaterialTime)await notify("customerMaterial","Kundenmaterial fuer morgen",await customerMaterialText(c));if(s.dailyReportReminderEnabled&&now===s.dailyReportTime)await notify("dailyReport","Stundennachweis fehlt",await missingDailyReportText(c));if(s.timesheetReminderEnabled&&now===s.timesheetTime)await notify("timesheet","Arbeitszeit fehlt",await missingTimesheetText(c));if(s.dueOrderReminderEnabled&&now===s.dueOrderTime)await notify("dueOrders","Faellige Auftraege",await dueOrdersText(c));await checkNewReportNotifications(c,s)}window.BaudokuNotifications={SETTINGS_KEY,VEHICLE_KEY,ORDER_KEY,getSettings,saveSettings,getItems,saveItems,ensurePermission,checkNotifications};document.addEventListener("DOMContentLoaded",()=>{checkNotifications();setInterval(checkNotifications,3e4)})})();

(function(){
  const SENT_KEY = "bautrailRecurringReminderSent";

  function localDateKey(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function wasSent(key) {
    return readJson(SENT_KEY, {})[key] === localDateKey();
  }

  function markSent(key) {
    const state = readJson(SENT_KEY, {});
    state[key] = localDateKey();
    localStorage.setItem(SENT_KEY, JSON.stringify(state));
  }

  async function loadContext() {
    if (!window.BaudokuAuthContext || !window.db) return null;
    try {
      return await window.BaudokuAuthContext.loadAuthContext();
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async function showNotification(title, body) {
    if (!body || !("Notification" in window)) return false;
    if (window.BaudokuNotifications) {
      const allowed = await window.BaudokuNotifications.ensurePermission();
      if (!allowed) return false;
    } else if (Notification.permission !== "granted") {
      return false;
    }
    new Notification(title, { body });
    return true;
  }

  async function checkRecurringReminderNotifications() {
    const ctx = await loadContext();
    if (!ctx || !ctx.company_id || !window.db) return;

    const isManager = ctx.role === "chef" || ctx.role === "buero";
    const today = localDateKey();
    const sentKey = [ctx.company_id, ctx.user_id, "recurring", today].join(":");
    if (wasSent(sentKey)) return;

    let query = window.db
      .from("order_reminders")
      .select("id, title, due_date, message")
      .eq("company_id", ctx.company_id)
      .neq("status", "erledigt")
      .lte("reminder_date", today)
      .order("due_date", { ascending: true })
      .limit(5);

    if (!isManager) {
      query = query
        .eq("assigned_user_id", ctx.user_id)
        .eq("notify_assignee", true);
    }

    const { data, error } = await query;
    if (error || !data || !data.length) {
      if (error) console.log(error);
      return;
    }

    const first = data[0];
    const body = data.length === 1
      ? (first.title || "Wiederkehrender Auftrag") + " ist faellig."
      : data.length + " Erinnerungen fuer wiederkehrende Auftraege sind offen.";

    if (await showNotification("Wiederkehrende Auftraege", body)) {
      markSent(sentKey);
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    checkRecurringReminderNotifications();
    setInterval(checkRecurringReminderNotifications, 60000);
  });
})();

(function() {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseDateKey(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return null;
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(value, days) {
    const date = parseDateKey(value);
    if (!date) return "";
    date.setDate(date.getDate() + Number(days || 0));
    return dateKey(date);
  }

  function addMonths(value, months) {
    const date = parseDateKey(value);
    if (!date) return "";
    const day = date.getDate();
    const targetMonth = date.getMonth() + Number(months || 1);
    const target = new Date(date.getFullYear(), targetMonth, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return dateKey(target);
  }

  function advanceDueDate(value, rule) {
    const interval = rule && rule.interval_type ? rule.interval_type : "monthly";
    if (interval === "weekly") return addDays(value, 7);
    if (interval === "yearly") return addMonths(value, 12);
    if (interval === "custom_months") return addMonths(value, Math.max(1, Number(rule.interval_months || 1)));
    return addMonths(value, 1);
  }

  function reminderDateFor(rule) {
    return addDays(rule.next_due_date, -Math.max(0, Number(rule.reminder_days_before || 0)));
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function formatDateDe(value) {
    const date = parseDateKey(value);
    return date ? date.toLocaleDateString("de-DE") : "-";
  }

  function intervalLabel(rule) {
    const interval = rule && rule.interval_type ? rule.interval_type : "monthly";
    if (interval === "weekly") return "woechentlich";
    if (interval === "yearly") return "jaehrlich";
    if (interval === "custom_months") return "alle " + Math.max(1, Number(rule.interval_months || 1)) + " Monate";
    return "monatlich";
  }

  async function getContext() {
    if (!window.BaudokuAuthContext || !window.db) return null;
    try {
      return await window.BaudokuAuthContext.loadAuthContext({ noCache: true });
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  function isManager(ctx) {
    return ctx && (ctx.role === "chef" || ctx.role === "buero");
  }

  function orderPayloadFromRule(ctx, rule, dueDate) {
    return {
      company_id: ctx.company_id,
      customer: rule.customer || "Kunde",
      customer_id: rule.customer_id || null,
      project: rule.project || "Auftrag",
      project_id: rule.project_id || null,
      beschreibung: rule.beschreibung || "",
      priority: rule.priority || "normal",
      faelligkeit: dueDate,
      done: false,
      status: "offen"
    };
  }

  async function insertOrderFromRule(ctx, rule, dueDate) {
    const { data, error } = await db
      .from("auftraege")
      .insert([orderPayloadFromRule(ctx, rule, dueDate)])
      .select()
      .single();

    if (error) {
      console.log(error);
      return { data: null, error };
    }

    return { data, error: null };
  }

  async function advanceRule(rule, dueDate) {
    const nextDue = advanceDueDate(dueDate, rule);
    const { error } = await db
      .from("recurring_orders")
      .update({
        last_created_due_date: dueDate,
        next_due_date: nextDue,
        updated_at: new Date().toISOString()
      })
      .eq("id", rule.id)
      .eq("company_id", rule.company_id);

    if (error) console.log(error);
    return nextDue;
  }

  async function createReminderForRule(rule, dueDate) {
    const reminderStart = reminderDateFor(rule);
    if (!reminderStart || reminderStart > todayKey()) return false;

    const { data: existing, error: existingError } = await db
      .from("order_reminders")
      .select("id")
      .eq("recurring_order_id", rule.id)
      .eq("due_date", dueDate)
      .limit(1);

    if (existingError) {
      console.log(existingError);
      return false;
    }

    if (existing && existing.length) return false;

    const title = (rule.customer || "Kunde") + " - " + (rule.project || "Auftrag");
    const message =
      "Pruefung am " + formatDateDe(dueDate) + " faellig" +
      (rule.beschreibung ? ": " + rule.beschreibung : "");

    const { error } = await db
      .from("order_reminders")
      .insert([{
        company_id: rule.company_id,
        recurring_order_id: rule.id,
        customer_id: rule.customer_id || null,
        project_id: rule.project_id || null,
        assigned_user_id: rule.assigned_user_id || null,
        title,
        message,
        reminder_date: todayKey(),
        due_date: dueDate,
        status: "neu",
        notify_assignee: rule.notify_assignee === true
      }]);

    if (error) {
      console.log(error);
      return false;
    }

    return true;
  }

  async function processDueRecurrences() {
    const ctx = await getContext();
    if (!isManager(ctx) || !ctx.company_id) return { created: 0, reminders: 0 };

    const { data: rules, error } = await db
      .from("recurring_orders")
      .select("*")
      .eq("company_id", ctx.company_id)
      .eq("active", true)
      .order("next_due_date", { ascending: true });

    if (error) {
      console.log(error);
      return { created: 0, reminders: 0, error };
    }

    const today = todayKey();
    let created = 0;
    let reminders = 0;

    for (const originalRule of (rules || [])) {
      const rule = { ...originalRule };
      let dueDate = rule.next_due_date;
      if (!dueDate) continue;

      if (rule.mode === "auto_create") {
        let guard = 0;
        while (dueDate && dueDate <= today && guard < 6) {
          if (rule.last_created_due_date !== dueDate) {
            const result = await insertOrderFromRule(ctx, rule, dueDate);
            if (result.error) break;
            created += 1;
          }

          const nextDue = await advanceRule(rule, dueDate);
          rule.last_created_due_date = dueDate;
          rule.next_due_date = nextDue;
          dueDate = nextDue;
          guard += 1;
        }
      } else {
        const didCreate = await createReminderForRule(rule, dueDate);
        if (didCreate) reminders += 1;
      }
    }

    return { created, reminders };
  }

  async function createOrderFromRecurring(recurringId) {
    const ctx = await getContext();
    if (!isManager(ctx) || !ctx.company_id) return { error: { message: "Keine Berechtigung." } };

    const { data: rule, error } = await db
      .from("recurring_orders")
      .select("*")
      .eq("id", recurringId)
      .eq("company_id", ctx.company_id)
      .single();

    if (error || !rule) return { error };

    const dueDate = rule.next_due_date || todayKey();
    const result = await insertOrderFromRule(ctx, rule, dueDate);
    if (result.error) return result;

    await advanceRule(rule, dueDate);
    await db
      .from("order_reminders")
      .update({
        status: "erledigt",
        auftrag_id: result.data.id,
        completed_at: new Date().toISOString()
      })
      .eq("recurring_order_id", rule.id)
      .eq("due_date", dueDate)
      .eq("company_id", ctx.company_id);

    return result;
  }

  async function createOrderFromReminder(reminderId) {
    const ctx = await getContext();
    if (!isManager(ctx) || !ctx.company_id) return { error: { message: "Keine Berechtigung." } };

    const { data: reminder, error } = await db
      .from("order_reminders")
      .select("*")
      .eq("id", reminderId)
      .eq("company_id", ctx.company_id)
      .single();

    if (error || !reminder) return { error };

    const { data: rule, error: ruleError } = await db
      .from("recurring_orders")
      .select("*")
      .eq("id", reminder.recurring_order_id)
      .eq("company_id", ctx.company_id)
      .single();

    if (ruleError || !rule) return { error: ruleError };

    const dueDate = reminder.due_date || rule.next_due_date || todayKey();
    const result = await insertOrderFromRule(ctx, rule, dueDate);
    if (result.error) return result;

    await db
      .from("order_reminders")
      .update({
        status: "erledigt",
        auftrag_id: result.data.id,
        completed_at: new Date().toISOString()
      })
      .eq("id", reminderId)
      .eq("company_id", ctx.company_id);

    await advanceRule(rule, dueDate);
    return result;
  }

  async function completeReminder(reminderId) {
    const ctx = await getContext();
    if (!isManager(ctx) || !ctx.company_id) return { error: { message: "Keine Berechtigung." } };

    const { data: reminder, error } = await db
      .from("order_reminders")
      .select("*")
      .eq("id", reminderId)
      .eq("company_id", ctx.company_id)
      .single();

    if (error || !reminder) return { error };

    await db
      .from("order_reminders")
      .update({
        status: "erledigt",
        completed_at: new Date().toISOString()
      })
      .eq("id", reminderId)
      .eq("company_id", ctx.company_id);

    if (reminder.recurring_order_id) {
      const { data: rule } = await db
        .from("recurring_orders")
        .select("*")
        .eq("id", reminder.recurring_order_id)
        .eq("company_id", ctx.company_id)
        .maybeSingle();
      if (rule) await advanceRule(rule, reminder.due_date || rule.next_due_date);
    }

    return { error: null };
  }

  async function loadOpenReminders(limit) {
    const ctx = await getContext();
    if (!ctx || !ctx.company_id) return [];

    let query = db
      .from("order_reminders")
      .select("*")
      .neq("status", "erledigt")
      .order("due_date", { ascending: true })
      .limit(limit || 20);

    if (isManager(ctx)) {
      query = query.eq("company_id", ctx.company_id);
    } else {
      query = query
        .eq("company_id", ctx.company_id)
        .eq("assigned_user_id", ctx.user_id)
        .eq("notify_assignee", true);
    }

    const { data, error } = await query;
    if (error) {
      console.log(error);
      return [];
    }

    return data || [];
  }

  window.BautrailRecurringOrders = {
    addDays,
    addMonths,
    advanceDueDate,
    createOrderFromRecurring,
    createOrderFromReminder,
    completeReminder,
    dateKey,
    formatDateDe,
    getContext,
    intervalLabel,
    isManager,
    loadOpenReminders,
    processDueRecurrences,
    todayKey
  };
})();

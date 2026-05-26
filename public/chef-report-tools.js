(function() {
  function memberName(userId) {
    const member = (membersCache || []).find(item => String(item.user_id || "") === String(userId || ""));
    return member ? (member.name || member.email || "Mitarbeiter") : "Unbekannt";
  }

  function reportReviewStatus(report) {
    if (!report) return "offen";
    if (report.review_status) return report.review_status;
    return report.abgerechnet ? "abgerechnet" : "offen";
  }

  function reportStatusLabel(status) {
    return {
      offen: "Offen",
      geprueft: "Geprüft",
      abgelehnt: "Abgelehnt",
      abgerechnet: "Abgerechnet"
    }[status || "offen"] || "Offen";
  }

  function formatHours(value) {
    return Number(value || 0).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " Std.";
  }

  function reportNumberLabel(report) {
    return report.nachweis_nummer || report.id || "ohne Nummer";
  }

  function addOneDay(dateValue) {
    const date = new Date(dateValue + "T00:00:00");
    date.setDate(date.getDate() + 1);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function currentArchiveBounds() {
    const startInput = document.getElementById("archiveStart");
    const endInput = document.getElementById("archiveEnd");
    if (startInput || endInput) {
      const start = startInput ? startInput.value : "";
      const endInclusive = endInput ? endInput.value : "";
      if (!start || !endInclusive) return null;
      if (endInclusive < start) return { invalid: true, message: "Das Bis-Datum darf nicht vor dem Von-Datum liegen." };
      return {
        start,
        end: addOneDay(endInclusive),
        endInclusive,
        label: formatDateDe(start) + " bis " + formatDateDe(endInclusive)
      };
    }
    const input = document.getElementById("archiveMonth") || document.getElementById("adminExportMonth");
    return monthBounds(input ? input.value : "");
  }

  function requireArchiveBounds(target) {
    const bounds = currentArchiveBounds();
    if (!bounds) {
      if (target) target.innerHTML = "<p style='opacity:0.7;'>Bitte zuerst einen Zeitraum wählen.</p>";
      const summary = document.getElementById("archiveSummary");
      if (summary) summary.innerHTML = "<p style='opacity:0.7;'>Bitte zuerst Von- und Bis-Datum eintragen.</p>";
      return null;
    }
    if (bounds.invalid) {
      if (target) target.innerHTML = "<p style='opacity:0.7;'>" + bounds.message + "</p>";
      const summary = document.getElementById("archiveSummary");
      if (summary) summary.innerHTML = "<p style='opacity:0.7;'>" + bounds.message + "</p>";
      return null;
    }
    return bounds;
  }

  async function loadArchiveFilterOptions() {
    if (!authContext || !authContext.company_id) return;
    const [customerResult, projectResult] = await Promise.all([
      db.from("customers").select("id, firma, vorname, nachname, email").eq("company_id", authContext.company_id).order("created_at", { ascending: false }),
      db.from("projects").select("id, name, customer, customer_id").eq("company_id", authContext.company_id).order("created_at", { ascending: false })
    ]);
    if (customerResult.error) console.log(customerResult.error);
    if (projectResult.error) console.log(projectResult.error);
    customersCache = customerResult.data || [];
    projectsCache = projectResult.data || [];

    const memberSelect = document.getElementById("archiveMember");
    if (memberSelect) {
      memberSelect.innerHTML = '<option value="">Alle Mitarbeiter</option>' +
        (membersCache || []).filter(m => m.active !== false).map(member =>
          `<option value="${escapeHtml(member.user_id)}">${escapeHtml(member.name || member.email || "Mitarbeiter")}</option>`
        ).join("");
    }

    const customerOptions = '<option value="">Alle Kunden</option>' + customersCache.map(customer =>
      `<option value="${escapeHtml(customer.id)}">${escapeHtml(customerLabel(customer))}</option>`
    ).join("");
    const customerSelect = document.getElementById("archiveCustomer");
    if (customerSelect) customerSelect.innerHTML = customerOptions;

    const billingSelect = document.getElementById("billingCustomer");
    if (billingSelect) billingSelect.innerHTML = '<option value="">Kunde wählen</option>' + customersCache.map(customer =>
      `<option value="${escapeHtml(customer.id)}">${escapeHtml(customerLabel(customer))}</option>`
    ).join("");

    const projectSelect = document.getElementById("archiveProject");
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">Alle Projekte</option>' + projectsCache.map(project =>
        `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name || project.customer || "Projekt")}</option>`
      ).join("");
    }
  }

  function renderArchiveSummary(items, bounds) {
    const summary = document.getElementById("archiveSummary");
    if (!summary) return;
    const hours = items.reduce((sum, item) => sum + Number(item.stunden || 0), 0);
    const kilometers = items.reduce((sum, item) => sum + Number(item.gefahrene_kilometer || 0), 0);
    const checked = items.filter(item => reportReviewStatus(item) === "geprueft").length;
    const billed = items.filter(item => reportReviewStatus(item) === "abgerechnet").length;
    summary.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="info-box"><strong>${items.length}</strong><br><small>Nachweise ${escapeHtml(bounds.label)}</small></div>
        <div class="info-box"><strong>${formatHours(hours)}</strong><br><small>Stunden</small></div>
        <div class="info-box"><strong>${formatKm(kilometers)}</strong><br><small>Kilometer</small></div>
        <div class="info-box"><strong>${checked} / ${billed}</strong><br><small>geprüft / abgerechnet</small></div>
      </div>
    `;
  }
  function renderReportArchive(items) {
    const list = document.getElementById("reportArchiveList");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = "<p style='opacity:0.7;'>Keine Stundennachweise für diese Auswahl.</p>";
      return;
    }
    list.innerHTML = "";
    items.forEach(report => {
      const status = reportReviewStatus(report);
      const customerId = report.customer_id || "";
      const card = document.createElement("div");
      card.className = "info-box";
      card.style.marginBottom = "8px";
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <strong>${escapeHtml(report.customer || "Kunde")}</strong><br>
            <small>${formatDateDe(report.arbeitsdatum)} | ${escapeHtml(memberName(report.created_by))} | ${escapeHtml(reportStatusLabel(status))}</small><br>
            <small>${escapeHtml(report.project || report.objekt || "-")} | ${formatHours(report.stunden)} | ${formatKm(report.gefahrene_kilometer)}</small>
          </div>
          <strong>${escapeHtml(reportNumberLabel(report))}</strong>
        </div>
        <div class="button-row" style="margin-top:8px;">
          <button class="login-btn" style="margin-bottom:0;background:#444;" onclick="downloadChefReportPdf('${report.id}')">📄 PDF</button>
          <button class="login-btn" style="margin-bottom:0;" onclick="setReportReviewStatus('${report.id}','geprueft')">✅ Prüfen</button>
          <button class="login-btn" style="margin-bottom:0;background:#2e6b3f;" onclick="setReportReviewStatus('${report.id}','abgerechnet')">💶 Abgerechnet</button>
          <button class="delete-btn" style="margin:0;" onclick="rejectChefReport('${report.id}')">🗑️ Ablehnen</button>
          ${customerId ? `<button class="login-btn" style="margin-bottom:0;background:#444;" onclick="window.location.href='kunde-detail.html?id=${customerId}'">👤 Kundenakte</button>` : ""}
        </div>
      `;
      list.appendChild(card);
    });
  }

  async function loadReportArchive() {
    if (!authContext || !authContext.company_id) return;
    const list = document.getElementById("reportArchiveList");
    const bounds = requireArchiveBounds(list);
    if (!bounds) {
      reportArchiveCache = [];
      return;
    }
    if (list) list.innerHTML = "<p style='opacity:0.7;'>Lade Stundennachweise...</p>";

    let query = db.from("stundennachweise")
      .select("*")
      .eq("company_id", authContext.company_id)
      .gte("arbeitsdatum", bounds.start)
      .lt("arbeitsdatum", bounds.end)
      .is("deleted_at", null)
      .order("arbeitsdatum", { ascending: false });

    const member = document.getElementById("archiveMember");
    const customer = document.getElementById("archiveCustomer");
    const project = document.getElementById("archiveProject");
    if (member && member.value) query = query.eq("created_by", member.value);
    if (customer && customer.value) query = query.eq("customer_id", customer.value);
    if (project && project.value) query = query.eq("project_id", project.value);

    const { data, error } = await query;
    if (error) {
      console.log(error);
      if (list) list.innerHTML = "<p style='opacity:0.7;'>Archiv konnte nicht geladen werden.</p>";
      return;
    }

    const status = document.getElementById("archiveStatus");
    reportArchiveCache = (data || []).filter(report => !status || !status.value || reportReviewStatus(report) === status.value);
    renderArchiveSummary(reportArchiveCache, bounds);
    renderReportArchive(reportArchiveCache);
  }

  async function setReportReviewStatus(reportId, status) {
    const label = reportStatusLabel(status);
    if (status === "abgelehnt") {
      await rejectChefReport(reportId);
      return;
    }
    const ok = confirm("Nachweis wirklich auf " + label + " setzen?");
    if (!ok) return;
    const { error } = await db.rpc("review_company_report", {
      p_report_id: reportId,
      p_status: status,
      p_note: status === "abgerechnet" ? "Aus Chef-Dashboard abgerechnet" : null
    });
    if (error) {
      console.log(error);
      alert("Status konnte nicht gespeichert werden: " + (error.message || "Fehler"));
      return;
    }
    await loadReportArchive();
    await loadEmployeeAnalysis();
  }
  function createChefReportPdf(report) {
    const root = window.jspdf || window.jsPDF;
    const JsPdf = root && (root.jsPDF || root);
    if (!JsPdf) throw new Error("PDF-Modul konnte nicht geladen werden.");
    const pdf = new JsPdf({ unit: "mm", format: "a4" });
    let y = 18;
    function add(text, size, bold) {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size || 10);
      const lines = pdf.splitTextToSize(String(text || ""), 180);
      pdf.text(lines, 15, y);
      y += lines.length * 5 + (size && size > 11 ? 4 : 2);
    }
    add("bautrail Stundennachweis", 16, true);
    add((company && company.name ? company.name : "Firma") + " | Nachweis " + reportNumberLabel(report), 10);
    y += 4;
    add("Kunde: " + (report.customer || "-"), 11, true);
    add("Projekt/Objekt: " + [report.project, report.objekt].filter(Boolean).join(" / "), 10);
    add("Datum: " + formatDateDe(report.arbeitsdatum), 10);
    add("Mitarbeiter: " + memberName(report.created_by), 10);
    add("Status: " + reportStatusLabel(reportReviewStatus(report)), 10);
    add("Stunden: " + formatHours(report.stunden) + " | Kilometer: " + formatKm(report.gefahrene_kilometer), 10);
    y += 4;
    add("Ausgeführte Arbeiten", 12, true);
    add(report.taetigkeit || "-", 10);
    y += 2;
    add("Material", 12, true);
    add(report.material || "-", 10);
    y += 2;
    add("Personal", 12, true);
    add(report.personal || "-", 10);
    if (report.unterschrift_name || report.unterschrift_data) {
      y += 4;
      add("Unterschrift: " + (report.unterschrift_name || "vorhanden"), 10, true);
      if (report.unterschrift_data) {
        try { pdf.addImage(report.unterschrift_data, "PNG", 15, y, 80, 22); } catch (err) { console.log(err); }
      }
    }
    return pdf;
  }

  async function downloadChefReportPdf(reportId) {
    const report = (reportArchiveCache || []).find(item => String(item.id) === String(reportId));
    if (!report) {
      alert("Nachweis nicht gefunden.");
      return;
    }
    const pdf = createChefReportPdf(report);
    pdf.save("stundennachweis-" + reportNumberLabel(report) + ".pdf");
  }

  async function loadMissingToday() {
    const target = document.getElementById("missingTodayList");
    if (!target || !authContext || !authContext.company_id) return;
    target.innerHTML = "<p style='opacity:0.7;'>Prüfe heutige Einträge...</p>";
    const today = new Date();
    const todayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getDate()).padStart(2, "0");
    const [reports, times] = await Promise.all([
      db.from("stundennachweise").select("created_by").eq("company_id", authContext.company_id).eq("arbeitsdatum", todayKey).is("deleted_at", null),
      db.from("employee_timesheets").select("user_id").eq("company_id", authContext.company_id).gte("start_time", todayKey + "T00:00:00").lt("start_time", tomorrowKey + "T00:00:00")
    ]);
    if (reports.error || times.error) {
      console.log(reports.error || times.error);
      target.innerHTML = "<p style='opacity:0.7;'>Fehlende Einträge konnten nicht geladen werden.</p>";
      return;
    }
    const reportUsers = new Set((reports.data || []).map(item => String(item.created_by || "")));
    const timeUsers = new Set((times.data || []).map(item => String(item.user_id || "")));
    const rows = (membersCache || []).filter(member => member.active !== false && member.role === "angestellter").map(member => {
      const hasReport = reportUsers.has(String(member.user_id || ""));
      const hasTime = timeUsers.has(String(member.user_id || ""));
      return { member, hasReport, hasTime };
    }).filter(row => !row.hasReport || !row.hasTime);
    if (!rows.length) {
      target.innerHTML = "<p style='opacity:0.7;'>Heute ist alles eingetragen.</p>";
      return;
    }
    target.innerHTML = rows.map(row => `
      <div class="info-box" style="margin-bottom:8px;">
        <strong>${escapeHtml(row.member.name || row.member.email || "Mitarbeiter")}</strong><br>
        <small>${row.hasReport ? "Stundennachweis vorhanden" : "Stundennachweis fehlt"} | ${row.hasTime ? "Arbeitszeit vorhanden" : "Arbeitszeit fehlt"}</small>
      </div>
    `).join("");
  }
  async function loadEmployeeAnalysis() {
    const target = document.getElementById("employeeAnalysis");
    if (!target || !authContext || !authContext.company_id) return;
    const bounds = requireArchiveBounds(target);
    if (!bounds) return;
    target.innerHTML = "<p style='opacity:0.7;'>Lade Auswertung...</p>";
    const { data, error } = await db.from("stundennachweise")
      .select("*")
      .eq("company_id", authContext.company_id)
      .gte("arbeitsdatum", bounds.start)
      .lt("arbeitsdatum", bounds.end)
      .is("deleted_at", null);
    if (error) {
      console.log(error);
      target.innerHTML = "<p style='opacity:0.7;'>Auswertung konnte nicht geladen werden.</p>";
      return;
    }
    const byUser = new Map();
    (data || []).forEach(report => {
      const userId = String(report.created_by || "");
      const current = byUser.get(userId) || { userId, reports: 0, hours: 0, km: 0, projects: new Set(), checked: 0, billed: 0 };
      current.reports += 1;
      current.hours += Number(report.stunden || 0);
      current.km += Number(report.gefahrene_kilometer || 0);
      if (report.project || report.project_id) current.projects.add(String(report.project_id || report.project));
      if (reportReviewStatus(report) === "geprueft") current.checked += 1;
      if (reportReviewStatus(report) === "abgerechnet") current.billed += 1;
      byUser.set(userId, current);
    });
    const rows = Array.from(byUser.values()).sort((a, b) => b.hours - a.hours);
    if (!rows.length) {
      target.innerHTML = "<p style='opacity:0.7;'>Keine Nachweise in diesem Monat.</p>";
      return;
    }
    target.innerHTML = rows.map(row => `
      <div class="info-box" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <strong>${escapeHtml(memberName(row.userId))}</strong>
          <strong>${formatHours(row.hours)}</strong>
        </div>
        <small>${row.reports} Nachweise | ${formatKm(row.km)} | ${row.projects.size} Projekt(e) | ${row.checked} geprüft | ${row.billed} abgerechnet</small>
      </div>
    `).join("");
  }

  function billingRowsForCustomer(customerId) {
    return (reportArchiveCache || []).filter(report => {
      const sameCustomer = String(report.customer_id || "") === String(customerId || "");
      const status = reportReviewStatus(report);
      return sameCustomer && (status === "geprueft" || status === "abgerechnet");
    });
  }

  function renderBillingPreview(customerId, rows) {
    const target = document.getElementById("billingPreview");
    if (!target) return;
    const customer = (customersCache || []).find(item => String(item.id) === String(customerId));
    if (!customerId) {
      target.innerHTML = "<p style='opacity:0.7;'>Bitte zuerst einen Kunden wählen.</p>";
      return;
    }
    if (!rows.length) {
      target.innerHTML = "<p style='opacity:0.7;'>Keine geprüften Nachweise für diesen Kunden im gewählten Monat.</p>";
      return;
    }
    const hours = rows.reduce((sum, row) => sum + Number(row.stunden || 0), 0);
    const km = rows.reduce((sum, row) => sum + Number(row.gefahrene_kilometer || 0), 0);
    target.innerHTML = `
      <div class="info-box">
        <strong>${escapeHtml(customer ? customerLabel(customer) : "Kunde")}</strong><br>
        <small>${rows.length} Nachweise | ${formatHours(hours)} | ${formatKm(km)}</small>
        <div class="button-row" style="margin-top:8px;">
          <button class="login-btn" style="margin-bottom:0;" onclick="downloadBillingPdf()">PDF</button>
          <button class="login-btn" style="margin-bottom:0;background:#444;" onclick="downloadBillingCsv()">CSV</button>
          <button class="login-btn" style="margin-bottom:0;background:#2e6b3f;" onclick="markBillingRowsBilled()">Alle abrechnen</button>
        </div>
      </div>
      <div style="margin-top:8px;">
        ${rows.map(row => `<small style="display:block;padding:5px 0;border-top:1px solid #333;">${formatDateDe(row.arbeitsdatum)} | ${escapeHtml(row.project || row.objekt || "-")} | ${formatHours(row.stunden)} | ${formatKm(row.gefahrene_kilometer)}</small>`).join("")}
      </div>
    `;
  }

  async function prepareCustomerBilling() {
    const select = document.getElementById("billingCustomer");
    const customerId = select ? select.value : "";
    const bounds = requireArchiveBounds(document.getElementById("billingPreview"));
    if (!bounds) return;
    if (!reportArchiveCache.length) await loadReportArchive();
    window.currentBillingRows = billingRowsForCustomer(customerId);
    window.currentBillingCustomerId = customerId;
    renderBillingPreview(customerId, window.currentBillingRows);
  }
  function downloadBillingCsv() {
    const rows = (window.currentBillingRows || []).map(row => ({
      datum: row.arbeitsdatum,
      kunde: row.customer,
      projekt: row.project,
      objekt: row.objekt,
      mitarbeiter: memberName(row.created_by),
      stunden: row.stunden,
      kilometer: row.gefahrene_kilometer,
      status: reportStatusLabel(reportReviewStatus(row)),
      nachweis: reportNumberLabel(row)
    }));
    if (!rows.length) return;
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "rechnungs-vorbereitung.csv");
  }

  function downloadBillingPdf() {
    const rows = window.currentBillingRows || [];
    if (!rows.length) return;
    const root = window.jspdf || window.jsPDF;
    const JsPdf = root && (root.jsPDF || root);
    if (!JsPdf) {
      alert("PDF-Modul konnte nicht geladen werden.");
      return;
    }
    const customer = (customersCache || []).find(item => String(item.id) === String(window.currentBillingCustomerId));
    const pdf = new JsPdf({ unit: "mm", format: "a4" });
    let y = 18;
    function add(text, size, bold) {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size || 10);
      pdf.text(String(text || ""), 15, y);
      y += size && size > 11 ? 8 : 6;
    }
    add("bautrail Rechnungs-Vorbereitung", 16, true);
    add(customer ? customerLabel(customer) : "Kunde", 11);
    add("Monat: " + currentArchiveBounds().label, 10);
    y += 4;
    let totalHours = 0;
    let totalKm = 0;
    rows.forEach(row => {
      if (y > 275) { pdf.addPage(); y = 18; }
      totalHours += Number(row.stunden || 0);
      totalKm += Number(row.gefahrene_kilometer || 0);
      add(formatDateDe(row.arbeitsdatum) + " | " + (row.project || row.objekt || "-") + " | " + formatHours(row.stunden) + " | " + formatKm(row.gefahrene_kilometer), 9);
    });
    y += 4;
    add("Summe: " + formatHours(totalHours) + " | " + formatKm(totalKm), 12, true);
    pdf.save("rechnungs-vorbereitung-" + currentArchiveBounds().label + ".pdf");
  }

  async function markBillingRowsBilled() {
    const rows = window.currentBillingRows || [];
    if (!rows.length) return;
    const ok = confirm(rows.length + " Nachweise wirklich als abgerechnet markieren?");
    if (!ok) return;
    for (const row of rows) {
      const { error } = await db.rpc("review_company_report", {
        p_report_id: row.id,
        p_status: "abgerechnet",
        p_note: "Aus Rechnungs-Vorbereitung abgerechnet"
      });
      if (error) {
        console.log(error);
        alert("Mindestens ein Nachweis konnte nicht markiert werden: " + (error.message || "Fehler"));
        break;
      }
    }
    await loadReportArchive();
    await prepareCustomerBilling();
    await loadEmployeeAnalysis();
  }

  async function rejectChefReport(reportId) {
    if (!authContext || !authContext.company_id) return;
    const ok = confirm("Nachweis wirklich ablehnen und löschen? Er verschwindet danach aus der normalen Liste.");
    if (!ok) return;
    const reason = prompt("Grund für die Ablehnung / Löschung:", "Vom Chef abgelehnt") || "Vom Chef abgelehnt";
    const note = reason.trim() || "Vom Chef abgelehnt";
    let success = false;
    let lastError = null;

    const rpcReject = await db.rpc("reject_company_report", {
      p_report_id: reportId,
      p_note: note
    });
    if (!rpcReject.error) {
      success = true;
    } else {
      lastError = rpcReject.error;
      console.log(rpcReject.error);
    }

    if (!success) {
      const deleted = await updateRejectedReportWithFallback(reportId, {
        deleted_at: new Date().toISOString(),
        deleted_by: authContext.user_id,
        delete_reason: note,
        review_status: "abgelehnt",
        reviewed_by: authContext.user_id,
        reviewed_at: new Date().toISOString()
      });
      if (!deleted.error && deleted.data) {
        success = true;
      } else {
        lastError = deleted.error || lastError;
        if (deleted.error) console.log(deleted.error);
      }
    }

    if (!success) {
      const review = await db.rpc("review_company_report", {
        p_report_id: reportId,
        p_status: "abgelehnt",
        p_note: note
      });
      if (!review.error) {
        success = true;
      } else {
        lastError = review.error || lastError;
        console.log(review.error);
      }
    }

    if (!success) {
      alert("Nachweis konnte nicht gelöscht werden: " + ((lastError && lastError.message) || "Fehler"));
      return;
    }

    reportArchiveCache = (reportArchiveCache || []).filter(item => String(item.id) !== String(reportId));
    const bounds = currentArchiveBounds();
    if (bounds && !bounds.invalid) renderArchiveSummary(reportArchiveCache, bounds);
    renderReportArchive(reportArchiveCache);
    await loadReportArchive();
    await loadEmployeeAnalysis();
  }

  async function updateRejectedReportWithFallback(reportId, payload) {
    let safe = { ...payload };
    let result = await db
      .from("stundennachweise")
      .update(safe)
      .eq("id", reportId)
      .eq("company_id", authContext.company_id)
      .select("id")
      .maybeSingle();
    let guard = 0;
    while (result.error && guard < 10) {
      const msg = String(result.error.message || "");
      const match =
        msg.match(/column\s+"([^"]+)"/i) ||
        msg.match(/column\s+'([^']+)'/i) ||
        msg.match(/find the '([^']+)' column/i) ||
        msg.match(/find the "([^"]+)" column/i);
      if (!match || !match[1] || !(match[1] in safe)) break;
      delete safe[match[1]];
      result = await db
        .from("stundennachweise")
        .update(safe)
        .eq("id", reportId)
        .eq("company_id", authContext.company_id)
        .select("id")
        .maybeSingle();
      guard += 1;
    }
    return result;
  }

  window.loadArchiveFilterOptions = loadArchiveFilterOptions;
  window.loadReportArchive = loadReportArchive;
  window.setReportReviewStatus = setReportReviewStatus;
  window.rejectChefReport = rejectChefReport;
  window.downloadChefReportPdf = downloadChefReportPdf;
  window.loadMissingToday = loadMissingToday;
  window.loadEmployeeAnalysis = loadEmployeeAnalysis;
  window.prepareCustomerBilling = prepareCustomerBilling;
  window.downloadBillingCsv = downloadBillingCsv;
  window.downloadBillingPdf = downloadBillingPdf;
  window.openBillingCustomerFile = function() {
    const select = document.getElementById("billingCustomer");
    const customerId = select ? select.value : "";
    if (!customerId) {
      alert("Bitte zuerst einen Kunden auswählen.");
      return;
    }
    window.location.href = "kunde-detail.html?id=" + encodeURIComponent(customerId);
  };
  window.markBillingRowsBilled = markBillingRowsBilled;
})();

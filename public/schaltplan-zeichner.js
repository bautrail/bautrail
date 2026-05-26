(function() {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const PLAN = { width: 1359, height: 945 };
  const TEMPLATE_IMAGE_PATH = "assets/schaltplan-vorlage.png";
  const DOT_GRID = { x: 29, y: 38, right: 1331, bottom: 790, size: 11.4 };
  const TEMPLATE_WORK = { x: DOT_GRID.x, y: DOT_GRID.y, right: DOT_GRID.right, bottom: DOT_GRID.bottom };
  const LOCK_GRID_SIZE = DOT_GRID.size;
  const SYMBOL_FIELD_SIZE = DOT_GRID.size;
  const SYMBOL_BUILDER_GRID = { x: 0, y: 0, right: 200, bottom: 200, size: 20 };
  const DEFAULT_COLOR = "#111111";
  const CUSTOM_SYMBOL_KEY = "bautrailCustomCircuitSymbols";
  const OFFLINE_PLAN_QUEUE_KEY = "bautrailCircuitPlanQueue";
  const BUILTIN_SYMBOLS = [
    { id: "switch", label: "Schalter", detail: "Kontakt", icon: "S", group: "Schalter" },
    { id: "socket", label: "Steckdose", detail: "Anschluss", icon: "\uD83D\uDD0C", group: "Steckdosen" },
    { id: "lamp", label: "Lampe", detail: "Leuchte", icon: "\uD83D\uDCA1", group: "Leuchten" },
    { id: "fuse", label: "Sicherung", detail: "Schutz", icon: "\u26A1", group: "Schutz" },
    { id: "panel", label: "Verteiler", detail: "Feld", icon: "\u25A6", group: "Verteiler" },
    { id: "wire", label: "Leitung", detail: "Kabel", icon: "\u2501", group: "Leitungen" },
    { id: "junction", label: "Abzweigung", detail: "Knoten", icon: "\u253C", group: "Leitungen" }
  ];

  const els = {
    svg: document.getElementById("planSvg"),
    objectLayer: document.getElementById("objectLayer"),
    connectionLayer: document.getElementById("connectionLayer"),
    endpointLayer: document.getElementById("endpointLayer"),
    legendLayer: document.getElementById("legendLayer"),
    templateFieldLayer: document.getElementById("templateFieldLayer"),
    gridLayer: document.getElementById("gridLayer"),
    gridPattern: document.getElementById("gridPattern"),
    gridPath: document.getElementById("gridPath"),
    templateImage: document.getElementById("templateImage"),
    backgroundImage: document.getElementById("backgroundImage"),
    photoInput: document.getElementById("photoInput"),
    planTitle: document.getElementById("planTitle"),
    planStatus: document.getElementById("planStatus"),
    planCustomer: document.getElementById("planCustomer"),
    planSelect: document.getElementById("planSelect"),
    saveCircuitPlan: document.getElementById("saveCircuitPlan"),
    newCircuitPlan: document.getElementById("newCircuitPlan"),
    refreshCircuitPlans: document.getElementById("refreshCircuitPlans"),
    pageSelect: document.getElementById("pageSelect"),
    addCircuitPage: document.getElementById("addCircuitPage"),
    deleteCircuitPage: document.getElementById("deleteCircuitPage"),
    versionSelect: document.getElementById("versionSelect"),
    restoreCircuitVersion: document.getElementById("restoreCircuitVersion"),
    syncNote: document.getElementById("syncNote"),
    bgOpacity: document.getElementById("bgOpacity"),
    gridSize: document.getElementById("gridSize"),
    strokeColor: document.getElementById("strokeColor"),
    strokeWidth: document.getElementById("strokeWidth"),
    symbolType: document.getElementById("symbolType"),
    symbolSearch: document.getElementById("symbolSearch"),
    symbolGroup: document.getElementById("symbolGroup"),
    status: document.getElementById("drawStatus"),
    symbolList: document.getElementById("symbolList"),
    openSymbolBuilder: document.getElementById("openSymbolBuilder"),
    closeSymbolBuilder: document.getElementById("closeSymbolBuilder"),
    symbolBuilderModal: document.getElementById("symbolBuilderModal"),
    symbolBuilderSvg: document.getElementById("symbolBuilderSvg"),
    symbolBuilderLayer: document.getElementById("symbolBuilderLayer"),
    deleteSymbolBuilderItem: document.getElementById("deleteSymbolBuilderItem"),
    clearSymbolBuilder: document.getElementById("clearSymbolBuilder"),
    symbolBuilderEmpty: document.getElementById("symbolBuilderEmpty"),
    symbolBuilderTextWrap: document.getElementById("symbolBuilderTextWrap"),
    symbolBuilderText: document.getElementById("symbolBuilderText"),
    symbolBuilderSizeWrap: document.getElementById("symbolBuilderSizeWrap"),
    symbolBuilderSize: document.getElementById("symbolBuilderSize"),
    customSymbolName: document.getElementById("customSymbolName"),
    customSymbolCode: document.getElementById("customSymbolCode"),
    saveCustomSymbol: document.getElementById("saveCustomSymbol"),
    propertyForm: document.getElementById("propertyForm"),
    propertyEmpty: document.getElementById("propertyEmpty"),
    propName: document.getElementById("propName"),
    propText: document.getElementById("propText"),
    propComment: document.getElementById("propComment"),
    propCable: document.getElementById("propCable"),
    propCircuit: document.getElementById("propCircuit"),
    propBreaker: document.getElementById("propBreaker"),
    propRoom: document.getElementById("propRoom"),
    propNote: document.getElementById("propNote"),
    propColor: document.getElementById("propColor"),
    propWidth: document.getElementById("propWidth"),
    propRotation: document.getElementById("propRotation"),
    propSize: document.getElementById("propSize"),
    propSymbol: document.getElementById("propSymbol"),
    propTextWrap: document.getElementById("propTextWrap"),
    propWidthWrap: document.getElementById("propWidthWrap"),
    propRotationWrap: document.getElementById("propRotationWrap"),
    propSizeWrap: document.getElementById("propSizeWrap"),
    propSymbolWrap: document.getElementById("propSymbolWrap"),
    propCommentWrap: document.getElementById("propCommentWrap"),
    propCableWrap: document.getElementById("propCableWrap"),
    validationPanel: document.getElementById("validationPanel"),
    layerPhoto: document.getElementById("layerPhoto"),
    layerTemplate: document.getElementById("layerTemplate"),
    layerLines: document.getElementById("layerLines"),
    layerSymbols: document.getElementById("layerSymbols"),
    layerTexts: document.getElementById("layerTexts"),
    layerComments: document.getElementById("layerComments")
  };

  let customSymbols = readCustomSymbols();
  let authContext = null;
  let currentPlanId = null;
  let circuitPlans = [];
  let customers = [];
  let selectedCustomerId = "";
  let selectedCustomerName = "";
  let currentPlanStatus = "draft";
  let linkedProjectId = "";
  let linkedAuftragId = "";
  let planPages = [];
  let currentPageIndex = 0;
  let planVersions = [];
  let customSymbolSaving = false;
  let templateImageDataUrl = "";
  const initialParams = new URLSearchParams(window.location.search || "");
  const initialCustomerId = initialParams.get("customer_id") || "";
  const initialPlanId = initialParams.get("plan_id") || "";
  const initialProjectId = initialParams.get("project_id") || "";
  const initialAuftragId = initialParams.get("auftrag_id") || "";
  let initialPlanLoaded = false;
  linkedProjectId = initialProjectId;
  linkedAuftragId = initialAuftragId;

  const symbolBuilder = {
    tool: "select",
    objects: [],
    selectedId: null,
    mode: null,
    draftId: null,
    startPoint: null,
    objectStart: null
  };

  const state = {
    tool: "select",
    activeSymbol: "switch",
    objects: [],
    selectedId: null,
    background: {
      dataUrl: "",
      visible: true,
      opacity: 0.42
    },
    grid: {
      visible: true,
      snap: true,
      size: LOCK_GRID_SIZE
    },
    layers: {
      lines: true,
      symbols: true,
      texts: true,
      comments: true
    },
    camera: {
      x: 0,
      y: 0,
      width: PLAN.width,
      height: PLAN.height
    }
  };

  const history = {
    undo: [],
    redo: [],
    max: 80
  };

  const pointerState = {
    pointers: new Map(),
    mode: null,
    objectStart: null,
    lineDraft: null,
    lineExtension: null,
    endpointEdit: null,
    lineMoved: false,
    panStart: null,
    pinchStart: null
  };

  planPages = [createPlanPage(1)];

  let controlHistoryActive = false;
  let propertyHistoryActive = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function snapshot() {
    return clone({
      objects: state.objects,
      selectedId: state.selectedId,
      background: state.background,
      grid: state.grid,
      layers: state.layers
    });
  }

  function restore(data) {
    state.objects = clone(data.objects || []);
    state.selectedId = data.selectedId || null;
    state.background = { ...state.background, ...(data.background || {}) };
    state.grid = { ...state.grid, ...(data.grid || {}) };
    state.layers = { ...defaultLayers(), ...(data.layers || {}) };
    syncActiveSymbolFromSelection();
    propertyHistoryActive = false;
    syncControls();
    render();
  }

  function pushHistory() {
    history.undo.push(snapshot());
    if (history.undo.length > history.max) history.undo.shift();
    history.redo = [];
  }

  function undo() {
    if (!history.undo.length) return;
    history.redo.push(snapshot());
    restore(history.undo.pop());
    setStatus("R\u00fcckg\u00e4ngig.");
  }

  function redo() {
    if (!history.redo.length) return;
    history.undo.push(snapshot());
    restore(history.redo.pop());
    setStatus("Wiederholt.");
  }

  function id() {
    return "obj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function builderId() {
    return "sb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text || "";
  }

  function defaultBackground() {
    return {
      dataUrl: "",
      visible: true,
      opacity: 0.42
    };
  }

  function defaultLayers() {
    return {
      lines: true,
      symbols: true,
      texts: true,
      comments: true
    };
  }

  function createPlanPage(number) {
    return {
      id: "page_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      title: "Blatt " + number,
      objects: [],
      background: defaultBackground()
    };
  }

  function customerLabel(customer) {
    if (!customer) return "";
    return cleanString(customer.firma)
      || [customer.vorname, customer.nachname].map(cleanString).filter(Boolean).join(" ")
      || cleanString(customer.email)
      || "Kunde";
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(key => {
      if (key === "href") {
        el.setAttributeNS(XLINK_NS, "href", attrs[key]);
      } else {
        el.setAttribute(key, attrs[key]);
      }
    });
    return el;
  }

  function currentStyle() {
    return {
      color: els.strokeColor ? els.strokeColor.value : DEFAULT_COLOR,
      width: Number(els.strokeWidth ? els.strokeWidth.value : 4)
    };
  }

  function selectedObject() {
    return state.objects.find(item => item.id === state.selectedId) || null;
  }

  function syncActiveSymbolFromSelection() {
    const item = selectedObject();
    if (item && item.type === "symbol") state.activeSymbol = knownSymbol(item.symbol);
  }

  function baseObject(type) {
    return {
      id: id(),
      type,
      name: "",
      circuit: "",
      breaker: "",
      room: "",
      note: ""
    };
  }

  function readNumber(input, fallback) {
    const value = Number(input ? input.value : fallback);
    return Number.isFinite(value) ? value : fallback;
  }

  function cleanString(value) {
    return typeof value === "string" ? value : "";
  }

  function toHexColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value || "") ? value : DEFAULT_COLOR;
  }

  function pointInTemplateWork(point) {
    return (
      point.x >= TEMPLATE_WORK.x
      && point.x <= TEMPLATE_WORK.right
      && point.y >= TEMPLATE_WORK.y
      && point.y <= TEMPLATE_WORK.bottom
    );
  }

  function snapAxisToGrid(value, grid, axis) {
    const min = grid[axis];
    const max = axis === "x" ? grid.right : grid.bottom;
    const snapped = min + Math.round((clamp(value, min, max) - min) / grid.size) * grid.size;
    return Number(clamp(snapped, min, max).toFixed(2));
  }

  function snapAxisToTemplate(value, axis) {
    return snapAxisToGrid(value, DOT_GRID, axis);
  }

  function snapAxisToBuilder(value, axis) {
    return snapAxisToGrid(value, SYMBOL_BUILDER_GRID, axis);
  }

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function sanitizeSymbolElements(elements) {
    if (!Array.isArray(elements)) return [];
    return elements
      .map(item => {
        if (!item || typeof item !== "object") return null;
        if (item.type === "line") {
          const points = builderLinePoints(item);
          return {
            id: cleanString(item.id) || builderId(),
            type: "line",
            x1: points[0].x,
            y1: points[0].y,
            x2: points[points.length - 1].x,
            y2: points[points.length - 1].y,
            points,
            width: clamp(item.width || 5, 1, 12)
          };
        }
        if (item.type === "text") {
          return {
            id: cleanString(item.id) || builderId(),
            type: "text",
            x: snapAxisToBuilder(item.x, "x"),
            y: snapAxisToBuilder(item.y, "y"),
            text: cleanString(item.text || "Text").slice(0, 24),
            size: clamp(item.size || 18, 10, 36)
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  function readCustomSymbols() {
    try {
      const items = JSON.parse(localStorage.getItem(CUSTOM_SYMBOL_KEY) || "[]");
      if (!Array.isArray(items)) return [];
      return items
        .map(item => ({
          id: cleanString(item.id),
          label: cleanString(item.label).slice(0, 40),
          detail: cleanString(item.detail || "Eigenes Symbol").slice(0, 40),
          icon: cleanString(item.icon).slice(0, 6),
          group: cleanString(item.group || "Eigene Symbole").slice(0, 40) || "Eigene Symbole",
          elements: sanitizeSymbolElements(item.elements)
        }))
        .filter(item => item.id && !BUILTIN_SYMBOLS.some(def => def.id === item.id) && item.label && item.icon);
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  function writeCustomSymbols() {
    try {
      localStorage.setItem(CUSTOM_SYMBOL_KEY, JSON.stringify(customSymbols));
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  function normalizeCustomSymbol(item) {
    const symbolId = cleanString(item && item.id);
    const label = cleanString(item && item.label).trim().slice(0, 40);
    const icon = cleanString(item && item.icon).trim().slice(0, 6).toUpperCase();
    if (!symbolId || !label || !icon) return null;
    if (BUILTIN_SYMBOLS.some(def => def.id === symbolId)) return null;
    return {
      id: symbolId,
      label,
      detail: cleanString(item && item.detail || "Eigenes Symbol").trim().slice(0, 40) || "Eigenes Symbol",
      icon,
      group: cleanString(item && (item.group || item.symbol_group) || "Eigene Symbole").trim().slice(0, 40) || "Eigene Symbole",
      elements: sanitizeSymbolElements(item && item.elements)
    };
  }

  function mergeCustomSymbols(items) {
    let changed = false;
    (items || []).forEach(item => {
      const symbol = normalizeCustomSymbol(item);
      if (!symbol) return;
      const exists = customSymbols.some(existing => (
        existing.id === symbol.id
        || existing.label.toLowerCase() === symbol.label.toLowerCase()
      ));
      if (exists) {
        const current = customSymbols.find(existing => (
          existing.id === symbol.id
          || existing.label.toLowerCase() === symbol.label.toLowerCase()
        ));
        if (current && !sanitizeSymbolElements(current.elements).length && sanitizeSymbolElements(symbol.elements).length) {
          current.elements = symbol.elements;
          changed = true;
        }
      } else {
        customSymbols.push(symbol);
        changed = true;
      }
    });
    if (changed) {
      customSymbols.sort((a, b) => a.label.localeCompare(b.label, "de"));
      writeCustomSymbols();
    }
    return changed;
  }

  function canSync() {
    return Boolean(window.db && authContext && authContext.company_id);
  }

  function setSyncNote(text, success) {
    if (!els.syncNote) return;
    els.syncNote.textContent = text || "";
    els.syncNote.style.color = success ? "#8fff7d" : "#aaa";
  }

  function syncErrorText(error) {
    const code = error && error.code ? " (" + error.code + ")" : "";
    const message = error && (error.message || error.details) ? (error.message || error.details) : "unbekannter Fehler";
    return message + code;
  }

  function syncTableMissing(error) {
    return error && (error.code === "42P01" || /does not exist/i.test(error.message || ""));
  }

  function allSymbolDefinitions() {
    return BUILTIN_SYMBOLS.concat(customSymbols);
  }

  function symbolDefinition(symbol) {
    return allSymbolDefinitions().find(item => item.id === symbol) || BUILTIN_SYMBOLS[0];
  }

  function isCustomSymbol(symbol) {
    return customSymbols.some(item => item.id === symbol);
  }

  function knownSymbol(value) {
    return allSymbolDefinitions().some(item => item.id === value) ? value : "switch";
  }

  function snapValue(value) {
    return snapAxisToTemplate(value, "x");
  }

  function snapPoint(point) {
    return {
      x: snapAxisToTemplate(point.x, "x"),
      y: snapAxisToTemplate(point.y, "y")
    };
  }

  function snapBuilderPoint(point) {
    return {
      x: snapAxisToBuilder(point.x, "x"),
      y: snapAxisToBuilder(point.y, "y")
    };
  }

  function cleanBuilderRoutePoints(points) {
    return (points || [])
      .map(point => snapBuilderPoint(point))
      .filter((point, index, list) => index === 0 || !samePoint(point, list[index - 1]));
  }

  function routeBuilderPoints(start, end) {
    const a = snapBuilderPoint(start);
    const b = snapBuilderPoint(end);
    const points = [a];
    if (!samePoint(a, b) && Math.abs(a.x - b.x) > 0.05 && Math.abs(a.y - b.y) > 0.05) {
      points.push(snapBuilderPoint({ x: b.x, y: a.y }));
    }
    points.push(b);
    return cleanBuilderRoutePoints(points);
  }

  function builderLinePoints(item) {
    if (Array.isArray(item.points) && item.points.length >= 2) return cleanBuilderRoutePoints(item.points);
    return cleanBuilderRoutePoints([
      { x: item.x1, y: item.y1 },
      { x: item.x2, y: item.y2 }
    ]);
  }

  function setBuilderLinePoints(item, points) {
    const clean = cleanBuilderRoutePoints(points);
    const fallback = clean.length >= 2 ? clean : routeBuilderPoints({ x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 });
    if (fallback.length === 1) fallback.push({ ...fallback[0] });
    item.points = fallback;
    item.x1 = fallback[0].x;
    item.y1 = fallback[0].y;
    item.x2 = fallback[fallback.length - 1].x;
    item.y2 = fallback[fallback.length - 1].y;
  }

  function samePoint(a, b) {
    return Boolean(a && b && Math.abs(a.x - b.x) < 0.05 && Math.abs(a.y - b.y) < 0.05);
  }

  function pointKey(point) {
    return Number(point.x).toFixed(1) + ":" + Number(point.y).toFixed(1);
  }

  function cleanRoutePoints(points) {
    return (points || [])
      .map(point => snapPoint(point))
      .filter((point, index, list) => index === 0 || !samePoint(point, list[index - 1]));
  }

  function routePoints(start, end) {
    const a = snapPoint(start);
    const b = snapPoint(end);
    const points = [a];
    if (!samePoint(a, b) && Math.abs(a.x - b.x) > 0.05 && Math.abs(a.y - b.y) > 0.05) {
      points.push(snapPoint({ x: b.x, y: a.y }));
    }
    points.push(b);
    return cleanRoutePoints(points);
  }

  function linePoints(item) {
    if (Array.isArray(item.points) && item.points.length >= 2) return cleanRoutePoints(item.points);
    return cleanRoutePoints([
      { x: item.x1, y: item.y1 },
      { x: item.x2, y: item.y2 }
    ]);
  }

  function setLinePoints(item, points) {
    const clean = cleanRoutePoints(points);
    const fallback = clean.length >= 2 ? clean : routePoints({ x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 });
    if (fallback.length === 1) fallback.push({ ...fallback[0] });
    item.points = fallback;
    item.x1 = fallback[0].x;
    item.y1 = fallback[0].y;
    item.x2 = fallback[fallback.length - 1].x;
    item.y2 = fallback[fallback.length - 1].y;
  }

  function lineLength(item) {
    const points = linePoints(item);
    return points.slice(1).reduce((sum, point, index) => {
      const prev = points[index];
      return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
    }, 0);
  }

  function pointsAttribute(points) {
    return points.map(point => point.x + "," + point.y).join(" ");
  }

  function nearestLineEndpoint(point) {
    let best = null;
    state.objects.forEach(item => {
      if (item.type !== "line") return;
      const points = linePoints(item);
      [
        { index: 0, point: points[0] },
        { index: points.length - 1, point: points[points.length - 1] }
      ].forEach(endpoint => {
        const distance = Math.hypot(endpoint.point.x - point.x, endpoint.point.y - point.y);
        if (distance <= LOCK_GRID_SIZE * 0.55 && (!best || distance < best.distance)) {
          best = {
            item,
            index: endpoint.index,
            point: endpoint.point,
            distance
          };
        }
      });
    });
    return best;
  }

  function clientToPlan(event) {
    const point = clientToSvgPoint(els.svg, event);
    return { x: point.x, y: point.y };
  }

  function applyCamera() {
    els.svg.setAttribute("viewBox", [
      state.camera.x,
      state.camera.y,
      state.camera.width,
      state.camera.height
    ].join(" "));
  }

  function zoomAt(factor, center) {
    const cx = center ? center.x : state.camera.x + state.camera.width / 2;
    const cy = center ? center.y : state.camera.y + state.camera.height / 2;
    const nextWidth = Math.max(160, Math.min(PLAN.width * 4, state.camera.width * factor));
    const nextHeight = Math.max(110, Math.min(PLAN.height * 4, state.camera.height * factor));
    state.camera.x = cx - (cx - state.camera.x) * (nextWidth / state.camera.width);
    state.camera.y = cy - (cy - state.camera.y) * (nextHeight / state.camera.height);
    state.camera.width = nextWidth;
    state.camera.height = nextHeight;
    applyCamera();
  }

  function resetZoom() {
    state.camera = { x: 0, y: 0, width: PLAN.width, height: PLAN.height };
    applyCamera();
  }

  function panBy(dx, dy) {
    state.camera.x -= dx;
    state.camera.y -= dy;
    applyCamera();
  }

  function setActiveSymbol(symbol) {
    state.activeSymbol = knownSymbol(symbol);
    if (els.symbolType) els.symbolType.value = state.activeSymbol;
    syncControls();
  }

  function syncControls() {
    document.querySelectorAll("[data-tool]").forEach(button => {
      button.classList.toggle("active", button.dataset.tool === state.tool);
    });

    const gridButton = document.querySelector("[data-toggle='grid']");
    const bgButton = document.querySelector("[data-toggle='background']");
    const snapButton = document.querySelector("[data-toggle='snap']");
    if (gridButton) gridButton.classList.toggle("active", state.grid.visible);
    if (bgButton) bgButton.classList.toggle("active", state.background.visible);
    if (snapButton) snapButton.classList.toggle("active", true);
    if (els.bgOpacity) els.bgOpacity.value = Math.round(state.background.opacity * 100);
    if (els.gridSize) els.gridSize.value = LOCK_GRID_SIZE;
    if (els.symbolType) els.symbolType.value = state.activeSymbol;
    if (els.planStatus) els.planStatus.value = currentPlanStatus;
    if (els.layerPhoto) els.layerPhoto.checked = state.background.visible;
    if (els.layerTemplate) els.layerTemplate.checked = state.grid.visible;
    if (els.layerLines) els.layerLines.checked = state.layers.lines !== false;
    if (els.layerSymbols) els.layerSymbols.checked = state.layers.symbols !== false;
    if (els.layerTexts) els.layerTexts.checked = state.layers.texts !== false;
    if (els.layerComments) els.layerComments.checked = state.layers.comments !== false;
    document.querySelectorAll("[data-symbol]").forEach(button => {
      button.classList.toggle("active", button.dataset.symbol === state.activeSymbol);
    });
  }

  function renderSymbolOptions() {
    [els.symbolType, els.propSymbol].filter(Boolean).forEach(select => {
      const current = knownSymbol(select.value || state.activeSymbol);
      select.innerHTML = "";
      allSymbolDefinitions().forEach(def => {
        const option = document.createElement("option");
        option.value = def.id;
        option.textContent = def.label;
        select.appendChild(option);
      });
      select.value = knownSymbol(current);
    });
  }

  function symbolGroup(def) {
    return cleanString(def && def.group).trim() || (isCustomSymbol(def && def.id) ? "Eigene Symbole" : "Allgemein");
  }

  function renderSymbolGroups() {
    if (!els.symbolGroup) return;
    const current = els.symbolGroup.value || "";
    const groups = Array.from(new Set(allSymbolDefinitions().map(symbolGroup))).sort((a, b) => a.localeCompare(b, "de"));
    els.symbolGroup.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Alle Gruppen";
    els.symbolGroup.appendChild(empty);
    groups.forEach(group => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      els.symbolGroup.appendChild(option);
    });
    els.symbolGroup.value = groups.includes(current) ? current : "";
  }

  function appendCustomSymbolElements(parent, elements, options) {
    const opts = options || {};
    const color = opts.color || DEFAULT_COLOR;
    const scale = Number.isFinite(Number(opts.scale)) ? Number(opts.scale) : 1;
    const centered = Boolean(opts.centered);
    const x = value => centered ? (Number(value) - 100) * scale : Number(value);
    const y = value => centered ? (Number(value) - 100) * scale : Number(value);

    sanitizeSymbolElements(elements).forEach(item => {
      if (item.type === "line") {
        const points = builderLinePoints(item).map(point => ({
          x: x(point.x),
          y: y(point.y)
        }));
        parent.appendChild(svgEl("polyline", {
          points: pointsAttribute(points),
          stroke: color,
          "stroke-width": Math.max(1, (item.width || 5) * scale),
          "stroke-linecap": "butt",
          "stroke-linejoin": "round",
          fill: "none"
        }));
      }

      if (item.type === "text") {
        const text = svgEl("text", {
          x: x(item.x),
          y: y(item.y),
          fill: color,
          stroke: "none",
          "font-size": Math.max(4, (item.size || 18) * scale),
          "font-weight": "900",
          "font-family": "Arial, sans-serif",
          "text-anchor": "middle"
        });
        text.textContent = item.text || "Text";
        parent.appendChild(text);
      }
    });
  }

  function renderSymbolPreviewIcon(container, def) {
    const elements = sanitizeSymbolElements(def.elements);
    if (!elements.length) {
      container.textContent = def.icon || def.label.slice(0, 1);
      return;
    }

    container.textContent = "";
    const preview = svgEl("svg", {
      viewBox: "0 0 200 200",
      width: "26",
      height: "26",
      "aria-hidden": "true",
      focusable: "false"
    });
    appendCustomSymbolElements(preview, elements, { color: "#fff" });
    container.appendChild(preview);
  }

  function renderSymbolPalette() {
    if (!els.symbolList) return;
    els.symbolList.innerHTML = "";
    renderSymbolGroups();
    const query = cleanString(els.symbolSearch && els.symbolSearch.value).trim().toLowerCase();
    const groupFilter = cleanString(els.symbolGroup && els.symbolGroup.value).trim();
    let lastGroup = "";
    const filtered = allSymbolDefinitions().filter(def => {
      const haystack = [def.label, def.detail, def.icon, symbolGroup(def)].map(cleanString).join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!groupFilter || symbolGroup(def) === groupFilter);
    });
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "panel-copy";
      empty.textContent = "Kein Symbol gefunden.";
      els.symbolList.appendChild(empty);
      syncControls();
      return;
    }
    filtered.forEach(def => {
      const group = symbolGroup(def);
      if (group !== lastGroup) {
        const title = document.createElement("p");
        title.className = "symbol-list-title";
        title.textContent = group;
        els.symbolList.appendChild(title);
        lastGroup = group;
      }
      const row = document.createElement("div");
      row.className = "symbol-row";
      if (!isCustomSymbol(def.id)) row.style.gridTemplateColumns = "1fr";

      const button = document.createElement("button");
      button.className = "symbol-palette-btn";
      if (isCustomSymbol(def.id)) button.classList.add("custom-symbol");
      button.type = "button";
      button.dataset.symbol = def.id;

      const icon = document.createElement("span");
      icon.className = "symbol-icon";
      renderSymbolPreviewIcon(icon, def);

      const copy = document.createElement("span");
      copy.className = "symbol-copy";
      copy.textContent = def.label;

      const detail = document.createElement("small");
      detail.textContent = def.detail || (isCustomSymbol(def.id) ? "Eigenes Symbol" : "");
      copy.appendChild(detail);

      button.appendChild(icon);
      button.appendChild(copy);
      row.appendChild(button);

      if (isCustomSymbol(def.id)) {
        const deleteButton = document.createElement("button");
        deleteButton.className = "symbol-delete-btn";
        deleteButton.type = "button";
        deleteButton.dataset.deleteSymbol = def.id;
        deleteButton.setAttribute("aria-label", def.label + " l\u00f6schen");
        deleteButton.textContent = "\u00d7";
        row.appendChild(deleteButton);
      }

      els.symbolList.appendChild(row);
    });
    syncControls();
  }

  function renderPlanSelect(selectedId) {
    if (!els.planSelect) return;
    const active = selectedId || currentPlanId || "";
    els.planSelect.innerHTML = "";

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = circuitPlans.length ? "Gespeicherte Schaltpl\u00e4ne" : "Noch keine Schaltpl\u00e4ne";
    els.planSelect.appendChild(empty);

    circuitPlans.forEach(plan => {
      const option = document.createElement("option");
      const title = cleanString(plan.title).trim() || "Schaltplan";
      const customer = cleanString(plan.customer_name).trim();
      const status = plan.status ? " | " + statusLabel(plan.status) : "";
      const date = plan.updated_at ? " - " + new Date(plan.updated_at).toLocaleDateString("de-DE") : "";
      option.value = plan.id;
      option.textContent = title + (customer ? " | " + customer : "") + status + date;
      els.planSelect.appendChild(option);
    });

    els.planSelect.value = active;
    if (els.planSelect.value !== active) els.planSelect.value = "";
  }

  function renderCustomerSelect() {
    if (!els.planCustomer) return;
    const active = selectedCustomerId || "";
    els.planCustomer.innerHTML = "";

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = customers.length ? "Kunde zuweisen" : "Keine Kunden geladen";
    els.planCustomer.appendChild(empty);

    customers.forEach(customer => {
      const option = document.createElement("option");
      option.value = customer.id;
      option.textContent = customerLabel(customer);
      els.planCustomer.appendChild(option);
    });

    els.planCustomer.value = active;
    if (els.planCustomer.value !== active) els.planCustomer.value = "";
  }

  function saveCurrentPageState() {
    if (!planPages.length) planPages = [createPlanPage(1)];
    const page = planPages[currentPageIndex] || planPages[0];
    page.objects = clone(state.objects || []);
    page.background = clone(state.background || defaultBackground());
  }

  function normalizePlanPage(page, number) {
    const source = page && typeof page === "object" ? page : {};
    return {
      id: cleanString(source.id) || createPlanPage(number).id,
      title: cleanString(source.title) || "Blatt " + number,
      objects: Array.isArray(source.objects) ? clone(source.objects) : [],
      background: {
        ...defaultBackground(),
        ...(source.background && typeof source.background === "object" ? source.background : {})
      }
    };
  }

  function applyCurrentPageState() {
    if (!planPages.length) planPages = [createPlanPage(1)];
    currentPageIndex = Math.max(0, Math.min(currentPageIndex, planPages.length - 1));
    const page = planPages[currentPageIndex];
    state.objects = clone(page.objects || []);
    state.selectedId = null;
    state.background = { ...defaultBackground(), ...(page.background || {}) };
    propertyHistoryActive = false;
    controlHistoryActive = false;
    history.undo = [];
    history.redo = [];
    syncControls();
    renderPageSelect();
    render();
  }

  function renderPageSelect() {
    if (!els.pageSelect) return;
    els.pageSelect.innerHTML = "";
    planPages.forEach((page, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = page.title || ("Blatt " + (index + 1));
      els.pageSelect.appendChild(option);
    });
    els.pageSelect.value = String(currentPageIndex);
    if (els.deleteCircuitPage) els.deleteCircuitPage.disabled = planPages.length <= 1;
  }

  function renderVersionSelect() {
    if (!els.versionSelect) return;
    els.versionSelect.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = planVersions.length ? "Versionen" : "Keine Versionen";
    els.versionSelect.appendChild(empty);
    planVersions.forEach(version => {
      const option = document.createElement("option");
      option.value = version.id;
      const date = version.created_at ? new Date(version.created_at).toLocaleString("de-DE") : "";
      option.textContent = (version.title || "Version") + (date ? " | " + date : "");
      els.versionSelect.appendChild(option);
    });
    if (els.restoreCircuitVersion) els.restoreCircuitVersion.disabled = !planVersions.length;
  }

  function switchPage(indexValue) {
    const nextIndex = Number(indexValue);
    if (!Number.isFinite(nextIndex) || nextIndex < 0 || nextIndex >= planPages.length || nextIndex === currentPageIndex) {
      renderPageSelect();
      return;
    }
    saveCurrentPageState();
    currentPageIndex = nextIndex;
    applyCurrentPageState();
    setStatus((planPages[currentPageIndex].title || "Blatt") + " geladen.");
  }

  function addCircuitPage() {
    saveCurrentPageState();
    planPages.push(createPlanPage(planPages.length + 1));
    currentPageIndex = planPages.length - 1;
    applyCurrentPageState();
    setStatus("Neues Blatt hinzugef\u00fcgt.");
  }

  function deleteCircuitPage() {
    if (planPages.length <= 1) {
      setStatus("Mindestens ein Blatt bleibt im Plan.");
      return;
    }
    const pageName = planPages[currentPageIndex].title || "dieses Blatt";
    if (!confirm(pageName + " wirklich l\u00f6schen?")) return;
    planPages.splice(currentPageIndex, 1);
    planPages.forEach((page, index) => {
      page.title = "Blatt " + (index + 1);
    });
    currentPageIndex = Math.max(0, currentPageIndex - 1);
    applyCurrentPageState();
    setStatus("Blatt gel\u00f6scht.");
  }

  function selectPlanCustomer(customerId) {
    selectedCustomerId = cleanString(customerId);
    const customer = customers.find(item => item.id === selectedCustomerId);
    selectedCustomerName = customer ? customerLabel(customer) : "";
    renderCustomerSelect();
    renderTemplateFields();
  }

  function defaultPlanTitle() {
    return "Schaltplan " + new Date().toLocaleDateString("de-DE");
  }

  function planPayload() {
    saveCurrentPageState();
    return {
      version: 1,
      status: currentPlanStatus,
      objects: clone(state.objects),
      pages: clone(planPages),
      currentPageIndex,
      background: clone(state.background),
      grid: clone(state.grid),
      layers: clone(state.layers),
      camera: clone(state.camera),
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomerName || "",
      project_id: linkedProjectId || null,
      auftrag_id: linkedAuftragId || null,
      versions: clone(planVersions)
    };
  }

  function makeVersionEntry(title, data) {
    return {
      id: "ver_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      title: title || defaultPlanTitle(),
      created_at: new Date().toISOString(),
      page_count: planPages.length,
      data: clone({
        ...data,
        versions: []
      })
    };
  }

  function validCamera(camera) {
    if (!camera || typeof camera !== "object") return null;
    const next = {
      x: Number(camera.x),
      y: Number(camera.y),
      width: Number(camera.width),
      height: Number(camera.height)
    };
    if (!Number.isFinite(next.x) || !Number.isFinite(next.y) || !Number.isFinite(next.width) || !Number.isFinite(next.height)) {
      return null;
    }
    next.width = Math.max(160, Math.min(PLAN.width * 4, next.width));
    next.height = Math.max(110, Math.min(PLAN.height * 4, next.height));
    return next;
  }

  function applyPlan(plan) {
    const data = plan && plan.plan_data && typeof plan.plan_data === "object" ? plan.plan_data : {};
    const background = data.background && typeof data.background === "object" ? data.background : {};
    const grid = data.grid && typeof data.grid === "object" ? data.grid : {};
    const storedPages = Array.isArray(data.pages) && data.pages.length
      ? data.pages
      : [{
        title: "Blatt 1",
        objects: Array.isArray(data.objects) ? data.objects : [],
        background
      }];

    planPages = storedPages.map((page, index) => normalizePlanPage(page, index + 1));
    currentPageIndex = Math.max(0, Math.min(Number(data.currentPageIndex || 0), planPages.length - 1));
    const currentPage = planPages[currentPageIndex];
    state.objects = clone(currentPage.objects || []);
    state.selectedId = null;
    state.background = {
      ...defaultBackground(),
      ...(currentPage.background || {})
    };
    state.grid = {
      visible: grid.visible !== false,
      snap: true,
      size: LOCK_GRID_SIZE
    };
    state.layers = {
      ...defaultLayers(),
      ...(data.layers && typeof data.layers === "object" ? data.layers : {})
    };
    state.camera = validCamera(data.camera) || { x: 0, y: 0, width: PLAN.width, height: PLAN.height };
    currentPlanId = plan && plan.id ? plan.id : null;
    selectedCustomerId = cleanString(plan && plan.customer_id || data.customer_id);
    selectedCustomerName = cleanString(plan && plan.customer_name || data.customer_name);
    currentPlanStatus = cleanString(plan && plan.status || data.status || "draft") || "draft";
    linkedProjectId = cleanString(plan && plan.project_id || data.project_id || linkedProjectId);
    linkedAuftragId = cleanString(plan && plan.auftrag_id || data.auftrag_id || linkedAuftragId);
    planVersions = Array.isArray(data.versions) ? data.versions.slice(0, 12) : [];
    history.undo = [];
    history.redo = [];
    propertyHistoryActive = false;
    controlHistoryActive = false;

    if (els.planTitle) els.planTitle.value = cleanString(plan && plan.title);
    if (els.planStatus) els.planStatus.value = currentPlanStatus;
    if (els.planSelect) els.planSelect.value = currentPlanId || "";
    renderCustomerSelect();
    renderPageSelect();
    renderVersionSelect();
    syncActiveSymbolFromSelection();
    syncControls();
    applyCamera();
    render();
  }

  async function ensureSyncContext() {
    if (canSync()) return true;

    if (!window.db || !window.BaudokuAuthContext) {
      setSyncNote("Offline/Lokal: Synchronisation ist hier noch nicht verf\u00fcgbar.");
      renderPlanSelect();
      return false;
    }

    try {
      authContext = await window.BaudokuAuthContext.loadAuthContext({ noCache: true });
    } catch (error) {
      console.log(error);
      authContext = null;
    }

    if (!authContext || !authContext.company_id) {
      setSyncNote("Bitte mit einer Firma anmelden, dann werden Schaltpl\u00e4ne und Bibliothek synchronisiert.");
      renderPlanSelect();
      return false;
    }

    return true;
  }

  async function loadSharedSymbols() {
    if (!canSync()) return false;

    const { data, error } = await window.db
      .from("circuit_symbols")
      .select("id,label,detail,icon,symbol_group,elements")
      .eq("company_id", authContext.company_id)
      .order("label", { ascending: true });

    if (error) {
      console.log(error);
      setSyncNote(syncTableMissing(error)
        ? "Datenbank-Update fehlt noch: Symbolbibliothek bleibt bis dahin lokal."
        : "Symbolbibliothek konnte nicht geladen werden: " + syncErrorText(error));
      return false;
    }

    mergeCustomSymbols(data || []);
    renderSymbolOptions();
    renderSymbolPalette();
    return true;
  }

  async function loadCustomers() {
    if (!canSync()) {
      renderCustomerSelect();
      return false;
    }

    const { data, error } = await window.db
      .from("customers")
      .select("id,firma,vorname,nachname,email")
      .eq("company_id", authContext.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setSyncNote("Kunden konnten nicht geladen werden: " + syncErrorText(error));
      renderCustomerSelect();
      return false;
    }

    customers = data || [];
    if (initialCustomerId && !selectedCustomerId && customers.some(customer => String(customer.id) === String(initialCustomerId))) {
      selectedCustomerId = initialCustomerId;
      const customer = customers.find(item => String(item.id) === String(selectedCustomerId));
      selectedCustomerName = customer ? customerLabel(customer) : "";
    }
    renderCustomerSelect();
    return true;
  }

  async function loadCircuitPlans(selectedId) {
    if (!canSync()) {
      renderPlanSelect();
      return false;
    }

    const { data, error } = await window.db
      .from("circuit_plans")
      .select("id,title,updated_at,customer_id,customer_name,status,project_id,auftrag_id")
      .eq("company_id", authContext.company_id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.log(error);
      setSyncNote(syncTableMissing(error)
        ? "Datenbank-Update fehlt noch: Schaltpl\u00e4ne bleiben bis dahin lokal."
        : "Schaltpl\u00e4ne konnten nicht geladen werden: " + syncErrorText(error));
      renderPlanSelect();
      return false;
    }

    circuitPlans = data || [];
    renderPlanSelect(selectedId);
    return true;
  }

  async function refreshSharedData() {
    const ready = await ensureSyncContext();
    if (!ready) return;

    setSyncNote("Synchronisiere Schaltpl\u00e4ne und Symbolbibliothek...");
    await syncOfflinePlanQueue();
    const symbolsOk = await loadSharedSymbols();
    const customersOk = await loadCustomers();
    const plansOk = await loadCircuitPlans(currentPlanId);
    if (symbolsOk && customersOk && plansOk) {
      setSyncNote("Synchronisiert: alle Firmenmitarbeiter sehen die Pl\u00e4ne und die Bibliothek.", true);
    }
    if (initialPlanId && !initialPlanLoaded && els.planSelect) {
      initialPlanLoaded = true;
      els.planSelect.value = initialPlanId;
      if (els.planSelect.value === initialPlanId) await loadSelectedPlan();
    } else if (initialAuftragId && !initialPlanLoaded && els.planSelect) {
      const match = circuitPlans.find(plan => String(plan.auftrag_id || "") === String(initialAuftragId));
      if (match) {
        initialPlanLoaded = true;
        els.planSelect.value = match.id;
        await loadSelectedPlan();
      }
    }
  }

  function readOfflinePlanQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(OFFLINE_PLAN_QUEUE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  function writeOfflinePlanQueue(queue) {
    localStorage.setItem(OFFLINE_PLAN_QUEUE_KEY, JSON.stringify((queue || []).slice(-20)));
  }

  function queueOfflinePlan(payload) {
    const queue = readOfflinePlanQueue();
    const offlinePayload = { ...(payload || {}) };
    if (currentPlanId && isUuid(currentPlanId)) offlinePayload.id = currentPlanId;
    queue.push({
      id: currentPlanId || ("offline_" + Date.now().toString(36)),
      payload: offlinePayload,
      queued_at: new Date().toISOString()
    });
    writeOfflinePlanQueue(queue);
    setSyncNote("Offline gespeichert. Der Plan wird sp\u00e4ter automatisch synchronisiert.");
    setStatus("Schaltplan offline gespeichert.");
  }

  async function syncOfflinePlanQueue() {
    if (!canSync()) return false;
    const queue = readOfflinePlanQueue();
    if (!queue.length) return true;
    const remaining = [];
    for (const item of queue) {
      const payload = {
        ...(item.payload || {}),
        company_id: authContext.company_id,
        updated_by: authContext.user_id || null,
        updated_at: new Date().toISOString()
      };
      if (!payload.created_by) payload.created_by = authContext.user_id || null;
      const { error } = await window.db
        .from("circuit_plans")
        .upsert(payload, { onConflict: "id" });
      if (error) {
        console.log(error);
        remaining.push(item);
      }
    }
    writeOfflinePlanQueue(remaining);
    if (remaining.length !== queue.length) {
      setSyncNote("Offline gespeicherte Schaltpl\u00e4ne synchronisiert.", true);
      await loadCircuitPlans(currentPlanId);
    }
    return !remaining.length;
  }

  async function saveCircuitPlan() {
    const title = cleanString(els.planTitle && els.planTitle.value).trim() || defaultPlanTitle();
    currentPlanStatus = cleanString(els.planStatus && els.planStatus.value || currentPlanStatus || "draft");
    selectPlanCustomer(els.planCustomer ? els.planCustomer.value : selectedCustomerId);
    const versionSource = planPayload();
    planVersions = [makeVersionEntry(title, versionSource)]
      .concat(planVersions)
      .slice(0, 12);
    const payload = {
      title,
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomerName || "",
      status: currentPlanStatus,
      project_id: linkedProjectId || null,
      auftrag_id: linkedAuftragId || null,
      plan_data: planPayload(),
      updated_by: authContext && authContext.user_id || null,
      updated_at: new Date().toISOString()
    };

    const ready = await ensureSyncContext();
    if (!ready) {
      queueOfflinePlan(payload);
      return;
    }

    setSyncNote("Speichere Schaltplan...");
    const query = currentPlanId
      ? window.db
        .from("circuit_plans")
        .update(payload)
        .eq("company_id", authContext.company_id)
        .eq("id", currentPlanId)
        .select("id,title,updated_at,customer_id,customer_name,status,project_id,auftrag_id")
        .single()
      : window.db
        .from("circuit_plans")
        .insert({
          ...payload,
          company_id: authContext.company_id,
          created_by: authContext.user_id || null
        })
        .select("id,title,updated_at,customer_id,customer_name,status,project_id,auftrag_id")
        .single();

    const { data, error } = await query;
    if (error) {
      console.log(error);
      setSyncNote(syncTableMissing(error)
        ? "Datenbank-Update fehlt noch: Plan konnte noch nicht online gespeichert werden."
        : "Plan konnte nicht gespeichert werden: " + syncErrorText(error));
      setStatus("Speichern nicht abgeschlossen.");
      return;
    }

    currentPlanId = data.id;
    selectedCustomerId = cleanString(data.customer_id || selectedCustomerId);
    selectedCustomerName = cleanString(data.customer_name || selectedCustomerName);
    currentPlanStatus = cleanString(data.status || currentPlanStatus || "draft");
    if (els.planTitle) els.planTitle.value = title;
    renderCustomerSelect();
    renderVersionSelect();
    renderTemplateFields();
    await loadCircuitPlans(currentPlanId);
    setSyncNote("Gespeichert und synchronisiert.", true);
    setStatus("Schaltplan gespeichert.");
  }

  async function loadSelectedPlan() {
    const planId = els.planSelect ? els.planSelect.value : "";
    if (!planId) return;
    const ready = await ensureSyncContext();
    if (!ready) return;

    const { data, error } = await window.db
      .from("circuit_plans")
      .select("id,title,plan_data,updated_at,customer_id,customer_name,status,project_id,auftrag_id")
      .eq("company_id", authContext.company_id)
      .eq("id", planId)
      .single();

    if (error) {
      console.log(error);
      setSyncNote("Plan konnte nicht geladen werden: " + syncErrorText(error));
      return;
    }

    applyPlan(data);
    setSyncNote("Plan geladen.", true);
    setStatus("Schaltplan geladen.");
  }

  function newCircuitPlan() {
    if ((state.objects.length || state.background.dataUrl) && !confirm("Neuen leeren Plan starten? Nicht gespeicherte \u00c4nderungen gehen verloren.")) {
      return;
    }

    state.objects = [];
    state.selectedId = null;
    state.background = { dataUrl: "", visible: true, opacity: 0.42 };
    state.grid = { visible: true, snap: true, size: LOCK_GRID_SIZE };
    state.layers = defaultLayers();
    state.camera = { x: 0, y: 0, width: PLAN.width, height: PLAN.height };
    planPages = [createPlanPage(1)];
    currentPageIndex = 0;
    selectedCustomerId = initialCustomerId || "";
    selectedCustomerName = "";
    currentPlanStatus = "draft";
    linkedProjectId = initialProjectId || "";
    linkedAuftragId = initialAuftragId || "";
    planVersions = [];
    currentPlanId = null;
    history.undo = [];
    history.redo = [];
    propertyHistoryActive = false;
    controlHistoryActive = false;

    if (els.planTitle) els.planTitle.value = "";
    if (els.planSelect) els.planSelect.value = "";
    renderCustomerSelect();
    renderPageSelect();
    renderVersionSelect();
    syncControls();
    applyCamera();
    render();
    setStatus("Neuer Schaltplan bereit.");
  }

  function restoreSelectedVersion() {
    if (!els.versionSelect || !els.versionSelect.value) {
      setStatus("Bitte zuerst eine Version ausw\u00e4hlen.");
      return;
    }
    const version = planVersions.find(item => item.id === els.versionSelect.value);
    if (!version || !version.data) return;
    if (!confirm("Diese Version laden? Nicht gespeicherte \u00c4nderungen auf dem aktuellen Blatt werden ersetzt.")) return;
    const keepVersions = clone(planVersions);
    applyPlan({
      id: currentPlanId,
      title: version.title || cleanString(els.planTitle && els.planTitle.value) || defaultPlanTitle(),
      customer_id: selectedCustomerId || version.data.customer_id || null,
      customer_name: selectedCustomerName || version.data.customer_name || "",
      plan_data: version.data
    });
    planVersions = keepVersions;
    renderVersionSelect();
    setStatus("Version geladen. Mit Plan speichern wird sie wieder synchronisiert.");
  }

  async function persistSharedSymbol(symbol) {
    if (!canSync()) return { symbol, synced: false };

    const { data, error } = await window.db
      .from("circuit_symbols")
      .insert({
        company_id: authContext.company_id,
        label: symbol.label,
        detail: symbol.detail,
        icon: symbol.icon,
        symbol_group: symbol.group || "Eigene Symbole",
        elements: sanitizeSymbolElements(symbol.elements),
        created_by: authContext.user_id || null
      })
      .select("id,label,detail,icon,symbol_group,elements")
      .single();

    if (error && error.code === "23505") {
      await loadSharedSymbols();
      const existing = customSymbols.find(item => item.label.toLowerCase() === symbol.label.toLowerCase());
      if (existing) return { symbol: existing, synced: true };
    }

    if (error) return { symbol, synced: false, error };
    return { symbol: normalizeCustomSymbol(data) || symbol, synced: true };
  }

  async function deleteCustomSymbol(symbolId) {
    const symbol = customSymbols.find(item => item.id === symbolId);
    if (!symbol) return;
    if (!confirm("Symbol \"" + symbol.label + "\" wirklich l\u00f6schen?")) return;

    saveCurrentPageState();
    customSymbols = customSymbols.filter(item => item.id !== symbolId);
    writeCustomSymbols();
    if (state.activeSymbol === symbolId) state.activeSymbol = "switch";
    state.objects.forEach(item => {
      if (item.type === "symbol" && item.symbol === symbolId) item.symbol = "switch";
    });
    planPages.forEach(page => {
      (page.objects || []).forEach(item => {
        if (item.type === "symbol" && item.symbol === symbolId) item.symbol = "switch";
      });
    });
    renderSymbolOptions();
    renderSymbolPalette();
    render();

    if (canSync() && isUuid(symbolId)) {
      const { error } = await window.db
        .from("circuit_symbols")
        .delete()
        .eq("company_id", authContext.company_id)
        .eq("id", symbolId);
      if (error) {
        console.log(error);
        setSyncNote("Symbol wurde lokal entfernt, online aber noch nicht gel\u00f6scht: " + syncErrorText(error));
        return;
      }
      setSyncNote("Symbol gel\u00f6scht und synchronisiert.", true);
    }
    setStatus("Symbol gel\u00f6scht.");
  }

  function render() {
    renderGrid();
    renderBackground();
    renderObjects();
    renderConnections();
    renderEndpoints();
    renderLegend();
    renderTemplateFields();
    renderProperties();
  }

  function renderGrid() {
    if (els.templateImage) els.templateImage.style.display = state.grid.visible ? "" : "none";
    if (els.gridLayer) els.gridLayer.style.display = state.grid.visible ? "" : "none";
  }

  function renderBackground() {
    if (!state.background.dataUrl || !state.background.visible) {
      els.backgroundImage.style.display = "none";
      return;
    }
    els.backgroundImage.style.display = "";
    els.backgroundImage.setAttribute("href", state.background.dataUrl);
    els.backgroundImage.setAttributeNS(XLINK_NS, "href", state.background.dataUrl);
    els.backgroundImage.setAttribute("opacity", String(state.background.opacity));
  }

  function setTemplateImageSource(value) {
    if (!els.templateImage || !value) return;
    els.templateImage.setAttribute("href", value);
    els.templateImage.setAttributeNS(XLINK_NS, "href", value);
  }

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function ensureTemplateImageData() {
    if (templateImageDataUrl) {
      setTemplateImageSource(templateImageDataUrl);
      return templateImageDataUrl;
    }
    const response = await fetch(TEMPLATE_IMAGE_PATH);
    if (!response.ok) throw new Error("Vorlage konnte nicht geladen werden.");
    templateImageDataUrl = await blobToDataUrl(await response.blob());
    setTemplateImageSource(templateImageDataUrl);
    return templateImageDataUrl;
  }

  function renderObjects() {
    els.objectLayer.innerHTML = "";
    state.objects.forEach(item => {
      if (item.type === "line" && state.layers.lines === false) return;
      if (item.type === "symbol" && state.layers.symbols === false) return;
      if (item.type === "text" && state.layers.texts === false) return;
      if (item.type === "comment" && state.layers.comments === false) return;
      const el = drawObject(item);
      el.dataset.id = item.id;
      el.classList.toggle("selected-vector", item.id === state.selectedId);
      el.style.cursor = "pointer";
      els.objectLayer.appendChild(el);
    });
  }

  function connectionPoints() {
    const map = new Map();
    state.objects.forEach(item => {
      if (item.type !== "line") return;
      const points = linePoints(item);
      [points[0], points[points.length - 1]].forEach(point => {
        const key = pointKey(point);
        const entry = map.get(key) || { point, count: 0 };
        entry.count += 1;
        map.set(key, entry);
      });
    });
    return Array.from(map.values()).filter(entry => entry.count > 1);
  }

  function renderConnections() {
    if (!els.connectionLayer) return;
    els.connectionLayer.innerHTML = "";
    if (state.layers.lines === false) return;
    connectionPoints().forEach(entry => {
      els.connectionLayer.appendChild(svgEl("circle", {
        cx: entry.point.x,
        cy: entry.point.y,
        r: 3.2,
        fill: DEFAULT_COLOR,
        stroke: "#ffffff",
        "stroke-width": 1.2
      }));
    });
  }

  function renderEndpoints() {
    if (!els.endpointLayer) return;
    els.endpointLayer.innerHTML = "";
    const item = selectedObject();
    if (!item || item.type !== "line" || state.layers.lines === false) return;
    const points = linePoints(item);
    [
      { index: 0, point: points[0], label: "Start" },
      { index: points.length - 1, point: points[points.length - 1], label: "Ende" }
    ].forEach(endpoint => {
      const handle = svgEl("circle", {
        cx: endpoint.point.x,
        cy: endpoint.point.y,
        r: 7,
        fill: "#ff6b3d",
        stroke: "#ffffff",
        "stroke-width": 2,
        "pointer-events": "all"
      });
      handle.classList.add("endpoint-handle");
      handle.dataset.id = item.id;
      handle.dataset.endpoint = String(endpoint.index);
      handle.setAttribute("aria-label", "Leitungs-" + endpoint.label + " verschieben");
      els.endpointLayer.appendChild(handle);
    });
  }

  function lineLabel(item) {
    return [
      cleanString(item.cable),
      cleanString(item.conductor),
      cleanString(item.circuit),
      cleanString(item.breaker)
    ].filter(Boolean).join(" | ");
  }

  function symbolLegendName(item) {
    if (item.type === "symbol") return symbolDefinition(item.symbol).label || "Symbol";
    if (item.type === "line") return lineLabel(item) || "Leitung";
    if (item.type === "comment") return "Kommentar";
    return "";
  }

  function renderLegend() {
    if (!els.legendLayer) return;
    els.legendLayer.innerHTML = "";
    const entries = [];
    state.objects.forEach(item => {
      if (!["line", "symbol", "comment"].includes(item.type)) return;
      const name = symbolLegendName(item);
      if (!name) return;
      const key = item.type + "|" + name + "|" + (item.color || DEFAULT_COLOR);
      if (entries.some(entry => entry.key === key)) return;
      entries.push({ key, type: item.type, name, color: item.color || DEFAULT_COLOR });
    });
    if (!entries.length) return;
    const group = svgEl("g", {});
    const x = 1012;
    const y = 812;
    group.appendChild(svgEl("rect", {
      x,
      y,
      width: 300,
      height: Math.min(98, 28 + entries.slice(0, 5).length * 15),
      rx: 4,
      fill: "rgba(255,255,255,0.86)",
      stroke: "#222",
      "stroke-width": 0.8
    }));
    const title = svgEl("text", {
      x: x + 10,
      y: y + 18,
      fill: DEFAULT_COLOR,
      "font-size": 12,
      "font-weight": "900",
      "font-family": "Arial, sans-serif"
    });
    title.textContent = "Legende";
    group.appendChild(title);
    entries.slice(0, 5).forEach((entry, index) => {
      const yy = y + 36 + index * 15;
      group.appendChild(svgEl("line", {
        x1: x + 10,
        y1: yy - 4,
        x2: x + 30,
        y2: yy - 4,
        stroke: entry.color,
        "stroke-width": entry.type === "line" ? 3 : 0,
        fill: "none"
      }));
      if (entry.type !== "line") {
        group.appendChild(svgEl("circle", {
          cx: x + 20,
          cy: yy - 4,
          r: 4,
          fill: entry.color
        }));
      }
      const text = svgEl("text", {
        x: x + 38,
        y: yy,
        fill: DEFAULT_COLOR,
        "font-size": 11,
        "font-family": "Arial, sans-serif"
      });
      text.textContent = entry.name.slice(0, 38);
      group.appendChild(text);
    });
    els.legendLayer.appendChild(group);
  }

  function titleBlockText(text, x, y, size, anchor) {
    const value = cleanString(text).trim();
    if (!value) return null;
    const node = svgEl("text", {
      x,
      y,
      fill: DEFAULT_COLOR,
      "font-size": size || 14,
      "font-weight": "700",
      "font-family": "Arial, sans-serif",
      "text-anchor": anchor || "start"
    });
    node.textContent = value.slice(0, 48);
    return node;
  }

  function renderTemplateFields() {
    if (!els.templateFieldLayer) return;
    els.templateFieldLayer.innerHTML = "";
    if (state.grid.visible === false) return;
    const title = cleanString(els.planTitle && els.planTitle.value).trim() || defaultPlanTitle();
    const editorName = cleanString(authContext && (authContext.name || authContext.email)).trim();
    const date = new Date().toLocaleDateString("de-DE");
    const drawingNo = currentPlanId ? ("SP-" + String(currentPlanId).slice(0, 8).toUpperCase()) : "SP-NEU";
    const nodes = [
      titleBlockText(editorName, 438, 852, 13),
      titleBlockText(date, 568, 852, 13),
      titleBlockText(selectedCustomerName, 716, 842, 12),
      titleBlockText(title, 716, 890, 12),
      titleBlockText(drawingNo, 716, 910, 12),
      titleBlockText(statusLabel(currentPlanStatus), 1040, 910, 12),
      titleBlockText(String(currentPageIndex + 1), 1220, 842, 14),
      titleBlockText(String(Math.max(planPages.length, 1)), 1220, 910, 14)
    ].filter(Boolean);
    nodes.forEach(node => els.templateFieldLayer.appendChild(node));
  }

  function appendTitle(group, item) {
    const parts = [
      cleanString(item.name),
      cleanString(item.room),
      cleanString(item.circuit),
      cleanString(item.breaker),
      cleanString(item.cable),
      cleanString(item.conductor),
      cleanString(item.comment),
      cleanString(item.note)
    ].filter(Boolean);
    if (!parts.length) return;
    const title = svgEl("title", {});
    title.textContent = parts.join(" | ");
    group.appendChild(title);
  }

  function appendNameLabel(group, item, x, y, anchor) {
    const name = cleanString(item.name).trim();
    if (!name) return;
    const label = svgEl("text", {
      x,
      y,
      fill: item.color || DEFAULT_COLOR,
      "font-size": 18,
      "font-weight": "800",
      "font-family": "Arial, sans-serif",
      "text-anchor": anchor || "middle"
    });
    label.textContent = name;
    group.appendChild(label);
  }

  function drawObject(item) {
    if (item.type === "line") {
      const group = svgEl("g", {});
      const points = linePoints(item);
      setLinePoints(item, points);
      const hitLine = svgEl("polyline", {
        points: pointsAttribute(points),
        stroke: "transparent",
        "stroke-width": Math.max((item.width || 4) + 18, 22),
        "stroke-linecap": "butt",
        "stroke-linejoin": "round",
        "pointer-events": "stroke"
      });
      const line = svgEl("polyline", {
        points: pointsAttribute(points),
        stroke: item.color || DEFAULT_COLOR,
        "stroke-width": item.width || 4,
        "stroke-linecap": "butt",
        "stroke-linejoin": "round",
        fill: "none"
      });
      group.appendChild(hitLine);
      group.appendChild(line);
      appendNameLabel(group, item, (item.x1 + item.x2) / 2, (item.y1 + item.y2) / 2 - 12);
      appendLineDataLabel(group, item, points);
      appendTitle(group, item);
      return group;
    }

    if (item.type === "text") {
      const group = svgEl("g", {});
      const size = item.size || 32;
      const textValue = item.text || "Text";
      const hitText = svgEl("rect", {
        x: item.x - 6,
        y: item.y - size - 8,
        width: Math.max(48, textValue.length * size * 0.62 + 12),
        height: size + 18,
        fill: "transparent",
        "pointer-events": "all"
      });
      const text = svgEl("text", {
        x: item.x,
        y: item.y,
        fill: item.color || DEFAULT_COLOR,
        "font-size": size,
        "font-weight": "700",
        "font-family": "Arial, sans-serif"
      });
      text.textContent = textValue;
      group.appendChild(hitText);
      group.appendChild(text);
      appendTitle(group, item);
      return group;
    }

    if (item.type === "symbol") {
      return drawSymbol(item);
    }

    if (item.type === "comment") {
      return drawComment(item);
    }

    return svgEl("g", {});
  }

  function appendLineDataLabel(group, item, points) {
    const label = lineLabel(item);
    if (!label) return;
    const segmentStart = points[0];
    const segmentEnd = points[1] || points[0];
    const x = (segmentStart.x + segmentEnd.x) / 2;
    const y = (segmentStart.y + segmentEnd.y) / 2 - 7;
    const text = svgEl("text", {
      x,
      y,
      fill: item.color || DEFAULT_COLOR,
      stroke: "#ffffff",
      "stroke-width": 3,
      "paint-order": "stroke",
      "font-size": 13,
      "font-weight": "800",
      "font-family": "Arial, sans-serif",
      "text-anchor": "middle"
    });
    text.textContent = label;
    group.appendChild(text);
  }

  function drawComment(item) {
    const group = svgEl("g", {});
    const size = 18;
    const hit = svgEl("rect", {
      x: item.x - 16,
      y: item.y - 20,
      width: 150,
      height: 45,
      rx: 8,
      fill: "transparent",
      "pointer-events": "all"
    });
    const marker = svgEl("circle", {
      cx: item.x,
      cy: item.y,
      r: 10,
      fill: "#ffcc33",
      stroke: "#111",
      "stroke-width": 2
    });
    marker.classList.add("comment-marker");
    const bang = svgEl("text", {
      x: item.x,
      y: item.y + 5,
      fill: "#111",
      stroke: "none",
      "font-size": 16,
      "font-weight": "900",
      "font-family": "Arial, sans-serif",
      "text-anchor": "middle"
    });
    bang.textContent = "!";
    const text = svgEl("text", {
      x: item.x + 16,
      y: item.y + 5,
      fill: item.color || DEFAULT_COLOR,
      stroke: "#ffffff",
      "stroke-width": 3,
      "paint-order": "stroke",
      "font-size": size,
      "font-weight": "800",
      "font-family": "Arial, sans-serif"
    });
    text.textContent = cleanString(item.comment || item.note || "Kommentar").slice(0, 34);
    group.appendChild(hit);
    group.appendChild(marker);
    group.appendChild(bang);
    group.appendChild(text);
    appendTitle(group, item);
    return group;
  }

  function drawSymbol(item) {
    const root = svgEl("g", {});
    const group = svgEl("g", {
      transform: "translate(" + item.x + " " + item.y + ") rotate(" + (item.rotation || 0) + ")",
      stroke: item.color || DEFAULT_COLOR,
      fill: "none",
      "stroke-width": item.width || 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    const size = item.size || 58;
    const half = size / 2;

    function child(name, attrs) {
      const el = svgEl(name, attrs);
      group.appendChild(el);
      return el;
    }

    const hitArea = svgEl("circle", {
      cx: item.x,
      cy: item.y,
      r: Math.max(34, half + 18),
      fill: "transparent",
      "pointer-events": "all"
    });

    root.appendChild(hitArea);
    root.appendChild(group);

    if (isCustomSymbol(item.symbol)) {
      const def = symbolDefinition(item.symbol);
      const elements = sanitizeSymbolElements(def.elements);
      if (elements.length) {
        appendCustomSymbolElements(group, elements, {
          centered: true,
          scale: size / 200,
          color: item.color || DEFAULT_COLOR
        });
      } else {
        const symbolText = (def.icon || def.label.slice(0, 2)).toUpperCase();
        const symbolTextSize = Math.max(10, Math.min(size * 0.28, (size * 0.9) / Math.max(symbolText.length, 2)));
        child("rect", {
          x: -half * 0.72,
          y: -half * 0.52,
          width: size * 1.44,
          height: size * 1.04,
          rx: 8
        });
        const text = svgEl("text", {
          x: 0,
          y: 7,
          fill: item.color || DEFAULT_COLOR,
          stroke: "none",
          "font-size": symbolTextSize,
          "font-weight": "900",
          "font-family": "Arial, sans-serif",
          "text-anchor": "middle"
        });
        text.textContent = symbolText;
        group.appendChild(text);
      }
    } else if (item.symbol === "switch") {
      child("line", { x1: -half, y1: 0, x2: -8, y2: 0 });
      child("line", { x1: -8, y1: 0, x2: half * 0.8, y2: -half * 0.42 });
    } else if (item.symbol === "socket") {
      child("circle", { cx: 0, cy: 0, r: half * 0.58 });
      child("line", { x1: -9, y1: -8, x2: -9, y2: 8 });
      child("line", { x1: 9, y1: -8, x2: 9, y2: 8 });
    } else if (item.symbol === "lamp") {
      child("circle", { cx: 0, cy: 0, r: half * 0.62 });
      child("line", { x1: -18, y1: -18, x2: 18, y2: 18 });
      child("line", { x1: 18, y1: -18, x2: -18, y2: 18 });
    } else if (item.symbol === "fuse") {
      child("rect", { x: -half * 0.62, y: -half * 0.42, width: size * 0.62, height: size * 0.84 });
      child("line", { x1: -half, y1: 0, x2: -half * 0.62, y2: 0 });
      child("line", { x1: 0, y1: 0, x2: half, y2: 0 });
      child("path", { d: "M -18 12 L -4 -12 L 8 12" });
    } else if (item.symbol === "panel") {
      child("rect", { x: -half * 0.72, y: -half * 0.52, width: size * 0.72, height: size * 1.04 });
      child("line", { x1: -half * 0.52, y1: -half * 0.22, x2: -half * 0.12, y2: -half * 0.22 });
      child("line", { x1: -half * 0.52, y1: 0, x2: -half * 0.12, y2: 0 });
      child("line", { x1: -half * 0.52, y1: half * 0.22, x2: -half * 0.12, y2: half * 0.22 });
    } else if (item.symbol === "wire") {
      child("line", { x1: -half, y1: 0, x2: half, y2: 0 });
      child("line", { x1: half * 0.58, y1: -8, x2: half, y2: 0 });
      child("line", { x1: half * 0.58, y1: 8, x2: half, y2: 0 });
    } else {
      child("circle", { cx: 0, cy: 0, r: 8, fill: item.color || DEFAULT_COLOR });
      child("line", { x1: -half, y1: 0, x2: half, y2: 0 });
      child("line", { x1: 0, y1: -half, x2: 0, y2: half });
    }

    appendNameLabel(root, item, item.x, item.y + half + 24);
    appendTitle(root, item);
    return root;
  }

  function renderProperties() {
    const item = selectedObject();
    if (!els.propertyForm || !els.propertyEmpty) return;

    els.propertyEmpty.hidden = Boolean(item);
    els.propertyForm.hidden = !item;
    if (!item) return;

    if (els.propName) els.propName.value = cleanString(item.name);
    if (els.propText) els.propText.value = item.text || "";
    if (els.propComment) els.propComment.value = cleanString(item.comment || item.note);
    if (els.propCable) els.propCable.value = [cleanString(item.cable), cleanString(item.conductor)].filter(Boolean).join(" / ");
    if (els.propCircuit) els.propCircuit.value = cleanString(item.circuit);
    if (els.propBreaker) els.propBreaker.value = cleanString(item.breaker);
    if (els.propRoom) els.propRoom.value = cleanString(item.room);
    if (els.propNote) els.propNote.value = cleanString(item.note);
    if (els.propColor) els.propColor.value = toHexColor(item.color || DEFAULT_COLOR);
    if (els.propWidth) els.propWidth.value = item.width || 4;
    if (els.propRotation) els.propRotation.value = item.rotation || 0;
    if (els.propSize) els.propSize.value = item.size || (item.type === "text" ? 32 : SYMBOL_FIELD_SIZE);
    if (els.propSymbol) els.propSymbol.value = knownSymbol(item.symbol);

    if (els.propTextWrap) els.propTextWrap.hidden = item.type !== "text";
    if (els.propCommentWrap) els.propCommentWrap.hidden = item.type !== "comment";
    if (els.propCableWrap) els.propCableWrap.hidden = item.type !== "line";
    if (els.propWidthWrap) els.propWidthWrap.hidden = item.type === "text" || item.type === "comment";
    if (els.propRotationWrap) els.propRotationWrap.hidden = item.type !== "symbol";
    if (els.propSizeWrap) els.propSizeWrap.hidden = item.type === "line" || item.type === "comment";
    if (els.propSymbolWrap) els.propSymbolWrap.hidden = item.type !== "symbol";
  }

  function beginPropertyHistory() {
    if (!selectedObject() || propertyHistoryActive) return;
    pushHistory();
    propertyHistoryActive = true;
  }

  function endPropertyHistory() {
    propertyHistoryActive = false;
  }

  function updateSelectedFromProperties() {
    const item = selectedObject();
    if (!item) return;
    beginPropertyHistory();

    item.name = els.propName ? els.propName.value.trim() : cleanString(item.name);
    item.circuit = els.propCircuit ? els.propCircuit.value.trim() : cleanString(item.circuit);
    item.breaker = els.propBreaker ? els.propBreaker.value.trim() : cleanString(item.breaker);
    item.room = els.propRoom ? els.propRoom.value.trim() : cleanString(item.room);
    item.note = els.propNote ? els.propNote.value.trim() : cleanString(item.note);
    item.color = toHexColor(els.propColor ? els.propColor.value : item.color);

    if (item.type === "comment") {
      item.comment = els.propComment && els.propComment.value ? els.propComment.value.trim() : "Kommentar";
      item.note = item.comment;
    }

    if (item.type === "text") {
      item.text = els.propText && els.propText.value ? els.propText.value : "Text";
      item.size = readNumber(els.propSize, item.size || 32);
    }

    if (item.type === "line") {
      item.width = readNumber(els.propWidth, item.width || 4);
      const cableValue = cleanString(els.propCable && els.propCable.value).trim();
      const parts = cableValue.split("/").map(part => part.trim()).filter(Boolean);
      item.cable = parts[0] || cableValue;
      item.conductor = parts.slice(1).join(" / ");
    }

    if (item.type === "symbol") {
      item.width = readNumber(els.propWidth, item.width || 4);
      item.size = readNumber(els.propSize, item.size || SYMBOL_FIELD_SIZE);
      item.rotation = readNumber(els.propRotation, item.rotation || 0);
      item.symbol = knownSymbol(els.propSymbol ? els.propSymbol.value : item.symbol);
      state.activeSymbol = item.symbol;
    }

    renderObjects();
    renderConnections();
    renderEndpoints();
    renderLegend();
    renderTemplateFields();
    syncControls();
  }

  function setTool(tool) {
    state.tool = tool;
    syncControls();
    if (tool === "select") {
      setStatus("Auswahl aktiv. Objekt antippen zum Verschieben, alles bleibt auf den Punkten der Vorlage.");
    } else if (tool === "symbol") {
      setStatus("Symbol aktiv: " + (symbolDefinition(state.activeSymbol).label || "Symbol") + ".");
    } else if (tool === "line") {
      setStatus("Linie aktiv. Start und Ende rasten immer auf den kleinen Punkten ein.");
    } else if (tool === "comment") {
      setStatus("Kommentar aktiv. Auf eine Stelle tippen und Hinweis eintragen.");
    } else {
      setStatus("Werkzeug aktiv: " + tool + ".");
    }
  }

  function objectAtTarget(target) {
    const node = target.closest && target.closest("[data-id]");
    if (!node) return null;
    return state.objects.find(item => item.id === node.dataset.id) || null;
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  }

  function objectAtPoint(point) {
    for (let index = state.objects.length - 1; index >= 0; index -= 1) {
      const item = state.objects[index];

      if (item.type === "symbol") {
        const size = item.size || 58;
        if (Math.hypot(point.x - item.x, point.y - item.y) <= size / 2 + 24) return item;
      }

      if (item.type === "line") {
        const points = linePoints(item);
        const distance = points.slice(1).reduce((best, segmentEnd, segmentIndex) => {
          const segmentStart = points[segmentIndex];
          return Math.min(best, distanceToSegment(point, segmentStart, segmentEnd));
        }, Infinity);
        if (distance <= Math.max((item.width || 4) + 14, 18)) return item;
      }

      if (item.type === "text") {
        const size = item.size || 32;
        const width = Math.max(48, (item.text || "Text").length * size * 0.62 + 12);
        const insideX = point.x >= item.x - 6 && point.x <= item.x - 6 + width;
        const insideY = point.y >= item.y - size - 8 && point.y <= item.y + 10;
        if (insideX && insideY) return item;
      }

      if (item.type === "comment") {
        const width = Math.max(85, cleanString(item.comment || item.note || "Kommentar").length * 9 + 34);
        const insideX = point.x >= item.x - 18 && point.x <= item.x - 18 + width;
        const insideY = point.y >= item.y - 24 && point.y <= item.y + 24;
        if (insideX && insideY) return item;
      }
    }
    return null;
  }

  function snapObjectToDots(item) {
    if (item.type === "line") {
      setLinePoints(item, linePoints(item));
    } else if (item.x !== undefined && item.y !== undefined) {
      item.x = snapAxisToTemplate(item.x, "x");
      item.y = snapAxisToTemplate(item.y, "y");
    }
  }

  function moveObject(item, dx, dy) {
    if (item.type === "line") {
      setLinePoints(item, linePoints(item).map(point => ({
        x: point.x + dx,
        y: point.y + dy
      })));
    } else {
      item.x += dx;
      item.y += dy;
      snapObjectToDots(item);
    }
  }

  function finalizeLineDraft() {
    if (!pointerState.lineDraft) return;
    const item = state.objects.find(obj => obj.id === pointerState.lineDraft);
    if (!item || item.type !== "line") return;

    const length = lineLength(item);
    if (length >= LOCK_GRID_SIZE) return;

    const preferredEnd = item.x1 + LOCK_GRID_SIZE * 10;
    if (preferredEnd <= TEMPLATE_WORK.right) {
      setLinePoints(item, [{ x: item.x1, y: item.y1 }, { x: preferredEnd, y: item.y1 }]);
    } else {
      setLinePoints(item, [{ x: item.x1, y: item.y1 }, { x: Math.max(TEMPLATE_WORK.x, item.x1 - LOCK_GRID_SIZE * 10), y: item.y1 }]);
    }
    setStatus("Linie erstellt. Du kannst sie mit Auswahl verschieben oder l\u00f6schen.");
  }

  function selectObject(idValue) {
    propertyHistoryActive = false;
    state.selectedId = idValue || null;
    syncActiveSymbolFromSelection();
    render();
  }

  function addText(point) {
    const text = prompt("Text eingeben:");
    if (text === null) return;
    pushHistory();
    const style = currentStyle();
    const item = {
      ...baseObject("text"),
      x: point.x,
      y: point.y,
      text: text.trim() || "Text",
      size: 32,
      color: style.color
    };
    state.objects.push(item);
    selectObject(item.id);
  }

  function addComment(point) {
    const text = prompt("Kommentar eingeben:");
    if (text === null) return;
    pushHistory();
    const style = currentStyle();
    const item = {
      ...baseObject("comment"),
      x: point.x,
      y: point.y,
      comment: text.trim() || "Kommentar",
      note: text.trim() || "Kommentar",
      color: style.color
    };
    state.objects.push(item);
    selectObject(item.id);
  }

  function addSymbol(point) {
    pushHistory();
    const style = currentStyle();
    const item = {
      ...baseObject("symbol"),
      symbol: state.activeSymbol,
      x: point.x,
      y: point.y,
      rotation: 0,
      size: SYMBOL_FIELD_SIZE,
      color: style.color,
      width: style.width
    };
    state.objects.push(item);
    selectObject(item.id);
  }

  function clientToSvgPoint(svg, event) {
    if (svg && svg.createSVGPoint && svg.getScreenCTM) {
      const matrix = svg.getScreenCTM();
      if (matrix) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(matrix.inverse());
      }
    }
    const rect = svg.getBoundingClientRect();
    const viewBox = (svg.getAttribute("viewBox") || "0 0 " + svg.clientWidth + " " + svg.clientHeight)
      .split(/\s+/)
      .map(Number);
    const viewX = Number.isFinite(viewBox[0]) ? viewBox[0] : 0;
    const viewY = Number.isFinite(viewBox[1]) ? viewBox[1] : 0;
    const viewWidth = Number.isFinite(viewBox[2]) ? viewBox[2] : svg.clientWidth;
    const viewHeight = Number.isFinite(viewBox[3]) ? viewBox[3] : svg.clientHeight;
    return {
      x: viewX + ((event.clientX - rect.left) / rect.width) * viewWidth,
      y: viewY + ((event.clientY - rect.top) / rect.height) * viewHeight
    };
  }

  function symbolBuilderPoint(event) {
    const point = clientToSvgPoint(els.symbolBuilderSvg, event);
    return snapBuilderPoint({
      x: clamp(point.x, 0, 200),
      y: clamp(point.y, 0, 200)
    });
  }

  function selectedBuilderObject() {
    return symbolBuilder.objects.find(item => item.id === symbolBuilder.selectedId) || null;
  }

  function setSymbolBuilderTool(tool) {
    symbolBuilder.tool = tool;
    document.querySelectorAll("[data-symbol-builder-tool]").forEach(button => {
      button.classList.toggle("active", button.dataset.symbolBuilderTool === tool);
    });
  }

  function builderObjectAtTarget(target) {
    const node = target.closest && target.closest("[data-builder-id]");
    if (!node) return null;
    return symbolBuilder.objects.find(item => item.id === node.dataset.builderId) || null;
  }

  function moveBuilderObject(item, dx, dy) {
    if (item.type === "line") {
      setBuilderLinePoints(item, builderLinePoints(item).map(point => ({
        x: point.x + dx,
        y: point.y + dy
      })));
    }
    if (item.type === "text") {
      item.x = snapAxisToBuilder(item.x + dx, "x");
      item.y = snapAxisToBuilder(item.y + dy, "y");
    }
  }

  function drawBuilderObject(item) {
    const group = svgEl("g", {});
    group.dataset.builderId = item.id;
    group.classList.toggle("symbol-builder-selected", item.id === symbolBuilder.selectedId);
    group.style.cursor = "pointer";

    if (item.type === "line") {
      const points = builderLinePoints(item);
      setBuilderLinePoints(item, points);
      group.appendChild(svgEl("polyline", {
        points: pointsAttribute(points),
        stroke: "transparent",
        "stroke-width": Math.max((item.width || 5) + 12, 16),
        "stroke-linecap": "butt",
        "stroke-linejoin": "round",
        "pointer-events": "stroke"
      }));
      group.appendChild(svgEl("polyline", {
        points: pointsAttribute(points),
        stroke: DEFAULT_COLOR,
        "stroke-width": item.width || 5,
        "stroke-linecap": "butt",
        "stroke-linejoin": "round",
        fill: "none"
      }));
    }

    if (item.type === "text") {
      const textValue = item.text || "Text";
      const size = item.size || 18;
      group.appendChild(svgEl("rect", {
        x: item.x - Math.max(18, textValue.length * size * 0.32),
        y: item.y - size - 8,
        width: Math.max(36, textValue.length * size * 0.64 + 12),
        height: size + 14,
        fill: "transparent",
        "pointer-events": "all"
      }));
      const text = svgEl("text", {
        x: item.x,
        y: item.y,
        fill: DEFAULT_COLOR,
        stroke: "none",
        "font-size": size,
        "font-weight": "900",
        "font-family": "Arial, sans-serif",
        "text-anchor": "middle"
      });
      text.textContent = textValue;
      group.appendChild(text);
    }

    return group;
  }

  function renderSymbolBuilder() {
    if (!els.symbolBuilderLayer) return;
    els.symbolBuilderLayer.innerHTML = "";
    symbolBuilder.objects.forEach(item => {
      els.symbolBuilderLayer.appendChild(drawBuilderObject(item));
    });
    renderSymbolBuilderProperties();
  }

  function selectBuilderObject(idValue) {
    symbolBuilder.selectedId = idValue || null;
    renderSymbolBuilder();
  }

  function renderSymbolBuilderProperties() {
    const item = selectedBuilderObject();
    const isText = item && item.type === "text";
    if (els.symbolBuilderEmpty) {
      els.symbolBuilderEmpty.hidden = Boolean(isText);
      els.symbolBuilderEmpty.textContent = item && item.type === "line"
        ? "Linie ausgew\u00e4hlt. Du kannst sie verschieben oder l\u00f6schen."
        : "Text oder Linie ausw\u00e4hlen. Bei Text kannst du die Beschriftung einzeln \u00e4ndern.";
    }
    if (els.symbolBuilderTextWrap) els.symbolBuilderTextWrap.hidden = !isText;
    if (els.symbolBuilderSizeWrap) els.symbolBuilderSizeWrap.hidden = !isText;
    if (isText) {
      if (els.symbolBuilderText) els.symbolBuilderText.value = item.text || "";
      if (els.symbolBuilderSize) els.symbolBuilderSize.value = item.size || 18;
    }
  }

  function updateSelectedBuilderText() {
    const item = selectedBuilderObject();
    if (!item || item.type !== "text") return;
    item.text = cleanString(els.symbolBuilderText && els.symbolBuilderText.value).slice(0, 24) || "Text";
    item.size = clamp(els.symbolBuilderSize && els.symbolBuilderSize.value, 10, 36);
    renderSymbolBuilder();
  }

  function openSymbolBuilder() {
    if (!els.symbolBuilderModal) return;
    els.symbolBuilderModal.hidden = false;
    setSymbolBuilderTool("select");
    renderSymbolBuilder();
    if (els.customSymbolName) els.customSymbolName.focus();
  }

  function closeSymbolBuilder() {
    if (els.symbolBuilderModal) els.symbolBuilderModal.hidden = true;
    symbolBuilder.mode = null;
    symbolBuilder.draftId = null;
  }

  function clearSymbolBuilder() {
    if (symbolBuilder.objects.length && !confirm("Symbol-Zeichnung leeren?")) return;
    symbolBuilder.objects = [];
    symbolBuilder.selectedId = null;
    renderSymbolBuilder();
  }

  function deleteBuilderSelected() {
    if (!symbolBuilder.selectedId) {
      setStatus("Bitte im Symbol-Editor zuerst ein Element ausw\u00e4hlen.");
      return;
    }
    symbolBuilder.objects = symbolBuilder.objects.filter(item => item.id !== symbolBuilder.selectedId);
    symbolBuilder.selectedId = null;
    renderSymbolBuilder();
  }

  function defaultSymbolElements(code) {
    return sanitizeSymbolElements([
      {
        id: builderId(),
        type: "text",
        x: 100,
        y: 108,
        text: cleanString(code).slice(0, 6).toUpperCase() || "S",
        size: 24
      }
    ]);
  }

  function onBuilderPointerDown(event) {
    if (!els.symbolBuilderSvg || !els.symbolBuilderSvg.contains(event.target)) return;
    event.preventDefault();
    els.symbolBuilderSvg.setPointerCapture(event.pointerId);
    const point = symbolBuilderPoint(event);
    const hit = builderObjectAtTarget(event.target);

    if (symbolBuilder.tool === "select") {
      if (hit) {
        symbolBuilder.selectedId = hit.id;
        symbolBuilder.mode = "move";
        symbolBuilder.startPoint = point;
        symbolBuilder.objectStart = clone(hit);
        renderSymbolBuilder();
      } else {
        selectBuilderObject(null);
      }
      return;
    }

    if (symbolBuilder.tool === "line") {
      const item = {
        id: builderId(),
        type: "line",
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        points: [{ x: point.x, y: point.y }, { x: point.x, y: point.y }],
        width: 5
      };
      symbolBuilder.objects.push(item);
      symbolBuilder.selectedId = item.id;
      symbolBuilder.mode = "line";
      symbolBuilder.draftId = item.id;
      renderSymbolBuilder();
      return;
    }

    if (symbolBuilder.tool === "text") {
      const text = prompt("Beschriftung eingeben:");
      if (text === null) return;
      const item = {
        id: builderId(),
        type: "text",
        x: point.x,
        y: point.y,
        text: text.trim() || "Text",
        size: 18
      };
      symbolBuilder.objects.push(item);
      symbolBuilder.selectedId = item.id;
      setSymbolBuilderTool("select");
      renderSymbolBuilder();
    }
  }

  function onBuilderPointerMove(event) {
    if (!symbolBuilder.mode) return;
    const point = symbolBuilderPoint(event);

    if (symbolBuilder.mode === "move" && symbolBuilder.objectStart) {
      const item = symbolBuilder.objects.find(obj => obj.id === symbolBuilder.objectStart.id);
      if (!item) return;
      Object.assign(item, clone(symbolBuilder.objectStart));
      moveBuilderObject(item, point.x - symbolBuilder.startPoint.x, point.y - symbolBuilder.startPoint.y);
      renderSymbolBuilder();
    }

    if (symbolBuilder.mode === "line" && symbolBuilder.draftId) {
      const item = symbolBuilder.objects.find(obj => obj.id === symbolBuilder.draftId);
      if (!item) return;
      setBuilderLinePoints(item, routeBuilderPoints({ x: item.x1, y: item.y1 }, point));
      renderSymbolBuilder();
    }
  }

  function onBuilderPointerUp(event) {
    if (els.symbolBuilderSvg && event.pointerId !== undefined) {
      try {
        els.symbolBuilderSvg.releasePointerCapture(event.pointerId);
      } catch (error) {
        console.log(error);
      }
    }
    symbolBuilder.mode = null;
    symbolBuilder.draftId = null;
    symbolBuilder.startPoint = null;
    symbolBuilder.objectStart = null;
  }

  function editBuilderTextFromDoubleClick(event) {
    const item = builderObjectAtTarget(event.target);
    if (!item || item.type !== "text") return;
    const next = prompt("Beschriftung \u00e4ndern:", item.text || "");
    if (next === null) return;
    item.text = next.trim() || "Text";
    symbolBuilder.selectedId = item.id;
    renderSymbolBuilder();
  }

  async function createCustomSymbol(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (customSymbolSaving) return;

    const name = cleanString(els.customSymbolName && els.customSymbolName.value).trim();
    const code = cleanString(els.customSymbolCode && els.customSymbolCode.value).trim();

    if (!name || !code) {
      setStatus("Bitte Name und K\u00fcrzel f\u00fcr das eigene Symbol eintragen.");
      return;
    }

    let symbol = {
      id: "custom_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      label: name.slice(0, 40),
      detail: "Eigenes Symbol",
      icon: code.slice(0, 6).toUpperCase(),
      group: "Eigene Symbole",
      elements: sanitizeSymbolElements(symbolBuilder.objects)
    };
    if (!symbol.elements.length) symbol.elements = defaultSymbolElements(symbol.icon);

    if (customSymbols.some(item => item.label.toLowerCase() === symbol.label.toLowerCase())) {
      setStatus("Dieses Symbol gibt es schon.");
      return;
    }

    customSymbolSaving = true;
    if (els.saveCustomSymbol) els.saveCustomSymbol.disabled = true;

    let synced = false;
    try {
      const syncReady = await ensureSyncContext();
      if (syncReady) {
        const result = await persistSharedSymbol(symbol);
        symbol = result.symbol || symbol;
        synced = Boolean(result.synced);
        if (result.error) {
          console.log(result.error);
          setSyncNote(syncTableMissing(result.error)
            ? "Datenbank-Update fehlt noch: eigenes Symbol bleibt bis dahin lokal."
            : "Symbol konnte nicht online gespeichert werden: " + syncErrorText(result.error));
        }
      }
    } catch (error) {
      console.log(error);
      setSyncNote("Symbol konnte gerade nicht online gespeichert werden. Lokal bleibt es verf\u00fcgbar.");
    } finally {
      customSymbolSaving = false;
      if (els.saveCustomSymbol) els.saveCustomSymbol.disabled = false;
    }

    if (!customSymbols.some(item => item.id === symbol.id)) customSymbols.push(symbol);
    const persisted = writeCustomSymbols();
    state.activeSymbol = symbol.id;
    if (els.customSymbolName) els.customSymbolName.value = "";
    if (els.customSymbolCode) els.customSymbolCode.value = "";
    symbolBuilder.objects = [];
    symbolBuilder.selectedId = null;
    closeSymbolBuilder();
    renderSymbolOptions();
    renderSymbolPalette();
    setTool("symbol");
    setStatus((synced ? "Eigenes Symbol gespeichert und synchronisiert: " : persisted ? "Eigenes Symbol lokal gespeichert: " : "Eigenes Symbol f\u00fcr diese Sitzung angelegt: ") + symbol.label + ".");
  }

  function deleteSelected() {
    if (!state.selectedId) {
      setStatus("Bitte zuerst ein Objekt ausw\u00e4hlen.");
      return;
    }
    pushHistory();
    state.objects = state.objects.filter(item => item.id !== state.selectedId);
    state.selectedId = null;
    propertyHistoryActive = false;
    render();
    setStatus("Objekt gel\u00f6scht.");
  }

  function duplicateSelected() {
    const item = selectedObject();
    if (!item) {
      setStatus("Bitte zuerst ein Objekt ausw\u00e4hlen.");
      return;
    }
    pushHistory();
    const copy = clone(item);
    copy.id = id();
    if (copy.type === "line") {
      setLinePoints(copy, linePoints(copy).map(point => ({
        x: point.x + LOCK_GRID_SIZE,
        y: point.y + LOCK_GRID_SIZE
      })));
    } else {
      copy.x = snapAxisToTemplate((copy.x || TEMPLATE_WORK.x) + LOCK_GRID_SIZE, "x");
      copy.y = snapAxisToTemplate((copy.y || TEMPLATE_WORK.y) + LOCK_GRID_SIZE, "y");
    }
    state.objects.push(copy);
    selectObject(copy.id);
    setStatus("Objekt dupliziert.");
  }

  function rotateSelected(delta) {
    const item = selectedObject();
    if (!item || item.type !== "symbol") {
      setStatus("Drehung ist bei Symbolen aktiv.");
      return;
    }
    pushHistory();
    item.rotation = ((item.rotation || 0) + delta + 360) % 360;
    render();
  }

  function onPointerDown(event) {
    if (event.__schaltplanPointerHandled) return;
    event.__schaltplanPointerHandled = true;
    els.svg.setPointerCapture(event.pointerId);
    pointerState.pointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      point: clientToPlan(event)
    });

    if (pointerState.pointers.size === 2) {
      const points = Array.from(pointerState.pointers.values());
      const dist = Math.hypot(points[1].clientX - points[0].clientX, points[1].clientY - points[0].clientY);
      pointerState.pinchStart = {
        dist,
        camera: clone(state.camera),
        center: {
          x: (points[0].point.x + points[1].point.x) / 2,
          y: (points[0].point.y + points[1].point.y) / 2
        }
      };
      return;
    }

    const rawPoint = clientToPlan(event);
    const point = snapPoint(rawPoint);
    const hit = objectAtTarget(event.target) || objectAtPoint(rawPoint);
    const endpointNode = event.target.closest && event.target.closest("[data-endpoint]");

    if (endpointNode && state.tool === "select") {
      const item = state.objects.find(obj => obj.id === endpointNode.dataset.id && obj.type === "line");
      if (item) {
        pushHistory();
        selectObject(item.id);
        pointerState.mode = "endpoint";
        pointerState.endpointEdit = {
          id: item.id,
          index: Number(endpointNode.dataset.endpoint),
          originalPoints: clone(linePoints(item))
        };
        return;
      }
    }

    if (hit && (state.tool === "select" || state.tool === "symbol")) {
      pushHistory();
      selectObject(hit.id);
      pointerState.mode = "move";
      pointerState.objectStart = {
        id: hit.id,
        point,
        object: clone(hit)
      };
      return;
    }

    if (state.tool === "select") {
      if (!hit) {
        selectObject(null);
        pointerState.mode = "pan";
        pointerState.panStart = {
          clientX: event.clientX,
          clientY: event.clientY,
          camera: clone(state.camera)
        };
      }
      return;
    }

    if (!pointInTemplateWork(rawPoint)) {
      setStatus("Bitte im Punktfeld der Vorlage arbeiten.");
      return;
    }

    if (state.tool === "line") {
      pushHistory();
      const style = currentStyle();
      const endpoint = nearestLineEndpoint(point);
      if (endpoint) {
        const points = linePoints(endpoint.item);
        setLinePoints(endpoint.item, points);
        state.selectedId = endpoint.item.id;
        pointerState.mode = "line";
        pointerState.lineDraft = endpoint.item.id;
        pointerState.lineExtension = {
          endpointIndex: endpoint.index,
          originalPoints: clone(points)
        };
        pointerState.lineMoved = false;
        render();
        setStatus("Leitung wird am vorhandenen Punkt verl\u00e4ngert.");
        return;
      }

      const item = {
        ...baseObject("line"),
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        points: [{ x: point.x, y: point.y }, { x: point.x, y: point.y }],
        color: style.color,
        width: style.width,
        cable: "",
        conductor: ""
      };
      state.objects.push(item);
      state.selectedId = item.id;
      pointerState.mode = "line";
      pointerState.lineDraft = item.id;
      pointerState.lineMoved = false;
      render();
      return;
    }

    if (state.tool === "text") {
      addText(point);
      return;
    }

    if (state.tool === "symbol") {
      addSymbol(point);
      return;
    }

    if (state.tool === "comment") {
      addComment(point);
    }
  }

  function onPointerMove(event) {
    const existing = pointerState.pointers.get(event.pointerId);
    if (existing) {
      existing.clientX = event.clientX;
      existing.clientY = event.clientY;
      existing.point = clientToPlan(event);
    }

    if (pointerState.pointers.size === 2 && pointerState.pinchStart) {
      const points = Array.from(pointerState.pointers.values());
      const dist = Math.hypot(points[1].clientX - points[0].clientX, points[1].clientY - points[0].clientY);
      if (dist > 0) {
        state.camera = clone(pointerState.pinchStart.camera);
        zoomAt(pointerState.pinchStart.dist / dist, pointerState.pinchStart.center);
      }
      return;
    }

    const rawPoint = clientToPlan(event);
    const point = snapPoint(rawPoint);

    if (pointerState.mode === "move" && pointerState.objectStart) {
      const item = state.objects.find(obj => obj.id === pointerState.objectStart.id);
      if (!item) return;
      Object.assign(item, clone(pointerState.objectStart.object));
      moveObject(item, point.x - pointerState.objectStart.point.x, point.y - pointerState.objectStart.point.y);
      render();
    }

    if (pointerState.mode === "endpoint" && pointerState.endpointEdit) {
      const item = state.objects.find(obj => obj.id === pointerState.endpointEdit.id);
      if (!item || item.type !== "line") return;
      const original = pointerState.endpointEdit.originalPoints || linePoints(item);
      if (pointerState.endpointEdit.index === 0) {
        const next = routePoints(point, original[1] || original[0]).concat(original.slice(2));
        setLinePoints(item, next);
      } else {
        const next = original.slice(0, -2).concat(routePoints(original[original.length - 2] || original[0], point));
        setLinePoints(item, next);
      }
      render();
    }

    if (pointerState.mode === "pan" && pointerState.panStart) {
      const rect = els.svg.getBoundingClientRect();
      const dx = ((event.clientX - pointerState.panStart.clientX) / rect.width) * pointerState.panStart.camera.width;
      const dy = ((event.clientY - pointerState.panStart.clientY) / rect.height) * pointerState.panStart.camera.height;
      state.camera = clone(pointerState.panStart.camera);
      panBy(dx, dy);
    }

    if (pointerState.mode === "line" && pointerState.lineDraft) {
      const item = state.objects.find(obj => obj.id === pointerState.lineDraft);
      if (!item) return;
      if (pointerState.lineExtension) {
        const original = pointerState.lineExtension.originalPoints || linePoints(item);
        if (pointerState.lineExtension.endpointIndex === 0) {
          const route = routePoints(point, original[0]);
          setLinePoints(item, route.concat(original.slice(1)));
        } else {
          const route = routePoints(original[original.length - 1], point);
          setLinePoints(item, original.slice(0, -1).concat(route));
        }
      } else {
        setLinePoints(item, routePoints({ x: item.x1, y: item.y1 }, point));
      }
      pointerState.lineMoved = lineLength(item) >= LOCK_GRID_SIZE;
      render();
    }
  }

  function onPointerUp(event) {
    if (pointerState.mode === "line") {
      finalizeLineDraft();
      render();
    }
    pointerState.pointers.delete(event.pointerId);
    if (pointerState.pointers.size < 2) pointerState.pinchStart = null;
    pointerState.mode = null;
    pointerState.objectStart = null;
    pointerState.lineDraft = null;
    pointerState.lineExtension = null;
    pointerState.endpointEdit = null;
    pointerState.lineMoved = false;
  }

  function onCanvasClick(event) {
    if (event.__schaltplanClickHandled) return;
    event.__schaltplanClickHandled = true;
    if (state.tool !== "select" && state.tool !== "symbol") return;
    const rawPoint = clientToPlan(event);
    const hit = objectAtTarget(event.target) || objectAtPoint(rawPoint);

    if (hit) {
      selectObject(hit.id);
      return;
    }

    if (state.tool === "select") selectObject(null);
  }

  function onMouseSelectFallback(event) {
    if (state.tool !== "select" && state.tool !== "symbol") return;
    const rawPoint = clientToPlan(event);
    const hit = objectAtTarget(event.target) || objectAtPoint(rawPoint);
    if (hit) selectObject(hit.id);
  }

  function importPhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
      pushHistory();
      state.background.dataUrl = String(reader.result || "");
      state.background.visible = true;
      state.background.opacity = Number(els.bgOpacity.value || 42) / 100;
      syncControls();
      render();
      setStatus("Foto geladen. Deckkraft einstellen und sauber nachzeichnen.");
    };
    reader.readAsDataURL(file);
  }

  function toggleGrid() {
    state.grid.visible = !state.grid.visible;
    syncControls();
    render();
    setStatus(state.grid.visible ? "Vorlage und Punkte eingeblendet." : "Vorlage und Punkte ausgeblendet.");
  }

  function toggleSnap() {
    state.grid.snap = true;
    syncControls();
    setStatus("Punkt-Sperre bleibt aktiv. Du kannst nur Punkte der Vorlage verbinden.");
  }

  function toggleBackground() {
    pushHistory();
    state.background.visible = !state.background.visible;
    syncControls();
    render();
  }

  function setLayer(layer, visible) {
    if (layer === "photo") {
      state.background.visible = Boolean(visible);
    } else if (layer === "template") {
      state.grid.visible = Boolean(visible);
    } else {
      state.layers[layer] = Boolean(visible);
    }
    syncControls();
    render();
  }

  function cleanSvgForExport() {
    const cloneSvg = els.svg.cloneNode(true);
    cloneSvg.querySelectorAll(".selected-vector").forEach(node => node.classList.remove("selected-vector"));
    const endpointLayer = cloneSvg.querySelector("#endpointLayer");
    if (endpointLayer) endpointLayer.innerHTML = "";
    cloneSvg.setAttribute("viewBox", "0 0 " + PLAN.width + " " + PLAN.height);
    cloneSvg.setAttribute("width", PLAN.width);
    cloneSvg.setAttribute("height", PLAN.height);
    return cloneSvg;
  }

  async function withRenderedPage(pageIndex, callback) {
    saveCurrentPageState();
    const originalIndex = currentPageIndex;
    const originalSelectedId = state.selectedId;
    const nextIndex = Math.max(0, Math.min(Number(pageIndex) || 0, planPages.length - 1));
    currentPageIndex = nextIndex;
    const page = planPages[nextIndex] || createPlanPage(nextIndex + 1);
    state.objects = clone(page.objects || []);
    state.background = { ...defaultBackground(), ...(page.background || {}) };
    state.selectedId = null;
    renderPageSelect();
    render();
    try {
      return await callback();
    } finally {
      currentPageIndex = originalIndex;
      const originalPage = planPages[originalIndex] || createPlanPage(originalIndex + 1);
      state.objects = clone(originalPage.objects || []);
      state.background = { ...defaultBackground(), ...(originalPage.background || {}) };
      state.selectedId = originalSelectedId;
      renderPageSelect();
      render();
    }
  }

  async function exportCurrentPngBlob() {
    await ensureTemplateImageData();
    const svgText = new XMLSerializer().serializeToString(cleanSvgForExport());
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = PLAN.width;
    canvas.height = PLAN.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erstellt werden.")), "image/png");
    });
  }

  async function exportPngBlob(pageIndex) {
    if (pageIndex === undefined || pageIndex === currentPageIndex) return exportCurrentPngBlob();
    return withRenderedPage(pageIndex, exportCurrentPngBlob);
  }

  async function exportPng() {
    const blob = await exportPngBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = planFileName("png");
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("PNG exportiert.");
  }

  async function loadLogoDataUrl() {
    try {
      const response = await fetch("assets/bautrail-logo.png");
      if (!response.ok) return "";
      return await blobToDataUrl(await response.blob());
    } catch (error) {
      console.log(error);
      return "";
    }
  }

  function safeFilePart(value) {
    return cleanString(value)
      .trim()
      .replace(/[^\w\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60);
  }

  function planFileName(extension) {
    const date = new Date().toISOString().slice(0, 10);
    const title = safeFilePart(els.planTitle && els.planTitle.value) || "Schaltplan";
    const customer = safeFilePart(selectedCustomerName) || "Kunde";
    return [customer, title, "Blatt_" + (currentPageIndex + 1), date]
      .filter(Boolean)
      .join("_") + "." + extension;
  }

  function statusLabel(status) {
    const labels = {
      draft: "Entwurf",
      checked: "Gepr\u00fcft",
      approved: "Freigegeben",
      archived: "Archiviert"
    };
    return labels[status] || labels.draft;
  }

  async function exportPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF-Modul konnte nicht geladen werden.");
      return;
    }
    saveCurrentPageState();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const title = cleanString(els.planTitle && els.planTitle.value).trim() || defaultPlanTitle();
    const logo = await loadLogoDataUrl();

    pdf.setFillColor(247, 247, 247);
    pdf.rect(0, 0, 297, 210, "F");
    if (logo) {
      try {
        pdf.addImage(logo, "PNG", 18, 16, 58, 22);
      } catch (error) {
        console.log(error);
      }
    }
    pdf.setTextColor(20, 20, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.text(title, 18, 58);
    pdf.setFontSize(15);
    pdf.setFont("helvetica", "normal");
    pdf.text("Kunde: " + (selectedCustomerName || "nicht zugewiesen"), 18, 76);
    pdf.text("Datum: " + new Date().toLocaleDateString("de-DE"), 18, 88);
    pdf.text("Zeichnungsnummer: " + (currentPlanId ? "SP-" + String(currentPlanId).slice(0, 8).toUpperCase() : "SP-NEU"), 18, 100);
    pdf.text("Status: " + statusLabel(currentPlanStatus), 18, 112);
    pdf.text("Bl\u00e4tter: " + planPages.length, 18, 124);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("bautrail Schaltplan-Zeichner", 18, 188);

    for (let index = 0; index < planPages.length; index += 1) {
      const blob = await exportPngBlob(index);
      const dataUrl = await blobToDataUrl(blob);
      pdf.addPage("a4", "landscape");
      pdf.addImage(dataUrl, "PNG", 10, 10, 277, 190);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text((planPages[index].title || "Blatt " + (index + 1)) + " | " + (index + 1) + " von " + planPages.length, 10, 204);
    }
    pdf.save(planFileName("pdf"));
    setStatus("PDF mit Deckblatt und allen Bl\u00e4ttern exportiert.");
  }

  function validateCurrentPlan() {
    saveCurrentPageState();
    const issues = [];
    planPages.forEach((page, pageIndex) => {
      const label = page.title || ("Blatt " + (pageIndex + 1));
      const objects = page.objects || [];
      const endpointCounts = new Map();
      objects.forEach(item => {
        if (item.type !== "line") return;
        const points = linePoints(item);
        [points[0], points[points.length - 1]].forEach(point => {
          const key = pointKey(point);
          endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
        });
        if (!cleanString(item.cable).trim()) issues.push(label + ": Leitung ohne Leitungs-/Ader-Beschriftung.");
        if (!cleanString(item.circuit).trim()) issues.push(label + ": Leitung ohne Stromkreis.");
        if (!cleanString(item.breaker).trim()) issues.push(label + ": Leitung ohne Sicherung.");
      });
      endpointCounts.forEach((count, key) => {
        if (count === 1) issues.push(label + ": offenes Leitungsende bei " + key.replace(":", " / ") + ".");
      });
      objects.forEach(item => {
        if (item.type === "symbol" && !cleanString(item.room).trim()) {
          issues.push(label + ": Symbol \"" + (symbolDefinition(item.symbol).label || "Symbol") + "\" ohne Raum.");
        }
        if (item.type === "comment" && !cleanString(item.comment || item.note).trim()) {
          issues.push(label + ": leerer Kommentar.");
        }
      });
    });

    if (els.validationPanel) {
      els.validationPanel.hidden = false;
      if (!issues.length) {
        els.validationPanel.innerHTML = "<strong>Planpr\u00fcfung bestanden.</strong><span>Keine offenen Pflichtpunkte gefunden.</span>";
      } else {
        els.validationPanel.innerHTML = "<strong>Planpr\u00fcfung</strong><ul>"
          + issues.slice(0, 8).map(item => "<li>" + item.replace(/[<>&]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char])) + "</li>").join("")
          + (issues.length > 8 ? "<li>+" + (issues.length - 8) + " weitere Hinweise</li>" : "")
          + "</ul>";
      }
    }

    setStatus(issues.length ? ("Planpr\u00fcfung: " + issues.length + " Hinweis(e).") : "Planpr\u00fcfung bestanden.");
    return issues;
  }

  function handleAction(action) {
    if (action === "delete") deleteSelected();
    if (action === "duplicate") duplicateSelected();
    if (action === "undo") undo();
    if (action === "redo") redo();
    if (action === "rotate-left") rotateSelected(-15);
    if (action === "rotate-right") rotateSelected(15);
    if (action === "zoom-in") zoomAt(0.82);
    if (action === "zoom-out") zoomAt(1.18);
    if (action === "zoom-reset") resetZoom();
    if (action === "validate-plan") validateCurrentPlan();
    if (action === "export-png") exportPng();
    if (action === "export-pdf") exportPdf();
  }

  function bindPropertyEvents() {
    if (!els.propertyForm) return;
    els.propertyForm.addEventListener("submit", event => event.preventDefault());

    [
      els.propName,
      els.propText,
      els.propComment,
      els.propCable,
      els.propCircuit,
      els.propBreaker,
      els.propRoom,
      els.propNote,
      els.propColor,
      els.propWidth,
      els.propRotation,
      els.propSize,
      els.propSymbol
    ].filter(Boolean).forEach(input => {
      input.addEventListener("input", updateSelectedFromProperties);
      input.addEventListener("change", endPropertyHistory);
      input.addEventListener("blur", endPropertyHistory);
      input.addEventListener("pointerup", endPropertyHistory);
      input.addEventListener("pointercancel", endPropertyHistory);
    });
  }

  function bindEvents() {
    document.querySelectorAll("[data-tool]").forEach(button => {
      button.addEventListener("click", () => setTool(button.dataset.tool));
    });

    document.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => handleAction(button.dataset.action));
    });

    document.querySelectorAll("[data-toggle]").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.toggle === "grid") toggleGrid();
        if (button.dataset.toggle === "background") toggleBackground();
        if (button.dataset.toggle === "snap") toggleSnap();
      });
    });

    if (els.symbolList) {
      els.symbolList.addEventListener("click", event => {
        const deleteButton = event.target.closest("[data-delete-symbol]");
        if (deleteButton) {
          deleteCustomSymbol(deleteButton.dataset.deleteSymbol);
          return;
        }
        const button = event.target.closest("[data-symbol]");
        if (!button) return;
        setActiveSymbol(button.dataset.symbol);
        setTool("symbol");
      });
    }

    if (els.saveCustomSymbol) {
      els.saveCustomSymbol.addEventListener("click", createCustomSymbol);
    }

    if (els.openSymbolBuilder) {
      els.openSymbolBuilder.addEventListener("click", openSymbolBuilder);
    }

    if (els.closeSymbolBuilder) {
      els.closeSymbolBuilder.addEventListener("click", closeSymbolBuilder);
    }

    if (els.symbolBuilderModal) {
      els.symbolBuilderModal.addEventListener("click", event => {
        if (event.target === els.symbolBuilderModal) closeSymbolBuilder();
      });
    }

    document.querySelectorAll("[data-symbol-builder-tool]").forEach(button => {
      button.addEventListener("click", () => setSymbolBuilderTool(button.dataset.symbolBuilderTool));
    });

    if (els.deleteSymbolBuilderItem) {
      els.deleteSymbolBuilderItem.addEventListener("click", deleteBuilderSelected);
    }

    if (els.clearSymbolBuilder) {
      els.clearSymbolBuilder.addEventListener("click", clearSymbolBuilder);
    }

    if (els.symbolBuilderSvg) {
      els.symbolBuilderSvg.addEventListener("pointerdown", onBuilderPointerDown);
      els.symbolBuilderSvg.addEventListener("pointermove", onBuilderPointerMove);
      els.symbolBuilderSvg.addEventListener("pointerup", onBuilderPointerUp);
      els.symbolBuilderSvg.addEventListener("pointercancel", onBuilderPointerUp);
      els.symbolBuilderSvg.addEventListener("dblclick", editBuilderTextFromDoubleClick);
    }

    [els.symbolBuilderText, els.symbolBuilderSize].filter(Boolean).forEach(input => {
      input.addEventListener("input", updateSelectedBuilderText);
    });

    [els.customSymbolName, els.customSymbolCode].filter(Boolean).forEach(input => {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") createCustomSymbol(event);
      });
    });

    if (els.symbolType) {
      els.symbolType.addEventListener("change", () => {
        setActiveSymbol(els.symbolType.value);
        setTool("symbol");
      });
    }

    if (els.symbolSearch) {
      els.symbolSearch.addEventListener("input", renderSymbolPalette);
    }

    if (els.symbolGroup) {
      els.symbolGroup.addEventListener("change", renderSymbolPalette);
    }

    if (els.photoInput) {
      els.photoInput.addEventListener("change", event => {
        importPhoto(event.target.files && event.target.files[0]);
      });
    }

    if (els.saveCircuitPlan) {
      els.saveCircuitPlan.addEventListener("click", saveCircuitPlan);
    }

    if (els.newCircuitPlan) {
      els.newCircuitPlan.addEventListener("click", newCircuitPlan);
    }

    if (els.refreshCircuitPlans) {
      els.refreshCircuitPlans.addEventListener("click", refreshSharedData);
    }

    if (els.planSelect) {
      els.planSelect.addEventListener("change", loadSelectedPlan);
    }

    if (els.planCustomer) {
      els.planCustomer.addEventListener("change", () => selectPlanCustomer(els.planCustomer.value));
    }

    if (els.planTitle) {
      els.planTitle.addEventListener("input", renderTemplateFields);
    }

    if (els.planStatus) {
      els.planStatus.addEventListener("change", () => {
        currentPlanStatus = cleanString(els.planStatus.value || "draft");
        renderTemplateFields();
      });
    }

    if (els.pageSelect) {
      els.pageSelect.addEventListener("change", () => switchPage(els.pageSelect.value));
    }

    if (els.addCircuitPage) {
      els.addCircuitPage.addEventListener("click", addCircuitPage);
    }

    if (els.deleteCircuitPage) {
      els.deleteCircuitPage.addEventListener("click", deleteCircuitPage);
    }

    if (els.restoreCircuitVersion) {
      els.restoreCircuitVersion.addEventListener("click", restoreSelectedVersion);
    }

    [
      { input: els.layerPhoto, layer: "photo" },
      { input: els.layerTemplate, layer: "template" },
      { input: els.layerLines, layer: "lines" },
      { input: els.layerSymbols, layer: "symbols" },
      { input: els.layerTexts, layer: "texts" },
      { input: els.layerComments, layer: "comments" }
    ].forEach(item => {
      if (!item.input) return;
      item.input.addEventListener("change", () => setLayer(item.layer, item.input.checked));
    });

    function beginControlHistory() {
      if (controlHistoryActive) return;
      pushHistory();
      controlHistoryActive = true;
    }

    function endControlHistory() {
      controlHistoryActive = false;
    }

    if (els.bgOpacity) {
      els.bgOpacity.addEventListener("pointerdown", beginControlHistory);
      els.bgOpacity.addEventListener("input", () => {
        beginControlHistory();
        state.background.opacity = Number(els.bgOpacity.value || 42) / 100;
        render();
      });
      els.bgOpacity.addEventListener("change", endControlHistory);
    }

    if (els.gridSize) {
      els.gridSize.addEventListener("pointerdown", beginControlHistory);
      els.gridSize.addEventListener("input", () => {
        beginControlHistory();
        state.grid.size = Number(els.gridSize.value || 25);
        render();
      });
      els.gridSize.addEventListener("change", endControlHistory);
    }

    els.svg.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerdown", event => {
      if (els.svg.contains(event.target)) onPointerDown(event);
    }, true);
    els.svg.addEventListener("pointermove", onPointerMove);
    els.svg.addEventListener("pointerup", onPointerUp);
    els.svg.addEventListener("pointercancel", onPointerUp);
    els.svg.addEventListener("click", onCanvasClick, true);
    document.addEventListener("click", event => {
      if (els.svg.contains(event.target)) onCanvasClick(event);
    }, true);
    document.addEventListener("mousedown", event => {
      if (els.svg.contains(event.target)) onMouseSelectFallback(event);
    }, true);
    els.svg.addEventListener("dblclick", event => {
      const item = objectAtTarget(event.target);
      if (!item || (item.type !== "text" && item.type !== "comment")) return;
      const next = prompt(item.type === "comment" ? "Kommentar \u00e4ndern:" : "Text \u00e4ndern:", item.type === "comment" ? (item.comment || item.note || "") : (item.text || ""));
      if (next === null) return;
      pushHistory();
      if (item.type === "comment") {
        item.comment = next.trim() || "Kommentar";
        item.note = item.comment;
      } else {
        item.text = next;
      }
      render();
    });
    els.svg.addEventListener("wheel", event => {
      event.preventDefault();
      const center = clientToPlan(event);
      zoomAt(event.deltaY < 0 ? 0.9 : 1.1, center);
    }, { passive: false });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && els.symbolBuilderModal && !els.symbolBuilderModal.hidden) {
        event.preventDefault();
        closeSymbolBuilder();
        return;
      }
      const tag = (event.target && event.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      }
    });

    bindPropertyEvents();
  }

  bindEvents();
  window.addEventListener("online", () => {
    refreshSharedData();
  });
  setSymbolBuilderTool("select");
  renderSymbolBuilder();
  ensureTemplateImageData().catch(error => console.log(error));
  renderSymbolOptions();
  renderSymbolPalette();
  renderCustomerSelect();
  renderPlanSelect();
  renderPageSelect();
  renderVersionSelect();
  syncControls();
  applyCamera();
  render();
  window.createCustomCircuitSymbol = createCustomSymbol;
  refreshSharedData();
})();

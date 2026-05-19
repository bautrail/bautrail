(function() {
  const STORAGE_BUCKET = "bilder";
  const FOLDERS_KEY = "projectDocumentFolders";
  const DOCUMENTS_KEY = "projectDocumentFiles";
  const IMAGE_FOLDERS_KEY = "projectImageFolders";
  const DB_NAME = "baudokuDocumentStore";
  const STORE_NAME = "files";

  let dbPromise;
  let getProjectId = function() { return null; };
  let setStatus = function() {};
  let onFolderChange = function() {};
  let currentFolderId = null;

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

  function makeId(prefix) {
    return [
      prefix,
      Date.now(),
      Math.random().toString(36).slice(2)
    ].join("_");
  }

  function normalizeId(id) {
    return id === undefined || id === null || id === "" ? null : String(id);
  }

  function sameId(a, b) {
    return normalizeId(a) === normalizeId(b);
  }

  function hasSupabase() {
    return Boolean(window.db && navigator.onLine);
  }

  function isOfflineProjectId(id) {
    return String(id || "").startsWith("offline_");
  }

  function safeFileName(name) {
    return String(name || "datei")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
  }

  function formatSize(size) {
    if (!size) return "";
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + " KB";
    return (size / 1024 / 1024).toFixed(1) + " MB";
  }

  function getFolders() {
    return readJson(FOLDERS_KEY);
  }

  function saveFolders(folders) {
    writeJson(FOLDERS_KEY, folders);
  }

  function getDocuments() {
    return readJson(DOCUMENTS_KEY);
  }

  function saveDocuments(documents) {
    writeJson(DOCUMENTS_KEY, documents);
  }

  function getImageFolders() {
    return readJson(IMAGE_FOLDERS_KEY);
  }

  function saveImageFolders(items) {
    writeJson(IMAGE_FOLDERS_KEY, items);
  }

  function getProjectFolders(projectId) {
    return getFolders().filter(folder => sameId(folder.project_id, projectId));
  }

  function getProjectDocuments(projectId) {
    return getDocuments().filter(file => sameId(file.project_id, projectId));
  }

  function getProjectImageFolders(projectId) {
    return getImageFolders().filter(item => sameId(item.project_id, projectId));
  }

  function replaceProjectItems(key, projectId, incoming) {
    const existing =
      readJson(key).filter(item => !sameId(item.project_id, projectId));

    writeJson(key, existing.concat(incoming));
  }

  function cacheFolderRow(projectId, row) {
    return {
      id: String(row.id),
      project_id: String(row.project_id || projectId),
      parent_id: normalizeId(row.parent_id),
      name: row.name || "Ordner",
      created_at: row.created_at || new Date().toISOString(),
      synced: true
    };
  }

  function cacheDocumentRow(projectId, row) {
    return {
      id: String(row.id),
      project_id: String(row.project_id || projectId),
      folder_id: normalizeId(row.folder_id),
      name: row.file_name || row.name || "Dokument",
      type: row.file_type || row.type || "application/octet-stream",
      size: row.file_size || row.size || 0,
      created_at: row.created_at || new Date().toISOString(),
      storage_bucket: row.storage_bucket || STORAGE_BUCKET,
      storage_path: row.storage_path || "",
      public_url: row.file_url || row.public_url || "",
      synced: true
    };
  }

  function getImageFolder(projectId, imageKey) {
    const match =
      getImageFolders().find(item =>
        sameId(item.project_id, projectId) &&
        String(item.image_key) === String(imageKey)
      );

    return match ? normalizeId(match.folder_id) : null;
  }

  function imageBelongsToFolder(projectId, imageKey, folderId) {
    return sameId(getImageFolder(projectId, imageKey), folderId);
  }

  function setImageFolderCache(projectId, imageKey, folderId) {
    if (!projectId || !imageKey) return;

    const targetFolder = normalizeId(folderId);
    let items =
      getImageFolders().filter(item =>
        !(
          sameId(item.project_id, projectId) &&
          String(item.image_key) === String(imageKey)
        )
      );

    if (targetFolder !== null) {
      items.push({
        project_id: String(projectId),
        image_key: String(imageKey),
        folder_id: targetFolder
      });
    }

    saveImageFolders(items);
  }

  function documentPath(projectId, file) {
    return [
      "documents",
      projectId,
      file.id + "_" + safeFileName(file.name)
    ].join("/");
  }

  function openDocumentDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB ist nicht verfügbar"));
        return;
      }

      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = function() {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });

    return dbPromise;
  }

  async function saveBlob(id, blob) {
    const database = await openDocumentDb();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ id, blob });
      tx.oncomplete = resolve;
      tx.onerror = function() { reject(tx.error); };
    });
  }

  async function getBlob(id) {
    const database = await openDocumentDb();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = function() { resolve(request.result); };
      request.onerror = function() { reject(request.error); };
    });
  }

  async function loadRemoteProject(projectId) {
    if (!hasSupabase() || !projectId || isOfflineProjectId(projectId)) return;

    const foldersResult =
      await window.db
        .from("project_folders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (!foldersResult.error) {
      replaceProjectItems(
        FOLDERS_KEY,
        projectId,
        (foldersResult.data || []).map(row => cacheFolderRow(projectId, row))
      );
    } else {
      console.log(foldersResult.error);
    }

    const documentsResult =
      await window.db
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (!documentsResult.error) {
      replaceProjectItems(
        DOCUMENTS_KEY,
        projectId,
        (documentsResult.data || []).map(row => cacheDocumentRow(projectId, row))
      );
    } else {
      console.log(documentsResult.error);
    }

    const imagesResult =
      await window.db
        .from("project_images")
        .select("*")
        .eq("project_id", projectId);

    if (!imagesResult.error) {
      replaceProjectItems(
        IMAGE_FOLDERS_KEY,
        projectId,
        (imagesResult.data || [])
          .filter(row => row.folder_id && row.image_url)
          .map(row => ({
            project_id: String(projectId),
            image_key: String(row.image_url),
            folder_id: normalizeId(row.folder_id)
          }))
      );
    } else {
      console.log(imagesResult.error);
    }
  }

  async function insertFolder(projectId, folder) {
    const { data, error } =
      await window.db
        .from("project_folders")
        .insert([{
          project_id: projectId,
          parent_id: normalizeId(folder.parent_id),
          name: folder.name
        }])
        .select()
        .single();

    if (error) throw error;
    return cacheFolderRow(projectId, data || folder);
  }

  async function insertDocument(projectId, file, path) {
    const payload = {
      project_id: projectId,
      folder_id: normalizeId(file.folder_id),
      file_name: file.name,
      file_url: path,
      storage_bucket: STORAGE_BUCKET,
      storage_path: path,
      file_type: file.type || "application/octet-stream",
      file_size: Number(file.size || 0)
    };

    const { data, error } =
      await window.db
        .from("project_documents")
        .insert([payload])
        .select()
        .single();

    if (error) throw error;

    return {
      ...cacheDocumentRow(projectId, data || payload),
      storage_bucket: STORAGE_BUCKET,
      storage_path: path
    };
  }

  async function updateDocumentFolder(file, folderId) {
    if (!hasSupabase() || file.synced !== true) return false;

    const { error } =
      await window.db
        .from("project_documents")
        .update({ folder_id: normalizeId(folderId) })
        .eq("id", file.id);

    if (error) {
      console.log(error);
      return false;
    }

    return true;
  }

  async function updateImageFolder(projectId, imageKey, folderId) {
    if (!hasSupabase() || !projectId || !imageKey) return false;

    const { error } =
      await window.db
        .from("project_images")
        .update({ folder_id: normalizeId(folderId) })
        .eq("project_id", projectId)
        .eq("image_url", imageKey);

    if (error) {
      console.log(error);
      return false;
    }

    return true;
  }

  async function syncProject(projectId) {
    if (!hasSupabase() || !projectId || isOfflineProjectId(projectId)) return;

    const documents = getDocuments();
    let changed = false;

    for (let file of documents) {
      if (!sameId(file.project_id, projectId) || file.synced === true) continue;

      try {
        const record = await getBlob(file.id);
        if (!record || !record.blob) continue;

        const path = documentPath(projectId, file);
        const { error: uploadError } =
          await window.db
            .storage
            .from(STORAGE_BUCKET)
            .upload(path, record.blob, {
              contentType: file.type || "application/octet-stream",
              upsert: true
            });

        if (uploadError) {
          console.log(uploadError);
          continue;
        }

        const saved =
          await insertDocument(projectId, file, path);

        Object.assign(file, saved);
        changed = true;
      } catch (err) {
        console.log(err);
      }
    }

    if (changed) saveDocuments(documents);
    await loadRemoteProject(projectId);
    render();
  }

  async function syncAll() {
    if (!hasSupabase()) return;

    const ids = new Set();
    getDocuments()
      .filter(file => file.synced !== true)
      .forEach(file => ids.add(String(file.project_id)));

    const currentProjectId = getProjectId();
    if (currentProjectId) ids.add(String(currentProjectId));

    for (let projectId of ids) {
      await syncProject(projectId);
    }
  }

  function hasPending() {
    return getDocuments().some(file => file.synced !== true);
  }

  async function migrateProjectId(oldId, newId) {
    if (!oldId || !newId || sameId(oldId, newId)) return;

    saveFolders(
      getFolders().map(folder =>
        sameId(folder.project_id, oldId)
          ? { ...folder, project_id: String(newId), synced: false }
          : folder
      )
    );

    saveDocuments(
      getDocuments().map(file =>
        sameId(file.project_id, oldId)
          ? { ...file, project_id: String(newId), synced: false, storage_bucket: STORAGE_BUCKET, storage_path: "", public_url: "" }
          : file
      )
    );

    saveImageFolders(
      getImageFolders().map(item =>
        sameId(item.project_id, oldId)
          ? { ...item, project_id: String(newId) }
          : item
      )
    );

    await syncProject(newId);
  }

  async function migrateImageKey(projectId, oldKey, newKey, folderId) {
    if (!projectId || !oldKey || !newKey) return;

    const folder =
      folderId !== undefined
        ? normalizeId(folderId)
        : getImageFolder(projectId, oldKey);

    setImageFolderCache(projectId, newKey, folder);
    await updateImageFolder(projectId, newKey, folder);
  }

  function findFolder(folderId) {
    return getFolders().find(folder => sameId(folder.id, folderId));
  }

  function folderChain(folderId) {
    const chain = [];
    let active = findFolder(folderId);

    while (active) {
      chain.unshift(active);
      active = findFolder(active.parent_id);
    }

    return chain;
  }

  function getFolderOptions(projectId) {
    const folders =
      getProjectFolders(projectId)
        .sort((a, b) => a.name.localeCompare(b.name));

    const result = [{ id: null, name: "Projekt", depth: 0 }];

    function addChildren(parentId, depth) {
      folders
        .filter(folder => sameId(folder.parent_id, parentId))
        .forEach(folder => {
          result.push({ id: folder.id, name: folder.name, depth });
          addChildren(folder.id, depth + 1);
        });
    }

    addChildren(null, 1);
    return result;
  }

  function ensureDialog() {
    let backdrop = document.getElementById("folderDialogBackdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "folderDialogBackdrop";
    backdrop.className = "folder-dialog-backdrop";
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function closeDialog(backdrop) {
    backdrop.style.display = "none";
    backdrop.innerHTML = "";
  }

  function askFolderName() {
    return new Promise(resolve => {
      const backdrop = ensureDialog();

      backdrop.innerHTML = `
        <div class="folder-dialog">
          <h3>Neuer Ordner</h3>
          <input id="folderNameInput" type="text" placeholder="Ordnername">
          <div class="folder-dialog-actions">
            <button id="folderCancelBtn" class="login-btn" style="background:#444;">Abbrechen</button>
            <button id="folderSaveBtn" class="login-btn">Erstellen</button>
          </div>
        </div>
      `;

      backdrop.style.display = "flex";

      const input = document.getElementById("folderNameInput");
      const cancel = document.getElementById("folderCancelBtn");
      const save = document.getElementById("folderSaveBtn");

      function finish(value) {
        closeDialog(backdrop);
        resolve(value);
      }

      cancel.addEventListener("click", () => finish(null));
      save.addEventListener("click", () => finish(input.value.trim() || null));
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") save.click();
        if (event.key === "Escape") cancel.click();
      });

      setTimeout(() => input.focus(), 50);
    });
  }

  function chooseFolder(title) {
    return new Promise(resolve => {
      const projectId = getProjectId();
      const backdrop = ensureDialog();

      backdrop.innerHTML = `
        <div class="folder-dialog">
          <h3>${title}</h3>
          <div id="folderChoiceList" class="folder-choice-list"></div>
          <div class="folder-dialog-actions">
            <button id="folderMoveCancelBtn" class="login-btn" style="background:#444;">Abbrechen</button>
          </div>
        </div>
      `;

      backdrop.style.display = "flex";

      const list = document.getElementById("folderChoiceList");

      getFolderOptions(projectId).forEach(option => {
        const button = document.createElement("button");
        button.textContent = " ".repeat(option.depth * 2) + option.name;
        button.style.paddingLeft = 12 + option.depth * 14 + "px";
        button.addEventListener("click", () => {
          closeDialog(backdrop);
          resolve(normalizeId(option.id));
        });
        list.appendChild(button);
      });

      document.getElementById("folderMoveCancelBtn").addEventListener("click", () => {
        closeDialog(backdrop);
        resolve(undefined);
      });
    });
  }

  function notifyFolderChange() {
    onFolderChange(currentFolderId);
  }

  function setCurrentFolder(folderId) {
    currentFolderId = normalizeId(folderId);
    render();
    notifyFolderChange();
  }

  function renderPath() {
    const path = document.getElementById("folderPath");
    if (!path) return;

    path.innerHTML = "";

    const rootButton = document.createElement("button");
    rootButton.className = "folder-path-btn";
    rootButton.textContent = "Projekt";
    rootButton.addEventListener("click", () => setCurrentFolder(null));
    path.appendChild(rootButton);

    folderChain(currentFolderId).forEach(folder => {
      const button = document.createElement("button");
      button.className = "folder-path-btn";
      button.textContent = folder.name;
      button.addEventListener("click", () => setCurrentFolder(folder.id));
      path.appendChild(button);
    });
  }

  function labelForFile(file) {
    const type = String(file.type || "").toLowerCase();

    if (type.includes("pdf")) return "PDF";
    if (type.includes("audio")) return "AUD";
    if (type.includes("image")) return "IMG";
    return "DOC";
  }

  function rowClassFor(kind) {
    return "task-card document-row document-row-" + kind;
  }

  function makeRow(title, meta, label, kind, onClick, action) {
    const row = document.createElement("div");
    row.className = rowClassFor(kind);

    const icon = document.createElement("div");
    icon.className = "document-icon document-icon-" + kind;
    icon.textContent = label;
    icon.style.width = "34px";
    icon.style.fontWeight = "700";

    const main = document.createElement("div");
    main.className = "document-main";

    const name = document.createElement("div");
    name.className = "document-title";
    name.textContent = title;

    const details = document.createElement("div");
    details.className = "document-meta";
    details.textContent = meta;

    main.appendChild(name);
    main.appendChild(details);
    row.appendChild(icon);
    row.appendChild(main);

    if (action) {
      const button = document.createElement("button");
      button.className = "document-action-btn";
      button.textContent = action.label;
      button.addEventListener("click", event => {
        event.stopPropagation();
        action.onClick();
      });
      row.appendChild(button);
    }

    row.addEventListener("click", onClick);
    return row;
  }

  function render() {
    const list = document.getElementById("documentList");
    if (!list) return;

    const projectId = getProjectId();
    if (!projectId) return;

    if (currentFolderId && !findFolder(currentFolderId)) {
      currentFolderId = null;
    }

    list.innerHTML = "";
    renderPath();

    const folders =
      getProjectFolders(projectId)
        .filter(folder => sameId(folder.parent_id, currentFolderId))
        .sort((a, b) => a.name.localeCompare(b.name));

    const documents =
      getProjectDocuments(projectId)
        .filter(file => sameId(file.folder_id, currentFolderId))
        .sort((a, b) => a.name.localeCompare(b.name));

    folders.forEach(folder => {
      list.appendChild(
        makeRow(folder.name, "Ordner", "ORD", "folder", () => setCurrentFolder(folder.id))
      );
    });

    documents.forEach(file => {
      const meta = [
        file.synced === true ? "Synchronisiert" : "Offline vorgemerkt",
        formatSize(file.size)
      ].filter(Boolean).join(" - ");

      list.appendChild(
        makeRow(
          file.name,
          meta,
          labelForFile(file),
          "file",
          () => openDocument(file.id),
          {
            label: "Verschieben",
            onClick: () => moveDocument(file.id)
          }
        )
      );
    });
  }

  async function load() {
    const projectId = getProjectId();
    if (!projectId) return;

    if (hasSupabase()) {
      await syncProject(projectId);
    } else {
      render();
    }
  }

  async function createFolder() {
    const projectId = getProjectId();
    if (!projectId) return;

    const name = await askFolderName();
    if (!name) return;

    const fallbackFolder = {
      id: makeId("folder"),
      project_id: String(projectId),
      parent_id: normalizeId(currentFolderId),
      name,
      created_at: new Date().toISOString(),
      synced: false
    };

    try {
      const folder =
        hasSupabase() && !isOfflineProjectId(projectId)
          ? await insertFolder(projectId, fallbackFolder)
          : fallbackFolder;

      saveFolders(getFolders().concat(folder));
      setStatus(folder.synced ? "Ordner angelegt und gespeichert" : "Ordner wird synchronisiert", folder.synced ? "#9be15d" : "orange");
    } catch (err) {
      console.log(err);
      saveFolders(getFolders().concat(fallbackFolder));
      setStatus("Ordner wird synchronisiert", "orange");
    }

    render();
  }

  async function addFiles(files) {
    const projectId = getProjectId();
    if (!projectId || !files || !files.length) return;

    const documents = getDocuments();

    for (let file of files) {
      if (window.BaudokuStorageQuota && window.BAUDOKU_AUTH_CONTEXT) {
        const quota = await window.BaudokuStorageQuota.canUploadBytes(window.BAUDOKU_AUTH_CONTEXT, file.size || 0);
        if (!quota.allowed) {
          setStatus("Speicherlimit erreicht: " + window.BaudokuStorageQuota.formatBytes(quota.status.used_bytes) + " von " + window.BaudokuStorageQuota.formatBytes(quota.status.limit_bytes), "red");
          continue;
        }
      }
      const localFile = {
        id: makeId("doc"),
        project_id: String(projectId),
        folder_id: normalizeId(currentFolderId),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        created_at: new Date().toISOString(),
        storage_bucket: STORAGE_BUCKET,
        storage_path: "",
        public_url: "",
        synced: false
      };

      try {
        if (hasSupabase() && !isOfflineProjectId(projectId)) {
          const path = documentPath(projectId, localFile);
          const { error: uploadError } =
            await window.db
              .storage
              .from(STORAGE_BUCKET)
              .upload(path, file, {
                contentType: localFile.type,
                upsert: true
              });

          if (uploadError) throw uploadError;

          const saved =
            await insertDocument(
              projectId,
              localFile,
              path
            );

          documents.push(saved);
          continue;
        }

        await saveBlob(localFile.id, file);
        documents.push(localFile);
      } catch (err) {
        console.log(err);

        try {
          await saveBlob(localFile.id, file);
          documents.push(localFile);
        } catch (blobErr) {
          console.log(blobErr);
          setStatus("Dokument konnte nicht gespeichert werden", "red");
        }
      }
    }

    saveDocuments(documents);
    render();
    setStatus(hasSupabase() ? "Dokument bereits hochgeladen" : "Dokument wird synchronisiert", hasSupabase() ? "#9be15d" : "orange");
  }

  async function moveDocument(id) {
    const file = getDocuments().find(item => sameId(item.id, id));
    if (!file) return;

    const folderId = await chooseFolder("Dokument verschieben");
    if (folderId === undefined) return;

    await updateDocumentFolder(file, folderId);

    saveDocuments(
      getDocuments().map(item =>
        sameId(item.id, id)
          ? { ...item, folder_id: folderId }
          : item
      )
    );

    render();
  }

  async function moveImage(imageKey, projectId) {
    const folderId = await chooseFolder("Bild verschieben");
    if (folderId === undefined) return;

    await assignImageToFolder(imageKey, projectId, folderId);
    render();
    notifyFolderChange();
  }

  async function assignImageToFolder(imageKey, projectId, folderId) {
    setImageFolderCache(projectId, imageKey, folderId);
    await updateImageFolder(projectId, imageKey, folderId);
  }

  async function openDocument(id) {
    const file = getDocuments().find(item => sameId(item.id, id));
    if (!file) return;

    const target = window.open("", "_blank");

    try {
      const record = await getBlob(file.id);
      if (record && record.blob) {
        const url = URL.createObjectURL(record.blob);

        if (target) {
          target.location.href = url;
        } else {
          window.location.href = url;
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
    } catch (err) {
      console.log(err);
    }

    let remoteUrl = file.public_url || "";
    if (window.BautrailStorageLinks && (file.storage_path || file.public_url)) {
      remoteUrl = await window.BautrailStorageLinks.resolveRowUrl(file, {
        urlField: "public_url",
        pathField: "storage_path",
        bucketField: "storage_bucket",
        defaultBucket: STORAGE_BUCKET,
        expiresIn: 3600
      });
    }

    if (remoteUrl) {
      if (target) {
        target.location.href = remoteUrl;
      } else {
        window.open(remoteUrl, "_blank");
      }
      return;
    }

    if (target) {
      target.document.body.textContent = "Dieses Dokument ist noch nicht verfuegbar.";
    }
  }

  async function getProjectExportData(projectId) {
    if (hasSupabase()) {
      await syncProject(projectId);
    }

    const documents = [];

    for (let file of getProjectDocuments(projectId)) {
      let blob = null;

      try {
        const record = await getBlob(file.id);
        if (record && record.blob) blob = record.blob;
      } catch (err) {
        console.log(err);
      }

      documents.push({ ...file, blob });
    }

    return {
      folders: getProjectFolders(projectId),
      documents,
      imageFolders: getProjectImageFolders(projectId)
    };
  }

  function init(options) {
    getProjectId = options.getProjectId || getProjectId;
    setStatus = options.setStatus || setStatus;
    onFolderChange = options.onFolderChange || onFolderChange;

    const input = document.getElementById("documentInput");

    if (input && !input.dataset.bound) {
      input.dataset.bound = "true";
      input.addEventListener("change", async function() {
        await addFiles(this.files);
        this.value = "";
      });
    }

    window.createDocumentFolder = createFolder;
    window.openDocumentPicker = function() {
      const picker = document.getElementById("documentInput");
      if (picker) picker.click();
    };

    return load();
  }

  window.BaudokuDocuments = {
    init,
    load,
    render,
    syncAll,
    syncProject,
    migrateProjectId,
    migrateImageKey,
    moveImage,
    assignImageToFolder,
    addFiles,
    getProjectExportData,
    imageBelongsToFolder,
    getCurrentFolderId: () => currentFolderId,
    hasPending
  };
})();

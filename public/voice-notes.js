(function() {
  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function startSpeechToText(options) {
    const opts = options || {};
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      if (opts.onStatus) opts.onStatus("Spracherkennung ist in diesem Browser nicht verfuegbar.");
      return {
        supported: false,
        stop: function() {},
        getText: function() { return ""; }
      };
    }

    const recognition = new SpeechRecognition();
    let finalText = "";

    recognition.lang = opts.lang || "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript || "";
        if (event.results[i].isFinal) {
          finalText += text.trim() + " ";
        } else {
          interim += text;
        }
      }

      const combined = (finalText + interim).trim();
      if (opts.onText) opts.onText(combined);
    };

    recognition.onerror = function(event) {
      if (opts.onStatus) {
        opts.onStatus("Spracherkennung: " + (event.error || "Fehler"));
      }
    };

    recognition.onend = function() {
      if (opts.onStatus) opts.onStatus("Spracherkennung beendet.");
    };

    try {
      recognition.start();
      if (opts.onStatus) opts.onStatus("Spracherkennung laeuft...");
    } catch (error) {
      console.log(error);
    }

    return {
      supported: true,
      stop: function() {
        try {
          recognition.stop();
        } catch (error) {
          console.log(error);
        }
      },
      getText: function() {
        return finalText.trim();
      }
    };
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

  function safePathPart(value) {
    return String(value || "note")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "note";
  }

  async function saveVoiceNote(options) {
    const opts = options || {};
    const ctx = await getContext();
    if (!ctx || !ctx.company_id) {
      return { data: null, error: { message: "Keine Firmenzuordnung vorhanden." } };
    }

    if (!opts.audioBlob && !opts.storage_path && !opts.audio_url) {
      return { data: null, error: { message: "Keine Audioaufnahme vorhanden." } };
    }

    if (opts.audioBlob && window.BautrailStorageQuota && window.BAUDOKU_AUTH_CONTEXT) {
      const quota = await window.BaudokuStorageQuota.canUploadBytes(window.BAUDOKU_AUTH_CONTEXT, opts.audioBlob.size || 0);
      if (!quota.allowed) {
        return { data: null, error: { message: "Speicherlimit erreicht." } };
      }
    }

    const path = opts.storage_path || opts.audio_url || [
      "voice-notes",
      ctx.company_id,
      safePathPart(opts.filePrefix),
      Date.now() + ".webm"
    ].join("/");

    if (opts.audioBlob && !opts.storage_path && !opts.audio_url) {
      const { error: uploadError } = await db
        .storage
        .from("bilder")
        .upload(path, opts.audioBlob, {
          contentType: "audio/webm",
          upsert: true
        });

      if (uploadError) {
        console.log(uploadError);
        return { data: null, error: uploadError };
      }
    }

    const payload = {
      company_id: ctx.company_id,
      customer_id: opts.customer_id || null,
      project_id: opts.project_id || null,
      auftrag_id: opts.auftrag_id || null,
      audio_url: path,
      storage_bucket: "bilder",
      storage_path: path,
      file_size: Number(opts.file_size || (opts.audioBlob ? opts.audioBlob.size : 0) || 0),
      transcript: String(opts.transcript || "").trim(),
      note_text: String(opts.note_text || opts.transcript || "").trim(),
      source: opts.source || "audio",
      created_by: ctx.user_id || null
    };

    const { data, error } = await db
      .from("voice_notes")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.log(error);
      return { data: null, error };
    }

    return { data, error: null };
  }

  async function loadVoiceNotes(filters) {
    const ctx = await getContext();
    const opts = filters || {};
    if (!ctx || !ctx.company_id) return [];

    let query = db
      .from("voice_notes")
      .select("*")
      .eq("company_id", ctx.company_id)
      .order("created_at", { ascending: false })
      .limit(opts.limit || 20);

    if (opts.customer_id) query = query.eq("customer_id", opts.customer_id);
    if (opts.project_id) query = query.eq("project_id", opts.project_id);
    if (opts.auftrag_id) query = query.eq("auftrag_id", opts.auftrag_id);

    const { data, error } = await query;
    if (error) {
      console.log(error);
      return [];
    }

    return data || [];
  }

  async function resolveAudioUrl(note) {
    if (!note) return "";
    if (window.BautrailStorageLinks) {
      return await window.BautrailStorageLinks.resolveRowUrl(note, {
        urlField: "audio_url",
        pathField: "storage_path",
        bucketField: "storage_bucket",
        defaultBucket: "bilder",
        expiresIn: 3600
      });
    }
    return note.audio_url || "";
  }

  window.BautrailVoiceNotes = {
    loadVoiceNotes,
    resolveAudioUrl,
    saveVoiceNote,
    startSpeechToText
  };
})();

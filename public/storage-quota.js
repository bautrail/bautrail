(function() {
  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + ' KB';
    if (value < 1024 * 1024 * 1024) return (value / 1024 / 1024).toFixed(1) + ' MB';
    return (value / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  async function loadStatus(context) {
    if (!window.db || !context || !context.company_id) {
      return {
        plan_code: 'starter',
        included_storage_mb: 2048,
        extra_storage_mb: 0,
        storage_limit_mb: 2048,
        storage_limit_enabled: true,
        used_bytes: 0,
        limit_bytes: 2048 * 1024 * 1024,
        percent: 0,
        remaining_bytes: 2048 * 1024 * 1024,
        over_limit: false
      };
    }

    const [companyRes, docRes, imageRes, audioRes, companyDocRes] = await Promise.all([
      window.db.from('companies').select('plan_code, included_storage_mb, extra_storage_mb, storage_limit_mb, storage_limit_enabled').eq('id', context.company_id).maybeSingle(),
      window.db.from('project_documents').select('file_size').eq('company_id', context.company_id),
      window.db.from('project_images').select('file_size').eq('company_id', context.company_id),
      window.db.from('project_audio').select('file_size').eq('company_id', context.company_id),
      window.db.from('company_documents').select('file_size').eq('company_id', context.company_id)
    ]);

    [companyRes, docRes, imageRes, audioRes, companyDocRes].forEach(result => {
      if (result && result.error) console.log(result.error);
    });

    const company = companyRes.data || {};
    const usedBytes = [docRes, imageRes, audioRes, companyDocRes]
      .flatMap(result => result.data || [])
      .reduce((sum, item) => sum + Number(item.file_size || 0), 0);

    const limitMb = Number(company.storage_limit_mb || ((company.included_storage_mb || 2048) + (company.extra_storage_mb || 0)) || 2048);
    const limitBytes = Math.max(1, limitMb) * 1024 * 1024;
    const percent = clampPercent((usedBytes / limitBytes) * 100);

    return {
      plan_code: company.plan_code || 'starter',
      included_storage_mb: Number(company.included_storage_mb || 2048),
      extra_storage_mb: Number(company.extra_storage_mb || 0),
      storage_limit_mb: limitMb,
      storage_limit_enabled: company.storage_limit_enabled !== false,
      used_bytes: usedBytes,
      limit_bytes: limitBytes,
      percent,
      remaining_bytes: Math.max(0, limitBytes - usedBytes),
      over_limit: usedBytes > limitBytes
    };
  }

  async function canUploadBytes(context, bytes) {
    const status = await loadStatus(context);
    const uploadBytes = Number(bytes || 0);
    const projected = status.used_bytes + uploadBytes;
    const allowed = status.storage_limit_enabled === false || projected <= status.limit_bytes;
    return {
      allowed,
      status,
      upload_bytes: uploadBytes,
      projected_bytes: projected,
      projected_percent: status.storage_limit_enabled === false ? 0 : clampPercent((projected / status.limit_bytes) * 100)
    };
  }

  function planLabel(code) {
    return {
      starter: 'Starter',
      business: 'Business',
      enterprise: 'Enterprise'
    }[String(code || '').toLowerCase()] || 'Starter';
  }

  const api = {
    formatBytes,
    loadStatus,
    canUploadBytes,
    planLabel
  };

  window.BautrailStorageQuota = api;
  window.BaudokuStorageQuota = api;
})();


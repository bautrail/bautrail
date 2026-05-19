(function() {
  const cache = new Map();
  const DEFAULT_BUCKET = 'bilder';
  const DEFAULT_EXPIRES = 3600;

  function cleanPath(value) {
    return String(value || '').replace(/^\/+/, '');
  }

  function parsePublicStorageUrl(value) {
    const text = String(value || '');
    const match = text.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/i);
    if (!match) return null;
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2].split('?')[0])
    };
  }

  function resolveDescriptor(row, options) {
    const config = Object.assign({
      bucketField: 'storage_bucket',
      pathField: 'storage_path',
      urlField: 'file_url',
      defaultBucket: DEFAULT_BUCKET
    }, options || {});

    const originalValue = row ? row[config.urlField] : '';
    if (String(originalValue || '').startsWith('data:') || String(originalValue || '').startsWith('blob:')) {
      return { bucket: null, path: '', originalUrl: originalValue || '' };
    }

    const parsed = parsePublicStorageUrl(originalValue);
    const bucket = (row && row[config.bucketField]) || (parsed && parsed.bucket) || config.defaultBucket;
    const rawPath = (row && row[config.pathField]) || (parsed && parsed.path) || originalValue || '';
    const path = cleanPath(rawPath);
    return { bucket, path, originalUrl: originalValue || '' };
  }

  async function createSignedUrl(bucket, path, expiresIn) {
    if (!window.db || !bucket || !path) return '';
    const ttl = Number(expiresIn || DEFAULT_EXPIRES);
    const key = bucket + '|' + path;
    const cached = cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now + 10000) {
      return cached.url;
    }

    const { data, error } = await window.db.storage.from(bucket).createSignedUrl(path, ttl);
    if (error) {
      console.log(error);
      return '';
    }

    const signedUrl = data && data.signedUrl ? data.signedUrl : '';
    if (signedUrl) {
      cache.set(key, {
        url: signedUrl,
        expiresAt: now + Math.max(30000, (ttl - 30) * 1000)
      });
    }
    return signedUrl;
  }

  async function resolveRowUrl(row, options) {
    const descriptor = resolveDescriptor(row, options);
    if (!descriptor.path) return descriptor.originalUrl || '';
    const signedUrl = await createSignedUrl(descriptor.bucket, descriptor.path, options && options.expiresIn);
    return signedUrl || descriptor.originalUrl || '';
  }

  async function resolveRows(rows, options) {
    const items = rows || [];
    return Promise.all(items.map(async row => ({
      row,
      url: await resolveRowUrl(row, options)
    })));
  }

  window.BautrailStorageLinks = {
    DEFAULT_BUCKET,
    resolveDescriptor,
    createSignedUrl,
    resolveRowUrl,
    resolveRows,
    parsePublicStorageUrl
  };
})();

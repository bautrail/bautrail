(function() {
  async function getContext() {
    if (window.BaudokuAuthContext) {
      return await window.BaudokuAuthContext.loadAuthContext({ noCache: true });
    }
    return null;
  }

  async function getCompanyId() {
    const ctx = await getContext();
    return ctx && ctx.company_id ? ctx.company_id : null;
  }

  async function selectScoped(table, options) {
    const opts = options || {};
    const companyId = await getCompanyId();
    if (!companyId) {
      return {
        data: [],
        error: { message: "Keine Firmenzuordnung vorhanden." }
      };
    }
    return await db.from(table).select(opts.select || "*").eq("company_id", companyId);
  }

  async function insertScoped(table, payload) {
    const companyId = await getCompanyId();
    const body = Array.isArray(payload) ? payload.map(item => ({ ...item })) : { ...payload };
    const withCompany = item => {
      if (companyId && item && !("company_id" in item)) item.company_id = companyId;
      return item;
    };
    const finalBody = Array.isArray(body) ? body.map(withCompany) : withCompany(body);

    if (!companyId) {
      return {
        data: null,
        error: { message: "Keine Firmenzuordnung vorhanden." }
      };
    }
    return await db.from(table).insert(finalBody).select();
  }

  window.BaudokuCompanyContext = {
    getContext,
    getCompanyId,
    selectScoped,
    insertScoped
  };
})();

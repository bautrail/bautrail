(function() {
  const CACHE_KEY = "baudokuAuthContextCache";

  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  function writeCache(value) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value || null));
  }

  async function loadAuthContext(options) {
    const useCache = !(options && options.noCache);
    const { data: sessionResult } = await db.auth.getSession();
    const user = sessionResult && sessionResult.session ? sessionResult.session.user : null;

    if (!user) {
      writeCache(null);
      return null;
    }

    if (!navigator.onLine && useCache) {
      const cached = readCache();
      if (cached && cached.user_id === user.id) {
        return cached;
      }
    }

    const { data: member, error } =
      await db
        .from("company_members")
        .select("id, company_id, user_id, role, active, name, email, created_at")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.log(error);
      if (useCache) return readCache();
      return null;
    }

    const context = member
      ? {
          user_id: user.id,
          company_id: member.company_id,
          role: member.role,
          active: member.active,
          name: member.name || "",
          email: member.email || user.email || ""
        }
      : {
          user_id: user.id,
          company_id: null,
          role: null,
          active: false,
          name: "",
          email: user.email || ""
        };

    writeCache(context);
    return context;
  }

  function can(context, permission) {
    const role = context && context.role;
    if (!role || !permission) return false;

    const rules = {
      chef: [
        "company.settings",
        "company.invites",
        "team.manage",
        "customers.manage",
        "projects.manage",
        "orders.manage",
        "planning.manage",
        "timesheets.approve",
        "timesheets.read_all",
        "media.manage"
      ],
      buero: [
        "customers.manage",
        "projects.manage",
        "orders.manage",
        "planning.manage",
        "timesheets.read_all",
        "media.manage"
      ],
      angestellter: [
        "planning.read_own",
        "orders.read_own",
        "timesheets.create_own",
        "timesheets.submit_own",
        "media.add_own"
      ]
    };

    const permissions = rules[role] || [];
    return permissions.includes(permission);
  }

  function dashboardPathForRole(role) {
    if (role === "chef") return "chef-dashboard.html";
    if (role === "buero") return "buero-dashboard.html";
    if (role === "angestellter") return "mitarbeiter-dashboard.html";
    return "index.html";
  }

  function requireRole(context, allowedRoles) {
    if (!context || !context.role || !Array.isArray(allowedRoles)) return false;
    return allowedRoles.includes(context.role);
  }

  window.BaudokuAuthContext = {
    loadAuthContext,
    can,
    requireRole,
    dashboardPathForRole
  };
})();

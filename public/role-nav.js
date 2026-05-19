(function() {
  async function initRoleNav() {
    if (!window.BaudokuAuthContext || !window.db) return;

    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;

    try {
      const ctx = await window.BaudokuAuthContext.loadAuthContext({ noCache: true });
      if (!ctx || String(ctx.role || '').toLowerCase() !== 'chef') return;

      const existing = nav.querySelector('[data-role-nav="chef-dashboard"]');
      if (existing) {
        if (location.pathname.toLowerCase().endsWith('/chef-dashboard.html') || location.pathname.toLowerCase().endsWith('chef-dashboard.html')) {
          existing.classList.add('active');
        }
        return;
      }

      const link = document.createElement('a');
      link.href = 'chef-dashboard.html';
      link.dataset.roleNav = 'chef-dashboard';
      link.innerHTML = '<span>&#128188;</span><small>Chef</small>';

      if (location.pathname.toLowerCase().endsWith('/chef-dashboard.html') || location.pathname.toLowerCase().endsWith('chef-dashboard.html')) {
        link.classList.add('active');
      }

      const settingsLink = Array.from(nav.querySelectorAll('a')).find(item => {
        const href = String(item.getAttribute('href') || '').toLowerCase();
        return href === 'profil.html';
      });

      if (settingsLink) {
        nav.insertBefore(link, settingsLink);
      } else {
        nav.appendChild(link);
      }
    } catch (error) {
      console.log(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoleNav);
  } else {
    initRoleNav();
  }
})();

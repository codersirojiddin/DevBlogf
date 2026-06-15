(() => {
  try {
    const path = window.location.pathname;
    const isActive = (href) => {
      if (href === '/') return path === '/' || path === '/index.html';
      return path.includes(href);
    };

    const links = [
      { label: 'Home', href: '/', dropdown: null },
      {
        label: 'Articles', href: '/articles/', dropdown: [
          { label: 'Articles', sub: 'In-depth guides & tutorials', href: '/articles/', icon: 'articles' },
          { label: 'News', sub: 'Tech & dev news', href: '/news/', icon: 'news' },
          { label: 'Code', sub: 'Snippets & open source', href: '/code/', icon: 'code' },
        ]
      },
      {
        label: 'Community', href: '/community/', dropdown: [
          { label: 'Community', sub: 'Discussions & networking', href: '/community/', icon: 'community' },
          { label: 'Showcase', sub: 'Community projects', href: '/showcase/', icon: 'showcase' },
        ]
      },
      { label: 'About', href: '/about/', dropdown: null },
    ];

    const icons = {
      articles: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h10"/></svg>`,
      news: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z"/><path d="M14 4v5h5"/></svg>`,
      code: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      community: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
      showcase: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    };

    const iconBg = {
      articles: '#EEF2FF', articles_c: '#3730a3',
      news: '#FEF3C7', news_c: '#92400e',
      code: '#ECFDF5', code_c: '#065f46',
      community: '#F5F3FF', community_c: '#6d28d9',
      showcase: '#F0F9FF', showcase_c: '#0369a1',
    };

    const arrowSvg = `<svg class="nav-arrow-svg" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"/></svg>`;

    // ── Session helpers ───────────────────────────────────────────────────────
    function getSession() {
      try { return JSON.parse(localStorage.getItem("sb_session") || "null"); }
      catch { return null; }
    }

    function getCurrentUser() {
      return getSession()?.user || null;
    }

    // ── Nav items ─────────────────────────────────────────────────────────────
    const generateNavItems = () => {
      return links.map(link => {
        const active = isActive(link.href);
        if (!link.dropdown) {
          return `<div class="db-nav-item"><a href="${link.href}" class="db-nav-link ${active ? 'db-active' : ''}">${link.label}</a></div>`;
        }
        const dropHtml = link.dropdown.map((d, i) => {
          const divider = i === 1 && link.label === 'Articles' ? `<div class="db-drop-divider"></div>` : '';
          return `${divider}
            <a href="${d.href}" class="db-drop-link">
              <span class="db-drop-icon" style="background:${iconBg[d.icon]}; color:${iconBg[d.icon + '_c']}">
                ${icons[d.icon]}
              </span>
              <span>
                <span class="db-drop-title">${d.label}</span>
                <span class="db-drop-sub">${d.sub}</span>
              </span>
            </a>`;
        }).join('');
        return `
          <div class="db-nav-item db-has-dropdown">
            <a class="db-nav-link ${active ? 'db-active' : ''}">
              ${link.label}
              <span class="db-nav-arrow">${arrowSvg}</span>
            </a>
            <div class="db-dropdown">${dropHtml}</div>
          </div>`;
      }).join('');
    };

    // ── Auth HTML ─────────────────────────────────────────────────────────────
    function buildAuthDesktop(user) {
      if (!user) {
        return `<button class="db-login-btn" onclick="window.location.href='/login/'">Sign in</button>`;
      }
      const name = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Profile';
      const initial = name.charAt(0).toUpperCase();
      return `
        <div class="db-nav-item db-has-dropdown db-user-menu">
          <button class="db-user-btn">
            <span class="db-user-avatar" id="db-user-avatar">${initial}</span>
            <span class="db-user-name" id="db-user-name">${name}</span>
            ${arrowSvg}
          </button>
          <div class="db-dropdown db-user-dropdown">
            <a href="#" class="db-drop-link" id="db-profile-link">
              <span class="db-drop-icon" style="background:#EEF2FF;color:#3730a3">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </span>
              <span>
                <span class="db-drop-title">Profile</span>
                <span class="db-drop-sub">View your profile</span>
              </span>
            </a>
            <div class="db-drop-divider"></div>
            <button class="db-drop-link db-signout-btn" id="db-signout-btn">
              <span class="db-drop-icon" style="background:#FEE2E2;color:#991b1b">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </span>
              <span><span class="db-drop-title">Sign out</span></span>
            </button>
          </div>
        </div>`;
    }

    function buildAuthMobile(user) {
      if (!user) {
        return `<button class="db-login-btn-mobile" onclick="window.location.href='/login/'">Sign in</button>`;
      }
      const name = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Profile';
      return `
        <a href="#" class="db-login-btn-mobile" id="db-profile-link-mobile" style="display:block;text-align:center;text-decoration:none">
          👤 <span id="db-mobile-name">${name}</span>
        </a>
        <button class="db-login-btn-mobile" id="db-signout-mobile" style="margin-top:8px;background:#fee2e2;color:#991b1b">Sign out</button>
      `;
    }

    const user = getCurrentUser();

    const headerHtml = `
      <header class="db-header">
        <div class="db-header-container">
          <a href="/" class="db-logo">Ither</a>
          <nav class="db-nav-desktop">${generateNavItems()}</nav>
          <div class="db-header-right">
            <button class="db-search-btn" aria-label="Search">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
            </button>
            <div class="db-auth-desktop">${buildAuthDesktop(user)}</div>
            <button class="db-mobile-menu-btn" id="db-mobile-menu-btn" aria-label="Menu">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="db-mobile-overlay" id="db-mobile-overlay"></div>
        <div class="db-mobile-menu" id="db-mobile-menu">
          <div class="db-mobile-menu-header">
            <a href="/" class="db-logo">Ither</a>
            <button class="db-mobile-menu-close" id="db-mobile-menu-close">×</button>
          </div>
          <div class="db-mobile-nav-content">
            ${generateNavItems()}
            <div class="db-mobile-actions">${buildAuthMobile(user)}</div>
          </div>
        </div>
      </header>`;

    const css = `
      .db-header { background:#fff; border-bottom:1px solid #e8e4de; position:sticky; top:0; z-index:1000; width:100%; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; }
      .db-header-container { width:100%; box-sizing:border-box; padding:0 2rem; height:64px; display:flex; align-items:center; justify-content:space-between; }
      .db-logo { font-family:Georgia,serif; font-size:20px; font-weight:bold; color:#111; text-decoration:none; }
      .db-nav-desktop { display:flex; align-items:center; height:100%; gap:8px; }
      .db-nav-item { position:relative; height:100%; display:flex; align-items:center; }
      .db-nav-link { font-size:14px; color:#555; text-decoration:none; padding:0 12px; height:100%; display:flex; align-items:center; gap:4px; cursor:pointer; transition:color 0.2s; }
      .db-nav-link:hover { color:#111; }
      .db-nav-link.db-active { color:#111; font-weight:600; }
      .db-dropdown { position:absolute; top:100%; left:0; background:#fff; border:1px solid #e8e4de; border-radius:12px; padding:8px; min-width:240px; opacity:0; pointer-events:none; transform:translateY(10px); transition:all 0.2s; box-shadow:0 10px 30px rgba(0,0,0,0.08); }
      .db-has-dropdown:hover .db-dropdown { opacity:1; pointer-events:all; transform:translateY(0); }
      .db-has-dropdown:hover .nav-arrow-svg { transform:rotate(180deg); }
      .nav-arrow-svg { transition:transform 0.2s; }
      .db-drop-link { display:flex; align-items:flex-start; gap:12px; padding:10px; border-radius:8px; text-decoration:none; width:100%; background:none; border:none; cursor:pointer; text-align:left; box-sizing:border-box; }
      .db-drop-link:hover { background:#f5f5f5; }
      .db-drop-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .db-drop-title { display:block; font-size:14px; font-weight:500; color:#111; }
      .db-drop-sub { display:block; font-size:12px; color:#777; margin-top:2px; }
      .db-drop-divider { height:1px; background:#f0f0f0; margin:6px 0; }
      .db-header-right { display:flex; align-items:center; gap:12px; }
      .db-search-btn { background:none; border:none; cursor:pointer; color:#555; padding:8px; border-radius:50%; }
      .db-search-btn:hover { background:#f5f5f5; color:#111; }
      .db-login-btn { background:#111; color:#fff; border:none; padding:8px 18px; border-radius:20px; cursor:pointer; font-size:14px; font-weight:500; }
      .db-user-menu { height:100%; }
      .db-user-btn { display:flex; align-items:center; gap:8px; background:none; border:1px solid #e8e4de; border-radius:20px; padding:6px 12px; cursor:pointer; font-size:14px; color:#111; }
      .db-user-btn:hover { background:#f5f5f5; }
      .db-user-avatar { width:28px; height:28px; border-radius:50%; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; overflow:hidden; flex-shrink:0; }
      .db-user-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; display:block; }
      .db-user-name { font-weight:500; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .db-user-dropdown { left:auto; right:0; min-width:200px; }
      .db-mobile-menu-btn { display:none; background:none; border:none; color:#111; cursor:pointer; }
      .db-mobile-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:none; z-index:1001; }
      .db-mobile-menu { position:fixed; top:0; right:-100%; width:85%; max-width:300px; height:100%; background:#fff; z-index:1002; transition:right 0.3s ease; box-shadow:-5px 0 15px rgba(0,0,0,0.1); }
      .db-mobile-menu.open { right:0; }
      .db-mobile-overlay.open { display:block; }
      .db-mobile-menu-header { display:flex; align-items:center; justify-content:space-between; padding:1.5rem; border-bottom:1px solid #eee; }
      .db-mobile-menu-close { font-size:30px; background:none; border:none; cursor:pointer; }
      .db-mobile-nav-content { padding:1rem; }
      @media (max-width:900px) {
        .db-nav-desktop,.db-auth-desktop { display:none; }
        .db-mobile-menu-btn { display:block; }
        .db-header-container { padding:0 1rem; }
        .db-mobile-nav-content .db-nav-item { flex-direction:column; align-items:flex-start; height:auto; width:100%; }
        .db-mobile-nav-content .db-nav-link { width:100%; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f5f5f5; }
        .db-mobile-nav-content .db-dropdown { position:static; display:none; opacity:1; pointer-events:all; transform:none; box-shadow:none; border:none; width:100%; padding-left:15px; }
        .db-mobile-nav-content .db-has-dropdown.open > .db-dropdown { display:block; }
        .db-mobile-nav-content .db-has-dropdown.open > .db-nav-link .nav-arrow-svg { transform:rotate(180deg); }
        .db-mobile-actions { margin-top:20px; }
        .db-login-btn-mobile { width:100%; background:#111; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:block; text-align:center; text-decoration:none; box-sizing:border-box; }
      }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const div = document.createElement('div');
    div.innerHTML = headerHtml;
    document.body.prepend(div.firstElementChild);

    // ── Mobile menu toggle ────────────────────────────────────────────────────
    const btnOpen = document.getElementById('db-mobile-menu-btn');
    const btnClose = document.getElementById('db-mobile-menu-close');
    const menu = document.getElementById('db-mobile-menu');
    const overlay = document.getElementById('db-mobile-overlay');

    const toggleMenu = () => {
      menu.classList.toggle('open');
      overlay.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    };

    btnOpen?.addEventListener('click', toggleMenu);
    btnClose?.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', toggleMenu);

    document.querySelectorAll('.db-mobile-nav-content .db-has-dropdown > .db-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 900) {
          e.preventDefault();
          link.parentElement.classList.toggle('open');
        }
      });
    });

    // ── Sign out ──────────────────────────────────────────────────────────────
    const doSignOut = () => {
      localStorage.removeItem("sb_session");
      window.location.href = '/';
    };
    document.getElementById('db-signout-btn')?.addEventListener('click', doSignOut);
    document.getElementById('db-signout-mobile')?.addEventListener('click', doSignOut);

    // ── Profile yuklash: avatar rasm + to'g'ri URL ────────────────────────────
    if (user) {
      const profilePageUrl = `/profile/index.html?id=${user.id}`;

      // Darhol to'g'ri linkni o'rnatamiz
      document.getElementById('db-profile-link')?.setAttribute('href', profilePageUrl);
      document.getElementById('db-profile-link-mobile')?.setAttribute('href', profilePageUrl);

      // Supabase tayyor bo'lgach profil ma'lumotlarini olamiz
      const tryLoadProfile = () => {
        if (!window.SupabaseClient?.supabaseFetch) {
          setTimeout(tryLoadProfile, 150);
          return;
        }

        window.SupabaseClient.supabaseFetch(`profiles?id=eq.${encodeURIComponent(user.id)}`)
          .then(data => {
            const profile = data?.[0];
            if (!profile) return;

            const name = profile.username || user?.email?.split('@')[0] || 'Profile';
            const initial = name.charAt(0).toUpperCase();

            // Desktop avatar
            const avatarEl = document.getElementById('db-user-avatar');
            if (avatarEl) {
              if (profile.avatar_url) {
                avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="${name}">`;
              } else {
                avatarEl.textContent = initial;
              }
            }

            // Desktop username
            const nameEl = document.getElementById('db-user-name');
            if (nameEl) nameEl.textContent = name;

            // Mobile username
            const mobileNameEl = document.getElementById('db-mobile-name');
            if (mobileNameEl) mobileNameEl.textContent = name;
          })
          .catch(() => {}); // Xatolik bo'lsa initial ko'rinishini saqlaydi
      };

      tryLoadProfile();
    }

  } catch (e) { console.error(e); }
})();
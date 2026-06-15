// Initialize user menu on all pages
function initializeUserMenu() {
    // Guard: wait for SupabaseClient to be available
    if (!window.SupabaseClient || typeof window.SupabaseClient.getCurrentUser !== "function") {
        console.warn("SupabaseClient not ready, retrying...");
        setTimeout(initializeUserMenu, 100);
        return;
    }

    const user = window.SupabaseClient.getCurrentUser();
    const navRight = document.getElementById("nav-right");
    
    if (!navRight) return;

    if (user) {
        navRight.innerHTML = `
            <div class="user-dropdown" id="user-dropdown">
                <button class="user-menu-btn" id="user-menu-btn">
                    <div class="user-avatar" id="user-avatar">?</div>
                    <span id="user-name">${user.username || user.email.split('@')[0]}</span>
                </button>
                <div class="user-dropdown-menu" id="user-dropdown-menu">
                    <a href="/profile/index.html?id=${user.id}">My Profile</a>
                    <a href="/community/index.html">Community</a>
                    <a href="/publish/index.html">New Post</a>
                    <button id="logout-btn">Logout</button>
                </div>
            </div>
        `;
        
        window.SupabaseClient.supabaseFetch(`profiles?id=eq.${user.id}`)
            .then(data => {
                const profile = data?.[0];
                if (profile) {
                    const av = document.getElementById("user-avatar");
                    const nameEl = document.getElementById("user-name");
                    
                    if (profile.avatar_url) {
                        av.innerHTML = `<img src="${profile.avatar_url}" alt="${profile.username}">`;
                    } else {
                        av.textContent = (profile.username || user.email)[0].toUpperCase();
                    }
                    
                    if (nameEl && profile.username) {
                        nameEl.textContent = profile.username;
                    }
                }
            })
            .catch(() => {});

        const userMenuBtn = document.getElementById("user-menu-btn");
        const userDropdownMenu = document.getElementById("user-dropdown-menu");
        
        if (userMenuBtn && userDropdownMenu) {
            userMenuBtn.addEventListener("click", () => {
                userDropdownMenu.classList.toggle("visible");
            });
            
            document.addEventListener("click", (e) => {
                if (!e.target.closest("#user-dropdown")) {
                    userDropdownMenu.classList.remove("visible");
                }
            });
            
            const logoutBtn = document.getElementById("logout-btn");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", () => {
                    window.SupabaseClient.signOut();
                    window.location.href = "/";
                });
            }
        }
    } else if (navRight && !navRight.innerHTML.trim()) {
        navRight.innerHTML = `<a href="/login/index.html" class="btn">Login</a>`;
    }
}

// Wait for DOM + scripts to load
document.addEventListener("DOMContentLoaded", initializeUserMenu);
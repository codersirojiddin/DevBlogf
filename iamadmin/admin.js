// ── Admin Auth — Supabase Auth orqali (haqiqiy xavfsiz tizim) ────────────────
// Admin bo'lish uchun: Supabase Dashboard → Authentication → Users
// Foydalanuvchi yarating, keyin profiles jadvalida is_admin = true qiling:
//   UPDATE profiles SET is_admin = true WHERE id = '<user-id>';
//
// ⚠️  HECH QANDAY password yoki key bu faylda yozilmasin!

const SESSION_KEY = "devblog.admin.auth";

// Credentials middleware dan keladi (env.js orqali inject)
function getSB() {
  return {
    url: (window.__ENV__ || {}).SUPABASE_URL || "",
    key: (window.__ENV__ || {}).SUPABASE_ANON_KEY || "",
  };
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loginScreen   = document.getElementById("login-screen");
const adminScreen   = document.getElementById("admin-screen");
const emailInput    = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const loginBtn      = document.getElementById("login-btn");
const loginError    = document.getElementById("login-error");
const logoutBtn     = document.getElementById("logout-btn");
const form          = document.getElementById("post-form");
const titleInput    = document.getElementById("post-title");
const typeInput     = document.getElementById("post-type");
const contentInput  = document.getElementById("post-content");
const highlightInput= document.getElementById("post-highlighted");
const formStatus    = document.getElementById("form-status");
const postList      = document.getElementById("admin-post-list");
const submitBtn     = document.getElementById("submit-btn");
const cancelBtn     = document.getElementById("cancel-edit");
const adminCount    = document.getElementById("admin-count");

let editingId = "";
let currentAdminSession = null;

// ── Auth ──────────────────────────────────────────────────────────────────────
async function adminLogin(email, password) {
  const { url, key } = getSB();
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
  return data;
}

async function checkIsAdmin(session) {
  const { url, key } = getSB();
  const userId = session?.user?.id;
  if (!userId) return false;
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=is_admin`, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    }
  });
  const data = await res.json();
  return Array.isArray(data) && data[0]?.is_admin === true;
}

function showAdmin() {
  loginScreen.hidden = true;
  adminScreen.hidden = false;
  loadDashboard();
  renderAdminPosts();
}

function showLogin(errorMsg) {
  loginScreen.hidden = false;
  adminScreen.hidden = true;
  currentAdminSession = null;
  if (errorMsg) {
    loginError.textContent = errorMsg;
    loginError.hidden = false;
  }
}

loginBtn.addEventListener("click", async () => {
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = "Checking...";
  try {
    const session = await adminLogin(
      emailInput.value.trim(),
      passwordInput.value
    );
    const isAdmin = await checkIsAdmin(session);
    if (!isAdmin) {
      showLogin("Bu akkaunt admin emas. Supabase'da is_admin = true qiling.");
      return;
    }
    currentAdminSession = session;
    passwordInput.value = "";
    showAdmin();
  } catch (err) {
    showLogin(err.message || "Login xatosi");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Enter";
  }
});

passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });
emailInput.addEventListener("keydown", (e) => { if (e.key === "Enter") passwordInput.focus(); });

logoutBtn.addEventListener("click", () => {
  currentAdminSession = null;
  showLogin();
});

// Sahifa ochilganda — agar user allaqachon login qilgan bo'lsa (SupabaseClient session)
(async () => {
  const existingSession = window.SupabaseClient?.getSession?.();
  if (existingSession?.access_token) {
    const isAdmin = await checkIsAdmin(existingSession);
    if (isAdmin) {
      currentAdminSession = existingSession;
      showAdmin();
      return;
    }
  }
  showLogin();
})();

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");

    if (tab.dataset.tab === "dashboard")    loadDashboard();
    if (tab.dataset.tab === "projects")     loadProjects();
    if (tab.dataset.tab === "users")        loadUsers();
    if (tab.dataset.tab === "community")    loadCommunity();
    if (tab.dataset.tab === "announcement") loadAnnouncement();
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function sbFetch(path, options = {}) {
  const { url, key } = getSB();
  const token = currentAdminSession?.access_token
    || window.SupabaseClient?.getSession?.()?.access_token
    || key;

  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Error ${res.status}`);
  if (!text.trim() || res.status === 204) return null;
  return JSON.parse(text);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [users, posts, projects, community] = await Promise.all([
      sbFetch("profiles?select=id"),
      sbFetch("posts?select=id"),
      sbFetch("projects?select=id"),
      sbFetch("community_posts?select=id")
    ]);
    document.getElementById("stat-users").textContent     = users?.length || 0;
    document.getElementById("stat-posts").textContent     = posts?.length || 0;
    document.getElementById("stat-projects").textContent  = projects?.length || 0;
    document.getElementById("stat-community").textContent = community?.length || 0;

    const recent = await sbFetch("profiles?select=id,username,avatar_url,created_at&order=created_at.desc&limit=5");
    const ul = document.getElementById("recent-users-list");
    ul.innerHTML = (recent || []).map(u => `
      <div class="user-row">
        <div class="user-avatar-sm">${u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}">` : escapeHtml((u.username||"?")[0].toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(u.username || "—")}</strong>
          <span class="post-meta" style="margin-left:8px;">${window.DevBlogPosts.formatDate(u.created_at)}</span>
        </div>
      </div>
    `).join("");
  } catch(e) {
    console.error("Dashboard error:", e);
  }
}

// ── Articles ──────────────────────────────────────────────────────────────────
function setStatus(message, isError = false) {
  formStatus.textContent = message;
  formStatus.className = "status" + (isError ? " status--error" : " status--ok");
}

function resetForm() {
  editingId = "";
  form.reset();
  submitBtn.textContent = "Publish Post";
  cancelBtn.hidden = true;
  setStatus("");
}

function startEditing(post) {
  editingId = post.id;
  titleInput.value = post.title;
  typeInput.value = post.type;
  contentInput.value = post.content;
  highlightInput.checked = Boolean(post.highlighted);
  submitBtn.textContent = "Save Changes";
  cancelBtn.hidden = false;
  setStatus(`Editing: "${post.title}"`, false);
  document.getElementById("tab-articles").scrollTo({ top: 0, behavior: "smooth" });
}

cancelBtn.addEventListener("click", resetForm);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? "Saving..." : "Publishing...";
  const payload = {
    title: titleInput.value,
    type: typeInput.value,
    content: contentInput.value,
    highlighted: highlightInput.checked
  };
  try {
    if (editingId) {
      await window.DevBlogPosts.updatePost(editingId, payload);
      setStatus("✓ Post updated successfully.");
    } else {
      await window.DevBlogPosts.createPost(payload);
      setStatus("✓ Post published successfully.");
    }
    resetForm();
    await renderAdminPosts();
  } catch (err) {
    setStatus(err.message || "Failed to save post.", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? "Save Changes" : "Publish Post";
  }
});

async function renderAdminPosts() {
  postList.innerHTML = `<div class="loading-state"><div class="spinner"></div> Loading...</div>`;
  try {
    const posts = await window.DevBlogPosts.getPosts();
    adminCount.textContent = posts.length ? `(${posts.length})` : "";
    postList.innerHTML = "";
    if (posts.length === 0) {
      postList.innerHTML = `<p class="empty-state">No posts yet.</p>`;
      return;
    }
    posts.forEach(post => {
      const card = document.createElement("article");
      card.className = "admin-post-card";
      card.innerHTML = `
        <div class="admin-post-card__heading">
          <div>
            <h3>${escapeHtml(post.title)}</h3>
            <div class="post-badges" style="margin-top:6px;">
              <span class="post-badge">${window.DevBlogPosts.toLabel(post.type)}</span>
              ${post.highlighted ? `<span class="post-badge post-badge--highlight">Featured</span>` : ""}
            </div>
          </div>
          <span class="post-meta">${window.DevBlogPosts.formatDate(post.updated_at || post.created_at)}</span>
        </div>
        <p class="post-preview">${escapeHtml(post.content.split("\n").slice(0,1).join("\n"))}...</p>
        <div class="admin-actions">
          <button class="btn" data-action="edit" data-id="${post.id}">Edit</button>
          <button class="btn btn--secondary" data-action="toggle" data-id="${post.id}">${post.highlighted ? "Unfeature" : "Feature"}</button>
          <button class="btn btn--danger" data-action="delete" data-id="${post.id}">Delete</button>
        </div>
      `;
      postList.appendChild(card);
    });
  } catch(err) {
    postList.innerHTML = `<p class="empty-state">Failed to load: ${err.message}</p>`;
  }
}

postList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const postId = btn.dataset.id;
  try {
    if (action === "edit") {
      const posts = await window.DevBlogPosts.getPosts();
      const post = posts.find(p => p.id === postId);
      if (post) startEditing(post);
      return;
    }
    if (action === "delete") {
      if (!confirm("Delete this post? This cannot be undone.")) return;
      await window.DevBlogPosts.deletePost(postId);
      if (editingId === postId) resetForm();
      setStatus("Post deleted.");
    }
    if (action === "toggle") {
      await window.DevBlogPosts.toggleHighlight(postId);
      setStatus("Featured status updated.");
    }
    await renderAdminPosts();
  } catch(err) {
    setStatus(err.message || "Action failed.", true);
  }
});

// ── Projects ──────────────────────────────────────────────────────────────────
async function loadProjects() {
  const list = document.getElementById("projects-list");
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div> Loading...</div>`;
  try {
    const projects = await sbFetch("projects?select=id,title,tagline,status,thumbnail_url,user_id,created_at&order=created_at.desc");
    document.getElementById("projects-count").textContent = projects?.length ? `(${projects.length})` : "";
    if (!projects || projects.length === 0) {
      list.innerHTML = `<p class="empty-state">No projects yet.</p>`;
      return;
    }
    list.innerHTML = projects.map(p => `
      <div class="admin-post-card">
        ${p.thumbnail_url ? `<img src="${escapeHtml(p.thumbnail_url)}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:10px;">` : ""}
        <div class="admin-post-card__heading">
          <div>
            <h3>${escapeHtml(p.title)}</h3>
            <span class="post-badge" style="margin-top:4px;display:inline-block;">${escapeHtml(p.status || "")}</span>
          </div>
          <span class="post-meta">${window.DevBlogPosts.formatDate(p.created_at)}</span>
        </div>
        <p class="post-preview">${escapeHtml(p.tagline || "")}</p>
        <div class="admin-actions">
          <button class="btn btn--danger" onclick="deleteProject('${p.id}')">Delete</button>
        </div>
      </div>
    `).join("");
  } catch(err) {
    list.innerHTML = `<p class="empty-state">Failed to load: ${err.message}</p>`;
  }
}

async function deleteProject(id) {
  if (!confirm("Delete this project? This cannot be undone.")) return;
  try {
    await sbFetch(`projects?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    loadProjects();
  } catch(err) {
    alert("Failed to delete: " + err.message);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const list = document.getElementById("users-list");
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div> Loading...</div>`;
  try {
    const users = await sbFetch("profiles?select=id,username,avatar_url,bio,trust_score,banned,created_at&order=created_at.desc");
    document.getElementById("users-count").textContent = users?.length ? `(${users.length})` : "";
    if (!users || users.length === 0) {
      list.innerHTML = `<p class="empty-state">No users yet.</p>`;
      return;
    }
    list.innerHTML = `<div class="users-table">
      <div class="users-table-head">
        <span>User</span><span>Trust Score</span><span>Joined</span><span>Status</span><span>Actions</span>
      </div>
      ${users.map(u => `
      <div class="users-table-row ${u.banned ? 'user-banned' : ''}">
        <div class="user-cell">
          <div class="user-avatar-sm">${u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}">` : escapeHtml((u.username||"?")[0].toUpperCase())}</div>
          <span>${escapeHtml(u.username || "—")}</span>
        </div>
        <div>
          <input type="number" class="trust-input" value="${u.trust_score || 0}" min="0" max="1000" data-uid="${u.id}" style="width:70px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;">
          <button class="btn btn--secondary" style="padding:4px 8px;font-size:0.7rem;" onclick="saveTrustScore('${u.id}', this)">Save</button>
        </div>
        <span class="post-meta">${window.DevBlogPosts.formatDate(u.created_at)}</span>
        <span class="status-badge ${u.banned ? 'status-badge--banned' : 'status-badge--active'}">${u.banned ? 'Banned' : 'Active'}</span>
        <div class="admin-actions" style="margin-top:0;">
          <button class="btn ${u.banned ? '' : 'btn--danger'}" onclick="toggleBan('${u.id}', ${u.banned})">${u.banned ? 'Unban' : 'Ban'}</button>
        </div>
      </div>
      `).join("")}
    </div>`;
  } catch(err) {
    list.innerHTML = `<p class="empty-state">Failed to load: ${err.message}</p>`;
  }
}

async function toggleBan(userId, currentlyBanned) {
  try {
    await sbFetch(`profiles?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ banned: !currentlyBanned }),
      prefer: "return=minimal"
    });
    loadUsers();
  } catch(err) {
    alert("Failed: " + err.message);
  }
}

async function saveTrustScore(userId, btn) {
  const input = document.querySelector(`.trust-input[data-uid="${userId}"]`);
  const score = parseInt(input.value);
  if (isNaN(score)) return;
  btn.textContent = "...";
  try {
    await sbFetch(`profiles?id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ trust_score: score }),
      prefer: "return=minimal"
    });
    btn.textContent = "✓";
    setTimeout(() => btn.textContent = "Save", 1500);
  } catch(err) {
    btn.textContent = "Error";
    alert("Failed: " + err.message);
  }
}

// ── Community ─────────────────────────────────────────────────────────────────
async function loadCommunity() {
  const list = document.getElementById("community-list");
  list.innerHTML = `<div class="loading-state"><div class="spinner"></div> Loading...</div>`;
  try {
    const posts = await sbFetch("community_posts?select=id,title,type,content,user_id,created_at&order=created_at.desc");
    document.getElementById("community-count").textContent = posts?.length ? `(${posts.length})` : "";
    if (!posts || posts.length === 0) {
      list.innerHTML = `<p class="empty-state">No community posts.</p>`;
      return;
    }
    list.innerHTML = posts.map(p => `
      <div class="admin-post-card">
        <div class="admin-post-card__heading">
          <div>
            <h3>${escapeHtml(p.title)}</h3>
            <span class="post-badge" style="margin-top:4px;display:inline-block;">${escapeHtml(p.type || "")}</span>
          </div>
          <span class="post-meta">${window.DevBlogPosts.formatDate(p.created_at)}</span>
        </div>
        <p class="post-preview">${escapeHtml((p.content||"").slice(0,120))}...</p>
        <div class="admin-actions">
          <button class="btn btn--danger" onclick="deleteCommunityPost('${p.id}')">Delete</button>
        </div>
      </div>
    `).join("");
  } catch(err) {
    list.innerHTML = `<p class="empty-state">Failed to load: ${err.message}</p>`;
  }
}

async function deleteCommunityPost(id) {
  if (!confirm("Delete this community post?")) return;
  try {
    await sbFetch(`community_posts?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    loadCommunity();
  } catch(err) {
    alert("Failed: " + err.message);
  }
}

// ── Announcement ──────────────────────────────────────────────────────────────
async function loadAnnouncement() {
  try {
    const data = await sbFetch("site_settings?key=eq.announcement");
    const val = data?.[0]?.value || "";
    document.getElementById("announcement-text").value = val;
    updateAnnouncementPreview(val);
  } catch(err) {
    console.error("Announcement load error:", err);
  }
}

function updateAnnouncementPreview(text) {
  const preview = document.getElementById("announcement-preview");
  const banner  = preview.querySelector(".announcement-banner-preview");
  if (text.trim()) {
    banner.textContent = text;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

document.getElementById("announcement-text").addEventListener("input", (e) => {
  updateAnnouncementPreview(e.target.value);
});

document.getElementById("save-announcement-btn").addEventListener("click", async () => {
  const text = document.getElementById("announcement-text").value.trim();
  const status = document.getElementById("announcement-status");
  status.textContent = "Saving..."; status.className = "status";
  try {
    await sbFetch("site_settings?key=eq.announcement", {
      method: "PATCH",
      body: JSON.stringify({ value: text, updated_at: new Date().toISOString() }),
      prefer: "return=minimal"
    });
    status.textContent = "✓ Saved!"; status.className = "status status--ok";
  } catch(err) {
    status.textContent = err.message; status.className = "status status--error";
  }
});

document.getElementById("clear-announcement-btn").addEventListener("click", async () => {
  document.getElementById("announcement-text").value = "";
  updateAnnouncementPreview("");
  document.getElementById("save-announcement-btn").click();
});

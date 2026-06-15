// ── Credentials: Cloudflare Pages middleware orqali inject qilinadi ───────────
const SUPABASE_URL      = (window.__ENV__ || {}).SUPABASE_URL      || "";
const SUPABASE_ANON_KEY = (window.__ENV__ || {}).SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[DevBlog] SUPABASE_URL yoki SUPABASE_ANON_KEY topilmadi! " +
    "Cloudflare Pages → Settings → Environment Variables sozlang.");
}

// ── Token management ──────────────────────────────────────────────────────────
function getSession() {
    try { return JSON.parse(localStorage.getItem("sb_session") || "null"); }
    catch { return null; }
}

function saveSession(session) {
    if (session) localStorage.setItem("sb_session", JSON.stringify(session));
    else localStorage.removeItem("sb_session");
}

function getAccessToken() {
    return getSession()?.access_token || null;
}

// ── Token yangilash (JWT expired bo'lganda) ───────────────────────────────────
async function refreshSession() {
    const session = getSession();
    if (!session?.refresh_token) return null;

    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        const data = await res.json();
        if (data.access_token) {
            saveSession(data);
            return data.access_token;
        }
    } catch (e) {
        console.warn("Session yangilanmadi:", e);
        saveSession(null);
    }
    return null;
}

// ── Core fetch ────────────────────────────────────────────────────────────────
async function supabaseFetch(path, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const token = getAccessToken() || SUPABASE_ANON_KEY;
    const headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": options.prefer || "return=representation",
        ...options.headers
    };

    let res = await fetch(url, { ...options, headers });

    // JWT expired bo'lsa — tokenni yangilab qayta urinish
    if (res.status === 401) {
        const newToken = await refreshSession();
        if (newToken) {
            headers["Authorization"] = `Bearer ${newToken}`;
            res = await fetch(url, { ...options, headers });
        } else {
            // Yangilab bo'lmasa — sessionni tozalab anon sifatida davom etish
            saveSession(null);
            headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
            res = await fetch(url, { ...options, headers });
        }
    }

    const text = await res.text();
    if (!res.ok) {
        throw new Error(text || `Request failed: ${res.status}`);
    }
    if (res.status === 204 || !text.trim()) return null;
    try {
        return JSON.parse(text);
    } catch (err) {
        return text;
    }
}

// ── Auth fetch ────────────────────────────────────────────────────────────────
async function authFetch(path, body) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Auth error");
    return data;
}

// ── Auth methods ──────────────────────────────────────────────────────────────
async function signUp(email, password, username) {
    const data = await authFetch("signup", { email, password, data: { username } });
    saveSession(data);
    return data;
}

async function signIn(email, password) {
    const data = await authFetch("token?grant_type=password", { email, password });
    saveSession(data);
    return data;
}

async function signOut() {
    saveSession(null);
}

function getCurrentUser() {
    return getSession()?.user || null;
}

async function ensureProfile(user, options = {}) {
    if (!user || !user.id) {
        throw new Error("Unable to verify profile without a signed-in user.");
    }

    const existing = await supabaseFetch(`profiles?id=eq.${user.id}`, { method: "GET" });
    if (Array.isArray(existing) && existing.length > 0) {
        return existing[0];
    }

    const username = options.username || user.email?.split("@")[0] || "user";
    const body = { id: user.id, username, bio: "", avatar_url: "" };
    await supabaseFetch("profiles", { method: "POST", body: JSON.stringify(body) });
    return body;
}

// ── Community Posts ───────────────────────────────────────────────────────────
async function getCommunityPost(id) {
    if (!id) throw new Error("Post id is required.");
    const data = await supabaseFetch(`community_posts?id=eq.${encodeURIComponent(id)}`, { method: "GET" });
    return Array.isArray(data) ? data[0] : null;
}

async function updateCommunityPost(id, input) {
    if (!id) throw new Error("Post id is required.");
    const payload = {
        title: input.title,
        type: input.type,
        content: input.content,
        updated_at: new Date().toISOString()
    };
    const result = await supabaseFetch(`community_posts?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        prefer: "return=representation"
    });
    return Array.isArray(result) ? result[0] : result;
}

async function deleteCommunityPost(id) {
    if (!id) throw new Error("Post id is required.");
    await supabaseFetch(`community_posts?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        prefer: "return=minimal"
    });
    return true;
}

// ── Likes ─────────────────────────────────────────────────────────────────────
async function getLikesCount(postId) {
    if (!postId) throw new Error("Post id is required.");
    const data = await supabaseFetch(`likes?select=id&post_id=eq.${encodeURIComponent(postId)}`, { method: "GET" });
    return Array.isArray(data) ? data.length : 0;
}

async function hasUserLiked(postId, userId) {
    if (!postId || !userId) return false;
    const data = await supabaseFetch(`likes?select=id&post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: "GET" });
    return Array.isArray(data) && data.length > 0;
}

async function addLike(postId, userId) {
    if (!postId || !userId) throw new Error("Post id and user id are required.");
    await supabaseFetch("likes", {
        method: "POST",
        body: JSON.stringify({ post_id: postId, user_id: userId }),
        prefer: "return=minimal"
    });
}

async function removeLike(postId, userId) {
    if (!postId || !userId) throw new Error("Post id and user id are required.");
    await supabaseFetch(`likes?post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(userId)}`, {
        method: "DELETE",
        prefer: "return=minimal"
    });
}

// ── Comments ──────────────────────────────────────────────────────────────────
async function getComments(postId) {
    if (!postId) throw new Error("Post id is required.");
    return await supabaseFetch(`comments?select=*&post_id=eq.${encodeURIComponent(postId)}&order=created_at.asc`, { method: "GET" });
}

async function addComment(postId, userId, username, body) {
    if (!postId || !userId || !body) throw new Error("Post id, user id, and body are required.");
    const result = await supabaseFetch("comments", {
        method: "POST",
        body: JSON.stringify({ post_id: postId, user_id: userId, username, body }),
        prefer: "return=representation"
    });
    return result;
}

async function deleteComment(commentId) {
    if (!commentId) throw new Error("Comment id is required.");
    await supabaseFetch(`comments?id=eq.${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        prefer: "return=minimal"
    });
}

// ── Follows ───────────────────────────────────────────────────────────────────
async function followUser(followerId, followingId) {
    if (!followerId || !followingId) throw new Error("Both user ids are required.");
    await supabaseFetch("follows", {
        method: "POST",
        body: JSON.stringify({ follower_id: followerId, following_id: followingId }),
        prefer: "return=minimal"
    });
}

async function unfollowUser(followerId, followingId) {
    if (!followerId || !followingId) throw new Error("Both user ids are required.");
    await supabaseFetch(`follows?follower_id=eq.${encodeURIComponent(followerId)}&following_id=eq.${encodeURIComponent(followingId)}`, {
        method: "DELETE",
        prefer: "return=minimal"
    });
}

async function isFollowing(followerId, followingId) {
    if (!followerId || !followingId) return false;
    const data = await supabaseFetch(`follows?select=id&follower_id=eq.${encodeURIComponent(followerId)}&following_id=eq.${encodeURIComponent(followingId)}`, { method: "GET" });
    return Array.isArray(data) && data.length > 0;
}

async function getFollowersCount(userId) {
    if (!userId) return 0;
    const data = await supabaseFetch(`follows?select=id&following_id=eq.${encodeURIComponent(userId)}`, { method: "GET" });
    return Array.isArray(data) ? data.length : 0;
}

async function getFollowingCount(userId) {
    if (!userId) return 0;
    const data = await supabaseFetch(`follows?select=id&follower_id=eq.${encodeURIComponent(userId)}`, { method: "GET" });
    return Array.isArray(data) ? data.length : 0;
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
async function bookmarkProject(userId, projectId) {
    if (!userId || !projectId) throw new Error("Both user id and project id are required.");
    try {
        await supabaseFetch("user_bookmarks", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, project_id: projectId }),
            prefer: "return=minimal"
        });
    } catch (err) {
        if (/user_bookmarks.*not.*found/i.test(err.message) || /PGRST200/i.test(err.message)) {
            console.warn("user_bookmarks table not available", err);
            return;
        }
        throw err;
    }
}

async function unbookmarkProject(userId, projectId) {
    if (!userId || !projectId) throw new Error("Both user id and project id are required.");
    try {
        await supabaseFetch(`user_bookmarks?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}`, {
            method: "DELETE"
        });
    } catch (err) {
        if (/user_bookmarks.*not.*found/i.test(err.message) || /PGRST200/i.test(err.message)) {
            console.warn("user_bookmarks table not available", err);
            return;
        }
        throw err;
    }
}

async function isBookmarked(userId, projectId) {
    if (!userId || !projectId) return false;
    try {
        const data = await supabaseFetch(`user_bookmarks?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}`, { method: "GET" });
        return Array.isArray(data) && data.length > 0;
    } catch (err) {
        if (/user_bookmarks.*not.*found/i.test(err.message) || /PGRST200/i.test(err.message)) {
            console.warn("user_bookmarks table not available", err);
            return false;
        }
        throw err;
    }
}

// ── Project Comments ──────────────────────────────────────────────────────────
async function getProjectComments(projectId) {
    if (!projectId) throw new Error("Project id is required.");
    try {
        const data = await supabaseFetch(`project_comments?project_id=eq.${encodeURIComponent(projectId)}&select=*,profiles(username,avatar_url)&order=created_at.asc`, { method: "GET" });
        return Array.isArray(data) ? data : [];
    } catch (err) {
        if (/project_comments.*not.*found/i.test(err.message) || /PGRST200/i.test(err.message)) {
            console.warn("project_comments table not available", err);
            return [];
        }
        throw err;
    }
}

async function addProjectComment(projectId, userId, body) {
    if (!projectId || !userId || !body?.trim()) throw new Error("Project id, user id, and comment body are required.");
    try {
        const data = await supabaseFetch("project_comments", {
            method: "POST",
            body: JSON.stringify({ project_id: projectId, user_id: userId, body: body.trim() }),
            prefer: "return=representation"
        });
        return data?.[0];
    } catch (err) {
        if (/project_comments.*not.*found/i.test(err.message) || /PGRST200/i.test(err.message)) {
            console.warn("project_comments table not available", err);
            return null;
        }
        throw err;
    }
}

async function deleteProjectComment(commentId, userId) {
    if (!commentId || !userId) throw new Error("Comment id and user id are required.");
    try {
        await supabaseFetch(`project_comments?id=eq.${encodeURIComponent(commentId)}&user_id=eq.${encodeURIComponent(userId)}`, {
            method: "DELETE"
        });
    } catch (err) {
        if (/project_comments.*not.*found/i.test(err.message) || /PGRST200/i.test(err.message)) {
            console.warn("project_comments table not available", err);
            return;
        }
        throw err;
    }
}
// Sahifa ochilganda token avtomatik yangilash
(async () => {
    const session = getSession();
    if (session?.refresh_token) {
        const token = getAccessToken();
        // Token bor, lekin muddati o'tgan bo'lishi mumkin — yangilab qo'yamiz
        await refreshSession();
    }
})();

// ── Export ────────────────────────────────────────────────────────────────────
window.SupabaseClient = window.SupabaseClient || {};
Object.assign(window.SupabaseClient, {
    supabaseFetch,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getSession,
    ensureProfile,
    getCommunityPost,
    updateCommunityPost,
    deleteCommunityPost,
    getLikesCount,
    hasUserLiked,
    addLike,
    removeLike,
    getComments,
    addComment,
    deleteComment,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowersCount,
    getFollowingCount,
    bookmarkProject,
    unbookmarkProject,
    isBookmarked,
    getProjectComments,
    addProjectComment,
    deleteProjectComment
});
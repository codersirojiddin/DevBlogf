(() => {
    const VALID_TYPES = new Set(["article", "news", "code"]);

    // SEO uchun sarlavhadan slug yasash (Masalan: "AI is Great!" -> "ai-is-great")
    function generateSlug(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')           // Bo'shliqlarni chiziqqa almashtirish
            .replace(/[^\w\-]+/g, '')       // Maxsus belgilarni o'chirish
            .replace(/\-\-+/g, '-')         // Ketma-ket chiziqlarni bitta qilish
            .replace(/^-+/, '')             // Boshidagi chiziqlarni o'chirish
            .replace(/-+$/, '');            // Oxiridagi chiziqlarni o'chirish
    }

    function normalizeText(value) {
        return String(value || "").trim();
    }

    function toIsoNow() {
        return new Date().toISOString();
    }

    async function getPosts(filters = {}) {
        const type = normalizeText(filters.type).toLowerCase();
        const highlightedOnly = Boolean(filters.highlightedOnly);

        let query = "posts?order=updated_at.desc";
        if (type && VALID_TYPES.has(type)) {
            query += `&type=eq.${type}`;
        }
        if (highlightedOnly) {
            query += `&highlighted=eq.true`;
        }

        return window.SupabaseClient.supabaseFetch(query, { method: "GET" });
    }

    async function getPost(id) {
        const data = await window.SupabaseClient.supabaseFetch(`posts?id=eq.${id}`, { method: "GET" });
        return data?.[0] || null;
    }

    async function createPost(input) {
        const title = normalizeText(input.title);
        const content = normalizeText(input.content);
        const type = normalizeText(input.type).toLowerCase();

        if (!title) throw new Error("Title is required.");
        if (!content) throw new Error("Content is required.");
        if (!VALID_TYPES.has(type)) throw new Error("Invalid post type.");

        const now = toIsoNow();
        const post = {
            title,
            content,
            type,
            highlighted: Boolean(input.highlighted),
            created_at: now,
            updated_at: now
        };

        const result = await window.SupabaseClient.supabaseFetch("posts", {
            method: "POST",
            body: JSON.stringify(post)
        });
        return Array.isArray(result) ? result[0] : result;
    }

    async function updatePost(id, input) {
        const postId = normalizeText(id);
        if (!postId) throw new Error("Post id is required.");

        const title = normalizeText(input.title);
        const content = normalizeText(input.content);
        const type = normalizeText(input.type).toLowerCase();

        if (!title) throw new Error("Title is required.");
        if (!content) throw new Error("Content is required.");
        if (!VALID_TYPES.has(type)) throw new Error("Invalid post type.");

        const result = await window.SupabaseClient.supabaseFetch(`posts?id=eq.${postId}`, {
            method: "PATCH",
            body: JSON.stringify({
                title,
                content,
                type,
                highlighted: Boolean(input.highlighted),
                updated_at: toIsoNow()
            })
        });
        return Array.isArray(result) ? result[0] : result;
    }

    async function deletePost(id) {
        const postId = normalizeText(id);
        if (!postId) throw new Error("Post id is required.");
        await window.SupabaseClient.supabaseFetch(`posts?id=eq.${postId}`, {
            method: "DELETE",
            prefer: "return=minimal"
        });
        return true;
    }

    async function toggleHighlight(id) {
        const post = await getPost(id);
        if (!post) throw new Error("Post not found.");
        return updatePost(id, { ...post, highlighted: !post.highlighted });
    }

    function formatDate(isoValue) {
        const timestamp = Date.parse(isoValue || "");
        if (Number.isNaN(timestamp)) return "Unknown date";
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric"
        });
    }

    function toLabel(type) {
        if (type === "article") return "Article";
        if (type === "news") return "News";
        return "Code";
    }

    function getPreview(text) {
        if (!text) return "";
        return text.split("\n")[0];
    }

    function openPostModal(post) {
        if (!post) return;
        const existing = document.querySelector(".post-modal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.className = "post-modal";
        modal.innerHTML = `
            <div class="post-modal__content" role="dialog" aria-modal="true" aria-label="Full post">
                <button class="post-modal__close" aria-label="Close full post">×</button>
                <h2>${escapeHtml(post.title)}</h2>
                <div class="post-meta">${toLabel(post.type)} • ${formatDate(post.updated_at || post.created_at)}</div>
                <p class="post-content">${escapeHtml(post.content)}</p>

                <div class="post-interactions">
                    <button id="like-btn" class="like-btn" title="Like this post">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span id="like-count">0</span> Likes
                    </button>
                </div>

                <section class="comments-section">
                    <h3 class="comments-heading">Comments</h3>
                    <div id="comments-list" class="comments-list"></div>
                    <div class="comment-form">
                        <textarea id="comment-input" class="comment-input"
                            placeholder="Write a comment..."
                            rows="3"></textarea>
                        <button id="comment-submit" class="comment-submit-btn">Post Comment</button>
                    </div>
                </section>
            </div>
        `;

        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        modal.querySelector(".post-modal__close").addEventListener("click", () => {
            modal.remove();
        });

        document.body.appendChild(modal);

        if (window.initInteractions) {
    window.initInteractions(post.id);
}
    }

    function renderPosts(container, posts, options = {}) {
        if (!container) return;
        const emptyText = normalizeText(options.emptyText) || "No posts yet.";
        const showType = options.showType !== false;
        container.innerHTML = "";

        if (!Array.isArray(posts) || posts.length === 0) {
            container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
            return;
        }

        posts.forEach((post) => {
            const preview = getPreview(post.content);
            const hasMore = post.content.split("\n").length > 1 || post.content.length > preview.length;
            const slug = generateSlug(post.title); // SEO Slug yaratish

            const card = document.createElement("article");
            card.className = "post-card";
            card.dataset.id = post.id;

            card.innerHTML = `
                <div class="post-card__heading">
                    <h3 class="post-card__title">
                        <a href="../article-detail/index.html?post=${slug}&id=${post.id}" class="post-card__main-link">
                            ${escapeHtml(post.title)}
                        </a>
                    </h3>
                    <div class="post-badges">
                        ${showType ? `<span class="post-badge">${toLabel(post.type)}</span>` : ""}
                        ${post.highlighted ? `<span class="post-badge post-badge--highlight">Featured</span>` : ""}
                    </div>
                </div>
                <p class="post-preview">${escapeHtml(preview)}${hasMore ? "..." : ""}</p>
                <div class="post-footer">
                    <span class="post-meta">${formatDate(post.updated_at || post.created_at)}</span>
                </div>
            `;

            container.appendChild(card);
        });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.DevBlogPosts = {
        createPost,
        updatePost,
        deletePost,
        toggleHighlight,
        getPosts,
        getPost,
        renderPosts,
        openPostModal,
        toLabel,
        formatDate,
        generateSlug // Kerak bo'lsa tashqarida ham ishlatsa bo'ladi
    };
})();
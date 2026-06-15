// ── Signal functions ──────────────────────────────────────────────────────────
async function getSignals(projectId) {
    const data = await window.SupabaseClient.supabaseFetch(
        `project_signals?select=signal,user_id&project_id=eq.${projectId}`
    );
    const counts = { useful: 0, inspiring: 0, well_built: 0 };
    const userSignals = new Set();
    const currentUser = window.SupabaseClient.getCurrentUser();

    (data || []).forEach(row => {
        if (counts[row.signal] !== undefined) counts[row.signal]++;
        if (currentUser && row.user_id === currentUser.id) userSignals.add(row.signal);
    });

    return { counts, userSignals };
}

async function toggleSignal(projectId, signal) {
    const user = window.SupabaseClient.getCurrentUser();
    if (!user) { alert("Please log in to rate projects."); return; }

    const existing = await window.SupabaseClient.supabaseFetch(
        `project_signals?project_id=eq.${projectId}&user_id=eq.${user.id}&signal=eq.${signal}`
    );

    if (existing && existing.length > 0) {
        await window.SupabaseClient.supabaseFetch(
            `project_signals?project_id=eq.${projectId}&user_id=eq.${user.id}&signal=eq.${signal}`,
            { method: "DELETE", prefer: "return=minimal" }
        );
    } else {
        await window.SupabaseClient.supabaseFetch("project_signals", {
            method: "POST",
            body: JSON.stringify({ project_id: projectId, user_id: user.id, signal }),
            prefer: "return=minimal"
        });
    }
}

async function logView(projectId) {
    const user = window.SupabaseClient.getCurrentUser();
    await window.SupabaseClient.supabaseFetch("project_views", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, viewer_id: user?.id || null }),
        prefer: "return=minimal"
    }).catch(() => {});
}

// ── Render a project card ─────────────────────────────────────────────────────
async function renderProjectCard(project, container) {
    const { counts, userSignals } = await getSignals(project.id);

    const card = document.createElement("article");
    card.className = "project-card";
    card.dataset.id = project.id;

    const techBadges = (project.tech_stack || [])
        .map(t => `<span class="tech-badge">${t}</span>`).join("");

    const thumbnail = project.thumbnail_url
        ? `<img src="${project.thumbnail_url}" alt="${project.title}" loading="lazy">`
        : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;">🚀</div>`;

    card.innerHTML = `
        <div class="project-card__thumbnail">
            ${thumbnail}
            <span class="project-card__status ${project.status || 'completed'}">${project.status || 'completed'}</span>
        </div>
        <div class="project-card__body">
            <div class="project-card__top">
                <div>
                    <h3 class="project-card__title">${project.title}</h3>
                    <p class="project-card__tagline">${project.tagline || ""}</p>
                </div>
                <div class="project-card__links">
                    ${project.live_url ? `<a href="${project.live_url}" target="_blank" class="icon-btn" title="Live Demo">🌐</a>` : ""}
                    ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="icon-btn" title="GitHub">💻</a>` : ""}
                </div>
            </div>
            <div class="tech-stack">${techBadges}</div>
            <div class="project-card__footer">
                <a href="../profile/index.html?id=${project.user_id}" class="post-author">by ${project.username || "Unknown"}</a>
                <div class="signal-bar">
                    <button class="signal-btn ${userSignals.has('useful') ? 'active' : ''}" data-signal="useful">
                        💡 <span>${counts.useful}</span>
                    </button>
                    <button class="signal-btn ${userSignals.has('inspiring') ? 'active' : ''}" data-signal="inspiring">
                        🔥 <span>${counts.inspiring}</span>
                    </button>
                    <button class="signal-btn ${userSignals.has('well_built') ? 'active' : ''}" data-signal="well_built">
                        ⚙️ <span>${counts.well_built}</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Signal button clicks
    card.querySelectorAll(".signal-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const signal = btn.dataset.signal;
            await toggleSignal(project.id, signal);
            const countEl = btn.querySelector("span");
            const isActive = btn.classList.toggle("active");
            countEl.textContent = parseInt(countEl.textContent) + (isActive ? 1 : -1);
        });
    });

    // Click card to open detail
    card.addEventListener("click", (e) => {
        if (e.target.closest("a") || e.target.closest(".signal-btn")) return;
        logView(project.id);
        window.location.href = `../showcase/index.html?id=${project.id}`;
    });

    container.appendChild(card);
}

window.DevBlogProjects = { renderProjectCard, getSignals, toggleSignal, logView };
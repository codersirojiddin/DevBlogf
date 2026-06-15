// ── Environment Configuration ─────────────────────────────────────────────────
// Cloudflare Pages: Settings → Environment Variables dan o'qiladi
// Local dev uchun: docs/env.local.js faylini yarating (gitignore'd)
(function () {
  // Production: Cloudflare Pages _worker.js yoki Pages Functions inject qiladi
  // Fallback: local development uchun env.local.js dan oladi
  if (typeof window.__ENV__ === "undefined") {
    window.__ENV__ = {
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
    };
    console.warn(
      "[DevBlog] window.__ENV__ topilmadi. " +
      "Cloudflare Pages'da Environment Variables sozlang:\n" +
      "  SUPABASE_URL\n  SUPABASE_ANON_KEY"
    );
  }
})();

/**
 * Cloudflare Pages Middleware
 * HTML so'rovlarida <head> ichiga ENV ni inject qiladi.
 * 
 * Cloudflare Pages → Settings → Environment Variables:
 *   SUPABASE_URL      = https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY = eyJhbGci...
 */
export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const original = await response.text();

  const envScript = `<script>
window.__ENV__ = {
  SUPABASE_URL: ${JSON.stringify(env.SUPABASE_URL || "")},
  SUPABASE_ANON_KEY: ${JSON.stringify(env.SUPABASE_ANON_KEY || "")}
};
</script>`;

  const modified = original.replace("<head>", "<head>\n" + envScript);

  return new Response(modified, {
    status: response.status,
    headers: response.headers,
  });
}

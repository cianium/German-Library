/* German Library v7.1 runtime config.
   Production: use a Supabase publishable key (sb_publishable_...).
   Legacy anon keys still work through the backward-compatible fallback below.
   Never put a Supabase secret/service_role key in browser code. */
window.GL_CONFIG={
  // Demo admin is automatically allowed on file:// and localhost only. Keep false in production.
  allowDemoAdmin:false,
  supabaseUrl:"",
  supabasePublishableKey:"",
  // Deprecated compatibility only; prefer supabasePublishableKey.
  supabaseAnonKey:"",
  syncDebounceMs:350,
  maxUploadBytes:262144000
};

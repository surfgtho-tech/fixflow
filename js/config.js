// ─────────────────────────────────────────────────────────────
//  FixFlow – configuration
//  Leave SUPABASE_URL / SUPABASE_ANON_KEY empty to run in DEMO mode
//  (data stays only on this device). Fill them in to go live.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  APP_NAME: 'FixFlow',
  COMPANY_NAME: 'Maintenance Team',

  // Supabase → Project Settings → API
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Country calling code used to build WhatsApp links from local numbers (083… → 35383…)
  COUNTRY_CODE: '353',

  // Staff must attach at least one photo to mark a job as resolved
  REQUIRE_PHOTO_ON_FINISH: true,
};

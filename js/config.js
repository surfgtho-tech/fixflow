// ─────────────────────────────────────────────────────────────
//  Robustfix – configuration
//  Leave SUPABASE_URL / SUPABASE_ANON_KEY empty to run in DEMO mode
//  (data stays only on this device). Fill them in to go live.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  APP_NAME: 'Robustfix',
  COMPANY_NAME: 'Maintenance Team',

  // Supabase → Project Settings → API
  SUPABASE_URL: 'https://ruhmizimdkpeqsaulwgi.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_QaxPqGUxP9JOg_CVtX1Teg_3krpbkaf', // public by design – data is protected by RLS

  // Country calling code used to build WhatsApp links from local numbers (083… → 35383…)
  COUNTRY_CODE: '353',

  // Staff must attach at least one photo to mark a job as resolved
  REQUIRE_PHOTO_ON_FINISH: true,
};

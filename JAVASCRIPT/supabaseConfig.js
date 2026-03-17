// supabase-config.js
// ────────────────────────────────────────────────
//     SINGLE PLACE where Supabase is initialized
// ────────────────────────────────────────────────

const SUPABASE_URL    = 'https://jisbghegwlejauhptrvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppc2JnaGVnd2xlamF1aHB0cnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDA4MjIsImV4cCI6MjA4OTAxNjgyMn0.Iv462ZQ7Y4YkCKCPxFGTPl8B5HCcD2baYKWX4-WkN-s';

let supabaseClient = null;

if (!window.supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log("Supabase client initialized");
} else {
    supabaseClient = window.supabaseClient;
    console.log("Re-using existing Supabase client");
}

//export { supabaseClient };   // if using modules
// or just rely on window.supabaseClient
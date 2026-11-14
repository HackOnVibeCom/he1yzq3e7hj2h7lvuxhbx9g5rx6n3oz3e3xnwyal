// Where the room data lives.
//
// Both values below are PUBLIC on purpose: the anon key is meant to ship in the
// browser. It is not a password. Every table has row level security enabled with
// no policies, so this key cannot read or write a table directly — it can only
// call the three functions in supabase/schema.sql, which decide what a player is
// allowed to see. Never put the service_role key here.
//
// Find them in Supabase: Project Settings -> API Keys -> anon / publishable.

export const SUPABASE_URL = 'https://rdadbnhrotasgkkyopel.supabase.co';
export const SUPABASE_ANON_KEY = '';

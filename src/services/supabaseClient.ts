import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here';

let supabaseClient: any = null;

try {
  const isPlaceholder = 
    !supabaseUrl || 
    supabaseUrl.includes('your-project-ref.supabase.co') || 
    supabaseUrl.includes('placeholder') ||
    !supabaseAnonKey ||
    supabaseAnonKey.includes('your-anon-key-here');

  if (!isPlaceholder) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized successfully.");
  } else {
    console.warn("Supabase credentials not configured in .env.local. Falling back to local storage simulation.");
  }
} catch (e) {
  console.error("Failed to initialize Supabase client:", e);
}

export const supabase = supabaseClient;

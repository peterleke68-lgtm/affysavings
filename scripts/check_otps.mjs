import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envContent = '';
try {
  envContent = fs.readFileSync('.env.local', 'utf8');
} catch (e) {
  console.log('Error reading .env.local', e);
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE__KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemaAndData() {
  console.log('=== AUTH_OTPS ===');
  const { data: otps, error: oErr } = await supabase.from('auth_otps').select('*').limit(10);
  if (oErr) console.error('otps err:', oErr);
  else console.log('otps records:', otps);

  console.log('\n=== ALL USERS IN PUBLIC.USERS ===');
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  if (uErr) console.error('users err:', uErr);
  else console.log('users count:', users?.length, users?.map(u => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, is_verified: u.is_verified, created_at: u.created_at })));
}

checkSchemaAndData();

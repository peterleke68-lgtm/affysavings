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

async function checkAuthAndUsers() {
  console.log('=== SUPABASE AUTH USERS (auth.users) ===');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth listUsers error:', authErr);
  } else {
    console.log(`Auth users count: ${authData?.users?.length}`);
    authData?.users?.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, CreatedAt: ${u.created_at}, ConfirmedAt: ${u.email_confirmed_at}`);
    });
  }

  console.log('\n=== PUBLIC.USERS (application profiles) ===');
  const { data: pubUsers, error: pubErr } = await supabase.from('users').select('id, email, name, phone, is_verified, is_locked, created_at');
  if (pubErr) {
    console.error('pubUsers error:', pubErr);
  } else {
    console.log(`Public users count: ${pubUsers?.length}`);
    pubUsers?.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Name: ${u.name}, Phone: ${u.phone}, CreatedAt: ${u.created_at}`);
    });
  }

  console.log('\n=== STAFF PROFILES ===');
  const { data: staff, error: sErr } = await supabase.from('staff_profiles').select('id, email, name, role, is_active, created_at');
  if (sErr) console.error('Staff err:', sErr);
  else {
    console.log(`Staff count: ${staff?.length}`);
    staff?.forEach(s => {
      console.log(`- ID: ${s.id}, Email: ${s.email}, Name: ${s.name}, Role: ${s.role}`);
    });
  }
}

checkAuthAndUsers();

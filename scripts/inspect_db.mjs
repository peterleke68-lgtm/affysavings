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

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('=== USERS ===');
  const { data: users, error: uErr } = await supabase.from('users').select('id, email, name, phone, is_verified, is_locked, created_at');
  if (uErr) console.error('Users err:', uErr);
  else console.log('Users count:', users?.length, JSON.stringify(users, null, 2));

  console.log('=== STAFF PROFILES ===');
  const { data: staff, error: sErr } = await supabase.from('staff_profiles').select('id, email, name, role, is_active, created_at');
  if (sErr) console.error('Staff err:', sErr);
  else console.log('Staff count:', staff?.length, JSON.stringify(staff, null, 2));

  console.log('=== TRANSACTIONS ===');
  const { data: txs, error: tErr } = await supabase.from('transactions').select('id, user_id, type, amount, status, reference, created_at');
  if (tErr) console.error('Tx err:', tErr);
  else console.log('Tx count:', txs?.length, JSON.stringify(txs, null, 2));

  console.log('=== WALLETS ===');
  const { data: wallets, error: wErr } = await supabase.from('wallets').select('*');
  if (wErr) console.error('Wallets err:', wErr);
  else console.log('Wallets count:', wallets?.length, JSON.stringify(wallets, null, 2));
}

inspect();

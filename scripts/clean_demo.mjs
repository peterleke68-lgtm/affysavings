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

async function cleanDemo() {
  console.log('--- Cleaning obsolete demo staff accounts ---');
  // Remove test.finance@affysavings.com
  const { data: deletedStaff, error: delErr } = await supabase
    .from('staff_profiles')
    .delete()
    .eq('email', 'test.finance@affysavings.com')
    .select('*');

  if (delErr) {
    console.error('Delete demo staff error:', delErr);
  } else {
    console.log('Deleted demo staff:', deletedStaff);
  }

  // Ensure real user has a wallet
  const { data: realUser } = await supabase.from('users').select('*').eq('email', 'peterleke68@gmail.com').maybeSingle();
  if (realUser) {
    console.log('Preserving real user:', realUser.email, realUser.name);
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', realUser.id).maybeSingle();
    if (!wallet) {
      console.log('Creating initial wallet for real user in Supabase');
      await supabase.from('wallets').insert({
        id: crypto.randomUUID(),
        user_id: realUser.id,
        balance: 0.0,
        wallet_balance: 0.0,
        reserved_balance: 0.0,
        currency: 'NGN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Verify staff list
  const { data: allStaff } = await supabase.from('staff_profiles').select('id, email, name, role, is_active');
  console.log('Active staff in DB:', allStaff);

  // Verify users list
  const { data: allUsers } = await supabase.from('users').select('id, email, name, is_verified');
  console.log('Active users in DB:', allUsers);
}

cleanDemo();

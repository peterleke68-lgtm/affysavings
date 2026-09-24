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

async function runAudit() {
  console.log('====================================================');
  console.log('AFFY SAVINGS: CUSTOMER DIRECTORY & AUTH INVARIANT AUDIT');
  console.log('====================================================\n');

  // 1. Check Supabase Auth users
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  console.log(`[1] Auth Users in auth.users: ${authUsers?.users?.length || 0}`);
  authUsers?.users?.forEach(u => {
    console.log(`  - Auth User: ${u.email} | ID: ${u.id} | Confirmed: ${!!u.email_confirmed_at}`);
  });

  // 2. Check public.users
  const { data: pubUsers, error: pubErr } = await supabase
    .from('users')
    .select('id, email, name, phone, is_verified, is_locked, failed_attempts, created_at')
    .order('created_at', { ascending: false });

  console.log(`\n[2] Application Profiles in public.users: ${pubUsers?.length || 0}`);
  pubUsers?.forEach((u, i) => {
    console.log(`  - Customer ${i + 1}: ${u.name} <${u.email}> | Phone: ${u.phone || 'N/A'} | Verified: ${u.is_verified} | Locked: ${u.is_locked} | ID: ${u.id}`);
  });

  // 3. Check staff profiles
  const { data: staff, error: sErr } = await supabase
    .from('staff_profiles')
    .select('id, email, name, role, is_active, created_at');

  console.log(`\n[3] Staff Profiles: ${staff?.length || 0}`);
  staff?.forEach(s => {
    console.log(`  - Staff: ${s.name} <${s.email}> | Role: ${s.role} | Active: ${s.is_active}`);
  });

  // 4. Verify no demo users exist
  const hasJohnDoe = [...(pubUsers || []), ...(staff || [])].some(x => x.name === 'John Doe' || x.email === 'support@affysavings.com');
  const hasJaneDoe = [...(pubUsers || []), ...(staff || [])].some(x => x.name === 'Jane Doe' || x.email === 'customer@affysavings.com');
  console.log(`\n[4] Demo Data Check:`);
  console.log(`  - 'John Doe' present in DB: ${hasJohnDoe ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`  - 'Jane Doe' present in DB: ${hasJaneDoe ? 'YES (FAIL)' : 'NO (PASS)'}`);

  // 5. Test Wallets existence for each user
  const userIds = pubUsers?.map(u => u.id) || [];
  const { data: wallets } = await supabase.from('wallets').select('*').in('user_id', userIds);
  console.log(`\n[5] Wallets for Application Users:`);
  userIds.forEach(uid => {
    const w = wallets?.find(x => x.user_id === uid);
    const u = pubUsers?.find(x => x.id === uid);
    console.log(`  - User ${u?.name}: Wallet ${w ? `EXISTS (Balance: ₦${w.wallet_balance})` : 'MISSING'}`);
  });

  console.log('\n====================================================');
  console.log('AUDIT COMPLETE');
  console.log('====================================================');
}

runAudit();

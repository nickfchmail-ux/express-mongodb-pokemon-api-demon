import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars:');
  console.error('URL:', supabaseUrl);
  console.error('Key exists?', !!supabaseKey);
  throw new Error(
    'Supabase URL and/or key missing — check .env and import order',
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

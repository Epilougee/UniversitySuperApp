import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nlxoibazeofnnpryxwuk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FfSxfvCBkTXm_9YEW6jHPA_8dj8PqPZ';

export const supabase = createClient(supabaseUrl, supabaseKey);

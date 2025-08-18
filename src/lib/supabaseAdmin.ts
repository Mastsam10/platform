import { createClient } from '@supabase/supabase-js'

// Ensure this is only used server-side
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin should only be used on the server side')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY!

// Debug logging (will show in build logs)
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('Service Key:', serviceRoleKey ? 'Set' : 'Missing')

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(`Missing required environment variables: URL=${!!supabaseUrl}, Key=${!!serviceRoleKey}`)
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)



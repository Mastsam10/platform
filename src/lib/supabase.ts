// Re-export the new SSR-based clients for backward compatibility
export { createClient as createBrowserClient } from './supabase/client'
export { createClient as createServerClient } from './supabase/server'

// Legacy export for backward compatibility - use the new client functions instead
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Legacy client - deprecated, use createClient() from ./supabase/client instead
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  name?: string
  role: 'viewer' | 'creator' | 'church_admin' | 'mod' | 'admin'
  created_at: string
}

export interface Channel {
  id: string
  owner_id: string
  type: 'church' | 'creator'
  name: string
  slug: string
  denomination?: string
  bio?: string
  avatar_url?: string
  banner_url?: string
}

export interface Video {
  id: string
  channel_id: string
  title: string
  description?: string
  status: 'draft' | 'ready'
  playback_id?: string
  duration_s?: number
  published_at?: string
  has_captions?: boolean
}

export interface VideoTag {
  id: string
  video_id: string
  type: 'passage' | 'topic' | 'denomination' | 'city'
  value: string
  start_s?: number
}

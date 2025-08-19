import { createClient } from '@supabase/supabase-js'

// Create a function to get the Supabase client dynamically
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// For backward compatibility, create a default instance
// This will be created when the module is first accessed
let _supabase: ReturnType<typeof createClient> | null = null

// Simple function to get the client instance
export function getSupabase() {
  if (!_supabase) {
    _supabase = getSupabaseClient()
  }
  return _supabase!
}

// Export a default instance for backward compatibility
export const supabase = getSupabase()

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

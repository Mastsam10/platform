import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  return NextResponse.json({
    supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
    supabaseAnonKey: supabaseAnonKey ? 'SET' : 'NOT SET',
    supabaseServiceKey: supabaseServiceKey ? 'SET' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
    // Show first few characters of keys to help debug
    anonKeyStart: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'NOT SET',
    serviceKeyStart: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'NOT SET',
    // Check if they're the same (which would be the problem)
    keysAreSame: supabaseAnonKey === supabaseServiceKey
  })
}

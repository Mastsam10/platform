import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test the supabase client
    const { data, error } = await supabase.auth.getSession()
    
    return NextResponse.json({
      success: true,
      hasSession: !!data.session,
      error: error?.message || null,
      supabaseUrl: supabase.supabaseUrl,
      // Don't expose the actual keys, just check if they're set
      hasAnonKey: !!supabase.supabaseKey,
      keyLength: supabase.supabaseKey?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

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
      // Don't expose protected properties
      clientWorking: true
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Checking environment variables...')
    
    const envVars = {
      // Supabase
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing',
      
      // Cloudflare
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? '✅ Set' : '❌ Missing',
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? '✅ Set' : '❌ Missing',
      CLOUDFLARE_STREAM_SIGNING_KEY: process.env.CLOUDFLARE_STREAM_SIGNING_KEY ? '✅ Set' : '❌ Missing',
      CLOUDFLARE_STREAM_SIGNING_KEY_ID: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID ? '✅ Set' : '❌ Missing',
      CLOUDFLARE_WEBHOOK_SECRET: process.env.CLOUDFLARE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing',
      
      // Site URL
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '❌ Not set (using default)',
      
      // Deepgram
      DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ? '✅ Set' : '❌ Missing',
    }
    
    console.log('Environment variables status:', envVars)
    
    // Check if critical variables are missing
    const missingCritical = []
    if (!process.env.CLOUDFLARE_API_TOKEN) missingCritical.push('CLOUDFLARE_API_TOKEN')
    if (!process.env.CLOUDFLARE_ACCOUNT_ID) missingCritical.push('CLOUDFLARE_ACCOUNT_ID')
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingCritical.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingCritical.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if (!process.env.SUPABASE_SERVICE_KEY) missingCritical.push('SUPABASE_SERVICE_KEY')
    
    return NextResponse.json({
      message: 'Environment variables check completed',
      status: missingCritical.length === 0 ? '✅ All critical variables set' : '❌ Missing critical variables',
      missingCritical,
      envVars
    })
    
  } catch (error) {
    console.error('Environment check error:', error)
    return NextResponse.json(
      { error: 'Environment check failed', details: error },
      { status: 500 }
    )
  }
}

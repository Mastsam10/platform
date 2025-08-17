export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking available database functions...')

    // Try to list functions
    const { data: functions, error: functionsError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .order('routine_name')

    if (functionsError) {
      console.error('❌ Failed to list functions:', functionsError)
      return NextResponse.json({ 
        error: 'Failed to list functions',
        details: functionsError.message 
      }, { status: 500 })
    }

    // Try to check if exec_sql exists
    const { data: execSqlExists, error: execSqlError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'exec_sql')
      .single()

    // Try a simple SQL query to test direct access
    let directSqlTest = null
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('videos')
        .select('count')
        .limit(1)
      
      directSqlTest = {
        success: !testError,
        error: testError?.message || null
      }
    } catch (error) {
      directSqlTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({ 
      availableFunctions: functions,
      execSqlExists: !!execSqlExists,
      execSqlError: execSqlError?.message || null,
      directSqlTest,
      totalFunctions: functions?.length || 0
    })

  } catch (error) {
    console.error('❌ Function check error:', error)
    return NextResponse.json({
      error: 'Function check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

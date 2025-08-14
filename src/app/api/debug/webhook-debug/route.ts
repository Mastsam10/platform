import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    // Get all videos with detailed webhook correlation info
    const { data: videos, error } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        status,
        playback_id,
        asset_id,
        upload_id,
        duration_s,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analyze webhook correlation issues
    const analysis = {
      total: videos?.length || 0,
      ready: videos?.filter(v => v.status === 'ready').length || 0,
      processing: videos?.filter(v => v.status === 'processing').length || 0,
      draft: videos?.filter(v => v.status === 'draft').length || 0,
      withPlaybackId: videos?.filter(v => v.playback_id && v.playback_id !== 'PROCESSING').length || 0,
      withAssetId: videos?.filter(v => v.asset_id).length || 0,
      withUploadId: videos?.filter(v => v.upload_id).length || 0,
      webhookIssues: [] as any[]
    }

    // Identify specific webhook correlation issues
    videos?.forEach(video => {
      const issues = []
      
      if (video.status === 'ready' && (!video.playback_id || video.playback_id === 'PROCESSING')) {
        issues.push('READY_WITHOUT_PLAYBACK_ID')
      }
      
      if (video.status === 'processing' && video.playback_id && video.playback_id !== 'PROCESSING') {
        issues.push('PROCESSING_WITH_PLAYBACK_ID')
      }
      
      if (video.asset_id && !video.upload_id) {
        issues.push('ASSET_ID_WITHOUT_UPLOAD_ID')
      }
      
      if (video.upload_id && !video.asset_id) {
        issues.push('UPLOAD_ID_WITHOUT_ASSET_ID')
      }
      
      if (issues.length > 0) {
        analysis.webhookIssues.push({
          videoId: video.id,
          title: video.title,
          issues,
          status: video.status,
          playback_id: video.playback_id,
          asset_id: video.asset_id,
          upload_id: video.upload_id
        })
      }
    })

    return NextResponse.json({
      success: true,
      videos,
      analysis,
      recommendations: analysis.webhookIssues.length > 0 ? [
        'Run /api/debug/fix-video-status to correct status inconsistencies',
        'Check webhook logs for failed asset_id correlations',
        'Verify Mux webhook configuration points to correct endpoint'
      ] : ['All videos appear to be in consistent state']
    })

  } catch (error) {
    console.error('Webhook debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

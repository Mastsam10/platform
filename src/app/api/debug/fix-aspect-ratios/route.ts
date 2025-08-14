import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoTitle, aspectRatio } = body

    if (!videoTitle || !aspectRatio) {
      return NextResponse.json({ 
        error: 'Missing videoTitle or aspectRatio' 
      }, { status: 400 })
    }

    // Update the video with the correct aspect ratio
    const { data, error } = await supabaseAdmin
      .from('videos')
      .update({ aspect_ratio: aspectRatio })
      .eq('title', videoTitle)
      .select()

    if (error) {
      console.error('Failed to update aspect ratio:', error)
      return NextResponse.json({ 
        error: 'Failed to update aspect ratio' 
      }, { status: 500 })
    }

    if (data && data.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Updated ${videoTitle} with aspect ratio ${aspectRatio}`,
        video: data[0]
      })
    } else {
      return NextResponse.json({ 
        error: `No video found with title: ${videoTitle}` 
      }, { status: 404 })
    }

  } catch (error) {
    console.error('Error fixing aspect ratio:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

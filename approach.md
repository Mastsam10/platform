Recommendation (what to do now)
Pick Option 4 (Hybrid) and do these two moves today:

Show captions in the player (2–3 hrs)

Convert your SRTs to WebVTT (.vtt), upload to Supabase Storage, and wire captions into the player.

If you’re using Cloudflare Stream’s iframe player, attach the VTT as a caption track via the Stream API so the CC button appears.

If you use your own <video>/hls.js player, just add a <track> element pointing at the VTT URL.

Remove the cron bottleneck (same day; $0)

Stop relying on a daily cron to process transcripts.

On video.ready webhook, immediately submit a prerecorded job to Deepgram with a callback URL. Deepgram does the heavy work off your infra and calls you back when done—no long-running function, no timeouts, no cron limits.

Your callback writes the VTT/SRT, updates DB, and attaches captions to Stream.

This gives you YouTube-like “captions ready when video is ready” UX without upgrading plans. If you later outgrow this, move to Pro for more concurrency—but you won’t need it to eliminate the 24-hour delay.

Why this beats the other options
Option 1 fixes the UI but keeps the 24-hour delay → poor UX.

Option 2 (immediate processing) is achievable on Hobby if you use Deepgram’s asynchronous callback; no cron required.

Option 3 (Pro) is nice but unnecessary until you have steady multi-video/day volume.

Hybrid = immediate UX + zero extra cost + clean path to scale.

Implementation details (copy/paste friendly)
A) Frontend: add captions to the player
If you use the Cloudflare Stream iframe player

Ensure you have VTT, not SRT. (Deepgram can return VTT directly, or convert SRT → VTT once when saving.)

Upload to Supabase Storage, get a public (or signed) URL.

Attach the caption track to the Stream asset (so the CC button appears in the iframe):

ts
Copy
Edit
// server-side utility (pseudo; fill accountId/token)
async function attachCaptionToStream(uid: string, vttUrl: string, lang = 'en', label = 'English') {
  await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/stream/${uid}/captions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CF_STREAM_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: vttUrl, lang, label, kind: 'subtitles', default: true })
  });
}
If you use your own HLS player (video.js/hls.js)
Use a <track>:

tsx
Copy
Edit
<video id="player" controls crossOrigin="anonymous" playsInline>
  <source src={`https://videodelivery.net/${uid}/manifest/video.m3u8`} type="application/x-mpegURL" />
  <track
    kind="subtitles"
    src={vttPublicUrl}
    srcLang="en"
    label="English"
    default
  />
</video>
HTML5 captions expect WebVTT. Convert SRT once and store VTT.

B) Backend: make transcription immediate (no cron)
1) Stream webhook → enqueue + fire Deepgram with callback

ts
Copy
Edit
// app/api/webhooks/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const event = await req.json();

  // TODO: verify CF signature
  if (event.type === 'video.ready') {
    const uid = event.data.uid;

    // Signed MP4 download URL (or public, if allowed)
    const downloadUrl = `https://videodelivery.net/${uid}/downloads/default.mp4`; // use short-lived signed token if needed

    // Submit async job to Deepgram with callback
    await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&callback=' +
      encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/deepgram?uid=${uid}`), {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY!}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: downloadUrl })
    });

    // Track job
    await supabase.from('transcript_jobs').insert({ video_id: uid, status: 'running' });
  }
  return NextResponse.json({ ok: true });
}
2) Deepgram callback → store VTT/SRT, attach to Stream, update DB

ts
Copy
Edit
// app/api/webhooks/deepgram/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const url = new URL(req.url);
  const uid = url.searchParams.get('uid')!;

  // Optionally verify Deepgram signature headers
  const payload = await req.json();

  const { vtt, plain } = toVttAndText(payload); // build VTT from paragraphs/words
  const path = `captions/${uid}.vtt`;
  await supabase.storage.from('public').upload(path, new Blob([vtt], { type: 'text/vtt' }), { upsert: true });
  const { data: pub } = supabase.storage.from('public').getPublicUrl(path);

  await attachCaptionToStream(uid, pub.publicUrl, 'en', 'English');

  await supabase.from('videos').update({
    srt_url: pub.publicUrl,            // keep name but store VTT URL
    transcript_text: plain
  }).eq('id', uid);

  await supabase.from('transcript_jobs').update({ status: 'done' }).eq('video_id', uid);

  // Kick scripture chapterizer (async)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chapters/generate`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ videoId: uid, vttUrl: pub.publicUrl })
  }).catch(()=>{});

  return NextResponse.json({ ok: true });
}

function toVttAndText(dg: any) {
  let vtt = 'WEBVTT\n\n', plain = '';
  const paras = dg?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs ?? [];
  paras.forEach(p => {
    vtt += `${sec(p.start)} --> ${sec(p.end)}\n${p.transcript.trim()}\n\n`;
    plain += p.transcript.trim() + '\n';
  });
  return { vtt, plain };
}
function sec(s:number){const h=String(Math.floor(s/3600)).padStart(2,'0');const m=String(Math.floor((s%3600)/60)).padStart(2,'0');const ss=(s%60).toFixed(3).padStart(6,'0');return `${h}:${m}:${ss}`;}
This keeps all long-running work off Vercel. Your routes return quickly, so Hobby plan limits don’t matter.

Scalability & cost thinking
Throughput: Each new video triggers one Deepgram job → Deepgram handles concurrency. Your infra only writes files and DB rows on callback. You can process dozens/hundreds per day on Hobby.

When to upgrade to Pro:

You need frequent scheduled tasks for other reasons, or

Your callback processing starts pushing 10s timeouts (rare; it’s mostly I/O), or

You want richer background job orchestration.

Costs now: $0 infra + Deepgram usage + Stream usage you already pay. That’s it.

Risks & mitigations
Signed URL access: Use short-lived tokens for the MP4 download; do not expose them in logs.

Webhook verification: Verify signatures from Stream and Deepgram to avoid spoofing.

Caption format: Use VTT for HTML5/Cloudflare player. Convert once and store.

Backpressure: Add attempts and next_attempt_at columns to your jobs for safe retries; dead-letter after 5 attempts.

PII: If you index transcripts, optionally mask emails/phones before search.

Answers to your strategic questions (short)
Immediate priority: Implement captions UI + async callback flow now (Option 4). Highest user value per hour.

Scalability: With callbacks, capacity depends on Deepgram, not your cron. You’ll handle your growth curve fine on Hobby.

Cost–benefit: Don’t pay $20/mo until you feel pain; you can deliver YouTube-like captions now for $0 infra.

Technical debt: The callback pattern is the “final form.” No refactor needed later.

User expectations: New platforms don’t need every YouTube nicety, but captions toggles with proper timing are baseline.

Implementation complexity: Option 4 is minimal code: one API call at video.ready, one webhook, one attach step, one <track> (or Stream captions).

Growth strategy: This approach scales from 10 → 200+ users with the same architecture.

Risks: Signature verification, caption attachment API quirks, occasional STT errors → all handled by retries and logs.

“Definition of done” for this change
Upload → Stream ready → Deepgram job submitted immediately → Deepgram callback writes VTT + DB → captions appear in player CC menu → chapterizer runs → searchable.

Ship this and you’ll have production-grade auto-captions today, with a clean path to scale.
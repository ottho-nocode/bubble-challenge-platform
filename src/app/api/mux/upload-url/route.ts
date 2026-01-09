import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Check if Mux credentials are available
const muxTokenId = process.env.MUX_TOKEN_ID;
const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

console.log('Mux credentials check:', {
  hasTokenId: !!muxTokenId,
  hasTokenSecret: !!muxTokenSecret,
});

let mux: Mux | null = null;
if (muxTokenId && muxTokenSecret) {
  mux = new Mux({
    tokenId: muxTokenId,
    tokenSecret: muxTokenSecret,
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    // Check if Mux is configured
    if (!mux) {
      console.error('Mux not configured - missing credentials');
      return NextResponse.json(
        { error: 'Mux non configure. Verifiez MUX_TOKEN_ID et MUX_TOKEN_SECRET.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json(
          { error: 'Token invalide' },
          { status: 401, headers: corsHeaders }
        );
      }
      userId = user.id;
    } else {
      return NextResponse.json(
        { error: 'Authorization requise' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { challenge_id, upload_type } = body; // upload_type: 'submission' or 'reference'

    if (!challenge_id) {
      return NextResponse.json(
        { error: 'challenge_id requis' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create a direct upload URL
    // The passthrough field will help us identify this upload in the webhook
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: JSON.stringify({
          user_id: userId,
          challenge_id,
          upload_type: upload_type || 'submission',
          timestamp: Date.now(),
        }),
      },
      cors_origin: '*', // Allow upload from any origin (Chrome extension)
    });

    console.log('Mux upload created:', {
      uploadId: upload.id,
      challengeId: challenge_id,
      uploadType: upload_type,
    });

    return NextResponse.json({
      success: true,
      uploadUrl: upload.url,
      uploadId: upload.id,
    }, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Mux upload-url error:', errorMessage, errorStack);
    return NextResponse.json(
      { error: `Erreur Mux: ${errorMessage}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

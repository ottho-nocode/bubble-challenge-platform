import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('challenge_id');

    if (!challengeId) {
      return NextResponse.json(
        { error: 'challenge_id requis' },
        { status: 400 }
      );
    }

    // Check for Bearer token
    const authHeader = request.headers.get('Authorization');
    let userId = null;
    let isAdmin = false;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        userId = user.id;

        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        isAdmin = profile?.is_admin || false;
      }
    }

    // Get challenge info
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, ai_correction_enabled, reference_actions_json')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Defi introuvable' },
        { status: 404 }
      );
    }

    // Determine upload mode
    // If admin + AI enabled + no reference yet = record reference
    // Otherwise = normal submission
    const shouldRecordReference = isAdmin &&
      challenge.ai_correction_enabled &&
      !challenge.reference_actions_json;

    return NextResponse.json({
      challenge_id: challenge.id,
      title: challenge.title,
      ai_correction_enabled: challenge.ai_correction_enabled,
      has_reference: !!challenge.reference_actions_json,
      is_admin: isAdmin,
      upload_mode: shouldRecordReference ? 'reference' : 'submission',
      upload_endpoint: shouldRecordReference ? '/api/upload-reference' : '/api/upload',
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// CORS for Chrome extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

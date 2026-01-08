import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Route segment config for larger uploads
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    let user = null;
    let supabase;

    // Check for Bearer token from Chrome extension
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { data: { user: tokenUser }, error } = await supabase.auth.getUser(token);

      if (error || !tokenUser) {
        return NextResponse.json(
          { error: 'Token invalide' },
          { status: 401 }
        );
      }
      user = tokenUser;
    } else {
      // Fallback to cookie-based auth for web app
      supabase = await createServerClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !cookieUser) {
        return NextResponse.json(
          { error: 'Non authentifie' },
          { status: 401 }
        );
      }
      user = cookieUser;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Acces refuse - Admin uniquement' },
        { status: 403 }
      );
    }

    // Parse JSON body
    const body = await request.json();
    const { challenge_id: challengeId, actions, screenshots, metadata } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'challenge_id requis' },
        { status: 400 }
      );
    }

    console.log('Reference upload received:', {
      challengeId,
      actionsCount: actions?.length || 0,
      screenshotsCount: screenshots?.length || 0
    });

    // Verify challenge exists and has AI correction enabled
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, ai_correction_enabled')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Defi introuvable' },
        { status: 404 }
      );
    }

    if (!challenge.ai_correction_enabled) {
      return NextResponse.json(
        { error: 'La correction IA n\'est pas activee pour ce defi' },
        { status: 400 }
      );
    }

    // Build reference data with actions and screenshots
    const referenceData = {
      actions: actions || [],
      screenshots: screenshots || [],
      metadata: metadata || {},
      recordedAt: new Date().toISOString()
    };

    // Update challenge with reference data
    const { error: updateError } = await supabase
      .from('challenges')
      .update({
        reference_actions_json: referenceData
      })
      .eq('id', challengeId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour du defi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reference enregistree avec succes',
      actionsCount: actions?.length || 0,
      screenshotsCount: screenshots?.length || 0
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

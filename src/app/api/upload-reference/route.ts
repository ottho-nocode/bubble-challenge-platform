import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

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

    const formData = await request.formData();

    const videoFile = formData.get('video') as File;
    const actionsJson = formData.get('actions') as string;
    const challengeId = formData.get('challenge_id') as string;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'challenge_id requis' },
        { status: 400 }
      );
    }

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

    // Upload reference video to Supabase Storage
    let publicUrl = null;

    if (videoFile && videoFile.size > 0) {
      const timestamp = Date.now();
      const videoFileName = `references/${challengeId}/${timestamp}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, videoFile, {
          contentType: 'video/webm',
          upsert: true, // Allow overwriting reference
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json(
          { error: 'Erreur lors de l\'upload de la video' },
          { status: 500 }
        );
      }

      const { data } = supabase.storage
        .from('videos')
        .getPublicUrl(videoFileName);
      publicUrl = data.publicUrl;
    }

    // Parse actions JSON
    let parsedActions = null;
    try {
      parsedActions = actionsJson ? JSON.parse(actionsJson) : null;
    } catch {
      console.warn('Could not parse actions JSON');
    }

    // Update challenge with reference data
    const updateData: Record<string, unknown> = {};
    if (publicUrl) {
      updateData.reference_video_url = publicUrl;
    }
    if (parsedActions) {
      updateData.reference_actions_json = parsedActions;
    }

    const { error: updateError } = await supabase
      .from('challenges')
      .update(updateData)
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
      reference_video_url: publicUrl,
      has_actions: !!parsedActions,
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

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
      // Use service role client to verify token
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

    const formData = await request.formData();

    const videoFile = formData.get('video') as File;
    const actionsJson = formData.get('actions') as string;
    const challengeId = formData.get('challenge_id') as string;
    const duration = formData.get('duration') as string;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'challenge_id requis' },
        { status: 400 }
      );
    }

    // Upload video to Supabase Storage (if provided)
    let publicUrl = null;

    if (videoFile && videoFile.size > 0) {
      const timestamp = Date.now();
      const videoFileName = `${user.id}/${challengeId}/${timestamp}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, videoFile, {
          contentType: 'video/webm',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json(
          { error: 'Erreur lors de l\'upload de la video' },
          { status: 500 }
        );
      }

      // Get public URL
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

    // Create submission record
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        video_url: publicUrl,
        actions_json: parsedActions,
        duration: duration ? parseInt(duration) : null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la soumission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission,
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

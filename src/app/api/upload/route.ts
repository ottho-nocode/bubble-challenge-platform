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

    // Parse JSON body
    const body = await request.json();
    const {
      challenge_id: challengeId,
      actions,
      screenshots,
      metadata,
      duration,
      bubble_url: bubbleUrl,
      mux_upload_id: muxUploadId
    } = body;

    if (!challengeId) {
      return NextResponse.json(
        { error: 'challenge_id requis' },
        { status: 400 }
      );
    }

    console.log('Submission received:', {
      challengeId,
      actionsCount: actions?.length || 0,
      screenshotsCount: screenshots?.length || 0,
      duration,
      muxUploadId
    });

    // Build submission data with actions and screenshots
    const submissionData = {
      actions: actions || [],
      screenshots: screenshots || [],
      metadata: metadata || {}
    };

    // Check if challenge has AI correction enabled
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('ai_correction_enabled')
      .eq('id', challengeId)
      .single();

    console.log('Challenge fetch:', { challenge, challengeError, challengeId });
    console.log('AI correction enabled:', challenge?.ai_correction_enabled);

    // Check if there's already a submission created by Mux webhook (has mux_asset_id)
    // This happens when video upload completes before this endpoint is called
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id, mux_asset_id, mux_playback_id')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .eq('status', 'pending')
      .not('mux_asset_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let submission;
    let insertError;

    if (existingSubmission) {
      // Update existing submission created by webhook
      console.log('Found existing submission from webhook:', existingSubmission.id);
      const { data: updated, error } = await supabase
        .from('submissions')
        .update({
          actions_json: submissionData,
          duration: typeof duration === 'number' ? duration : (duration ? parseInt(duration) : null),
          bubble_url: bubbleUrl || null,
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();

      submission = updated;
      insertError = error;
    } else {
      // Create new submission record (webhook will update with video later)
      console.log('Creating new submission (no webhook submission found), mux_upload_id:', muxUploadId);
      const { data: inserted, error } = await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          video_url: null,
          actions_json: submissionData,
          duration: typeof duration === 'number' ? duration : (duration ? parseInt(duration) : null),
          bubble_url: bubbleUrl || null,
          status: 'pending',
          mux_upload_id: muxUploadId || null,
        })
        .select()
        .single();

      submission = inserted;
      insertError = error;
    }

    if (insertError) {
      console.error('Insert/Update error:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la soumission' },
        { status: 500 }
      );
    }

    // Trigger AI review if enabled for this challenge
    console.log('Should trigger AI?', {
      ai_correction_enabled: challenge?.ai_correction_enabled,
      hasSubmission: !!submission,
      submissionId: submission?.id
    });

    if (challenge?.ai_correction_enabled && submission) {
      try {
        // Call AI review endpoint asynchronously (don't wait for it)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const aiReviewUrl = `${baseUrl}/api/ai-review`;
        console.log('Triggering AI review at:', aiReviewUrl);

        fetch(aiReviewUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submission.id }),
        })
          .then(res => res.json())
          .then(data => console.log('AI review response:', data))
          .catch(err => console.error('AI review trigger error:', err));
      } catch (err) {
        console.error('Failed to trigger AI review:', err);
      }
    } else {
      console.log('AI review NOT triggered - conditions not met');
    }

    return NextResponse.json({
      success: true,
      submission,
      ai_review_triggered: challenge?.ai_correction_enabled || false,
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

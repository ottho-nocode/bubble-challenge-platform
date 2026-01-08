import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Validating submission:', id);

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    console.log('User:', user.id);

    // Get the submission and check ownership
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, challenge_id, status, mux_playback_id, user_id')
      .eq('id', id)
      .single();

    console.log('Submission fetch:', { submission, fetchError });

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Soumission introuvable' }, { status: 404 });
    }

    // Check ownership
    if (submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'etes pas le proprietaire de cette soumission' }, { status: 403 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: `Cette soumission a deja ete validee (status: ${submission.status})` }, { status: 400 });
    }

    // Status stays 'pending' - AI review will change it to 'reviewed' when done
    console.log('Submission validated, triggering AI review...');

    // Trigger AI review if challenge has it enabled
    const { data: challenge } = await supabase
      .from('challenges')
      .select('ai_correction_enabled')
      .eq('id', submission.challenge_id)
      .single();

    if (challenge?.ai_correction_enabled) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/ai-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: id }),
        }).catch(err => console.error('AI review trigger error:', err));
      } catch (err) {
        console.error('Failed to trigger AI review:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error validating submission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

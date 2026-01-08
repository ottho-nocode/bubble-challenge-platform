import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching submission:', id);

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    console.log('User:', user.id);

    // First fetch without user_id filter to see what exists
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, mux_playback_id, mux_asset_id, status, created_at, duration, challenge_id, user_id')
      .eq('id', id)
      .single();

    console.log('Submission fetch result:', { submission, error });

    if (error || !submission) {
      return NextResponse.json({ error: 'Soumission introuvable (id: ' + id + ')' }, { status: 404 });
    }

    // Check ownership
    if (submission.user_id !== user.id) {
      console.log('Ownership mismatch:', { submissionUserId: submission.user_id, currentUserId: user.id });
      return NextResponse.json({ error: 'Cette soumission ne vous appartient pas' }, { status: 403 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Only allow deleting pending submissions
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: 'Impossible de supprimer cette soumission' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

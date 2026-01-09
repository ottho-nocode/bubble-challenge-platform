import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

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
    console.log('DELETE submission request:', id);

    // Use regular client for auth check
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('DELETE auth error:', authError);
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    console.log('DELETE user:', user.id);

    // Use service role client to bypass RLS for deletion
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // First, verify the submission exists and belongs to the user
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    console.log('DELETE fetch result:', { submission, fetchError });

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Soumission introuvable' }, { status: 404 });
    }

    if (submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Cette soumission ne vous appartient pas' }, { status: 403 });
    }

    // Delete associated reviews first (if any)
    const { error: reviewDeleteError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('submission_id', id);

    if (reviewDeleteError) {
      console.log('Error deleting reviews:', reviewDeleteError);
    }

    // Now delete the submission using admin client
    const { error: deleteError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('id', id);

    console.log('DELETE result:', { deleteError });

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Erreur lors de la suppression: ' + deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

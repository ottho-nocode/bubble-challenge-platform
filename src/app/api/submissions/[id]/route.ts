import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, mux_playback_id, mux_asset_id, status, created_at, duration, challenge_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Soumission introuvable' }, { status: 404 });
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

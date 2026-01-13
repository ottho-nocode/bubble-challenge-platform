import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Delete preview/reference video from a challenge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify user is admin using cookie-based auth
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Acces refuse - Admin uniquement' }, { status: 403 });
    }

    console.log('Admin deleting preview video for challenge:', id);

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Clear all video-related fields
    const { error } = await supabaseAdmin
      .from('challenges')
      .update({
        preview_video_playback_id: null,
        preview_video_asset_id: null,
        reference_video_playback_id: null,
        reference_video_asset_id: null,
        reference_video_duration: null,
        reference_video_url: null,
        reference_actions_json: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Delete preview error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Preview video deleted for challenge:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(
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

    // Parse request body
    const body = await request.json();

    console.log('Admin updating challenge:', id);
    console.log('Update data:', body);
    console.log('ai_correction_enabled:', body.ai_correction_enabled);

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Update challenge with service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('challenges')
      .update({
        title: body.title,
        description: body.description,
        time_limit: body.time_limit,
        difficulty: body.difficulty,
        category: body.category,
        points_base: body.points_base,
        criteria_design: body.criteria_design,
        criteria_functionality: body.criteria_functionality,
        criteria_completion: body.criteria_completion,
        result_image_url: body.result_image_url || null,
        resources: body.resources || null,
        is_active: body.is_active,
        ai_correction_enabled: body.ai_correction_enabled,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Update successful:', data);
    console.log('Saved ai_correction_enabled:', data.ai_correction_enabled);

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify user is admin
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Acces refuse - Admin uniquement' }, { status: 403 });
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .select('*, reference_video_url, reference_actions_json, preview_video_playback_id')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

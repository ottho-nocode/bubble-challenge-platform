import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a new challenge (admin only)
export async function POST(request: NextRequest) {
  try {
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

    console.log('Admin creating challenge:', body.title);

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create challenge with service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('challenges')
      .insert({
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
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Challenge created:', data.id);

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

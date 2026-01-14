import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Screenshot {
  t: number;
  data: string;
}

interface Action {
  t: number;
  type: string;
  text?: string;
  element?: string;
}

// Extract screenshots array from data (with timestamp)
function extractScreenshots(data: unknown, actions?: Action[]): Screenshot[] {
  if (!data || typeof data !== 'object') return [];
  const screenshots = (data as Record<string, unknown>).screenshots;
  if (!Array.isArray(screenshots)) return [];

  const result: Screenshot[] = [];

  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];

    if (typeof s === 'object' && s !== null && 'data' in s && 't' in s) {
      result.push(s as Screenshot);
    } else if (typeof s === 'string') {
      const timestamp = actions && actions[i] ? actions[i].t : i * 1000;
      result.push({ t: timestamp, data: s });
    }
  }

  return result;
}

// Extract actions array from data
function extractActions(data: unknown): Action[] {
  if (!data || typeof data !== 'object') return [];
  const actions = (data as Record<string, unknown>).actions;
  if (Array.isArray(actions)) {
    return actions.filter((a): a is Action =>
      typeof a === 'object' && a !== null && 'type' in a
    );
  }
  return [];
}

// Find screenshot closest to a given timestamp
function findScreenshotForAction(screenshots: Screenshot[], actionTime: number): Screenshot | null {
  if (screenshots.length === 0) return null;

  let closest = screenshots[0];
  let minDiff = Math.abs(screenshots[0].t - actionTime);

  for (const s of screenshots) {
    const diff = Math.abs(s.t - actionTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return closest;
}

// Prepare image data for Gemini Vision
function getImageData(screenshot: string) {
  const base64Match = screenshot.match(/^data:image\/(\w+);base64,(.+)$/);
  if (base64Match) {
    return {
      inlineData: {
        mimeType: `image/${base64Match[1]}`,
        data: base64Match[2],
      },
    };
  }
  return {
    inlineData: {
      mimeType: 'image/png',
      data: screenshot,
    },
  };
}

// Analyze reference to identify checkpoints
async function analyzeReference(
  refScreenshots: Screenshot[],
  refActions: Action[],
  challengeTitle: string,
  challengeDescription: string
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Select key screenshots (first, middle clicks, and last)
  const keyScreenshots: Screenshot[] = [];
  const refClickActions = refActions.filter(a => a.type === 'click');

  // Add screenshots for each click action
  for (const action of refClickActions.slice(0, 5)) {
    const screenshot = findScreenshotForAction(refScreenshots, action.t);
    if (screenshot && !keyScreenshots.includes(screenshot)) {
      keyScreenshots.push(screenshot);
    }
  }

  // Always include final screenshot
  if (refScreenshots.length > 0) {
    const lastScreenshot = refScreenshots[refScreenshots.length - 1];
    if (!keyScreenshots.includes(lastScreenshot)) {
      keyScreenshots.push(lastScreenshot);
    }
  }

  const prompt = `Tu es un expert Bubble.io. Analyse ces captures d'écran d'une solution de référence pour identifier les CHECKPOINTS (points de contrôle) que l'élève devra atteindre.

## DÉFI
**Titre:** ${challengeTitle}
**Description:** ${challengeDescription}

## INSTRUCTIONS
Examine les ${keyScreenshots.length} captures d'écran de la solution de référence et identifie:
1. Les éléments UI clés qui doivent être présents (boutons, textes, formulaires, etc.)
2. Les actions importantes effectuées (clics, ouvertures de popups/sheets, etc.)
3. Le résultat final attendu

## RÉPONSE ATTENDUE
Réponds UNIQUEMENT avec un JSON valide contenant un tableau de checkpoints:
["Checkpoint 1: description précise", "Checkpoint 2: description précise", ...]

Limite-toi à 5-7 checkpoints maximum, les plus importants.`;

  const content: (string | { text: string } | { inlineData: { mimeType: string; data: string } })[] = [prompt];

  for (let i = 0; i < keyScreenshots.length; i++) {
    content.push({ text: `\n\n=== Étape ${i + 1}/${keyScreenshots.length} ===` });
    content.push(getImageData(keyScreenshots[i].data));
  }

  console.log('Analyzing reference with', keyScreenshots.length, 'screenshots');

  try {
    const result = await model.generateContent(content);
    const text = result.response.text();

    console.log('Reference analysis raw:', text.substring(0, 300));

    // Extract JSON array
    let jsonStr = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const checkpoints = JSON.parse(jsonStr) as string[];
    console.log('Identified checkpoints:', checkpoints);
    return checkpoints;
  } catch (error) {
    console.error('Reference analysis error:', error);
    return ['Erreur lors de l\'analyse. Vérifiez que les captures d\'écran sont disponibles.'];
  }
}

export async function POST(
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

    // Fetch challenge with reference data
    const { data: challenge, error: fetchError } = await supabaseAdmin
      .from('challenges')
      .select('title, description, reference_actions_json')
      .eq('id', id)
      .single();

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Défi introuvable' }, { status: 404 });
    }

    if (!challenge.reference_actions_json) {
      return NextResponse.json({
        error: 'Aucune solution de référence enregistrée. Utilisez l\'extension Chrome pour enregistrer la solution.'
      }, { status: 400 });
    }

    const refData = typeof challenge.reference_actions_json === 'string'
      ? JSON.parse(challenge.reference_actions_json)
      : challenge.reference_actions_json;

    const refActions = extractActions(refData);
    const refScreenshots = extractScreenshots(refData, refActions);

    if (refScreenshots.length === 0) {
      return NextResponse.json({
        error: 'Aucune capture d\'écran dans la référence. Ré-enregistrez avec la dernière version de l\'extension.'
      }, { status: 400 });
    }

    // Analyze reference
    const checkpoints = await analyzeReference(
      refScreenshots,
      refActions,
      challenge.title,
      challenge.description
    );

    return NextResponse.json({
      success: true,
      checkpoints,
      stats: {
        screenshotsCount: refScreenshots.length,
        actionsCount: refActions.length,
      }
    });

  } catch (error) {
    console.error('Analyze reference error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

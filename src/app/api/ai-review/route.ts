import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ReviewResult {
  score_design: number;
  score_functionality: number;
  score_completion: number;
  comment: string;
}

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
// Supports both old format (string[]) and new format ({t, data}[])
function extractScreenshots(data: unknown, actions?: Action[]): Screenshot[] {
  if (!data || typeof data !== 'object') return [];
  const screenshots = (data as Record<string, unknown>).screenshots;
  if (!Array.isArray(screenshots)) return [];

  const result: Screenshot[] = [];

  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];

    if (typeof s === 'object' && s !== null && 'data' in s && 't' in s) {
      // New format: {t, data}
      result.push(s as Screenshot);
    } else if (typeof s === 'string') {
      // Old format: just base64 string
      // Try to match with action timestamp if available, otherwise use index-based timing
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

// Get the last screenshot (final result) from data
function getLastScreenshot(data: unknown): string | null {
  const screenshots = extractScreenshots(data);
  return screenshots.length > 0 ? screenshots[screenshots.length - 1].data : null;
}

// Find screenshot closest to a given timestamp
function findScreenshotForAction(screenshots: Screenshot[], actionTime: number): Screenshot | null {
  if (screenshots.length === 0) return null;

  // Find screenshot taken just after the action (closest match)
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
  // Remove data URI prefix if present
  const base64Match = screenshot.match(/^data:image\/(\w+);base64,(.+)$/);
  if (base64Match) {
    return {
      inlineData: {
        mimeType: `image/${base64Match[1]}`,
        data: base64Match[2],
      },
    };
  }
  // Assume it's already base64 without prefix
  return {
    inlineData: {
      mimeType: 'image/png',
      data: screenshot,
    },
  };
}

// STEP 1: Analyze reference to identify checkpoints
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

  console.log('Step 1: Analyzing reference with', keyScreenshots.length, 'screenshots');

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
    return ['Vérifier que le résultat final correspond à la référence'];
  }
}

// Direct comparison: send both reference and student screenshots to AI
async function compareDirectly(
  refScreenshots: Screenshot[],
  refActions: Action[],
  studentScreenshots: Screenshot[],
  studentActions: Action[],
  challengeTitle: string,
  challengeDescription: string,
  criteriaDesign: string,
  criteriaFunctionality: string,
  criteriaCompletion: string
): Promise<ReviewResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Select key reference screenshots (final + after clicks)
  const refKeyScreenshots: Screenshot[] = [];
  const refClickActions = refActions.filter(a => a.type === 'click');

  for (const action of refClickActions.slice(0, 3)) {
    const screenshot = findScreenshotForAction(refScreenshots, action.t);
    if (screenshot && !refKeyScreenshots.includes(screenshot)) {
      refKeyScreenshots.push(screenshot);
    }
  }
  if (refScreenshots.length > 0) {
    const lastRef = refScreenshots[refScreenshots.length - 1];
    if (!refKeyScreenshots.includes(lastRef)) {
      refKeyScreenshots.push(lastRef);
    }
  }

  // Select key student screenshots (final + after clicks)
  const studentKeyScreenshots: Screenshot[] = [];
  const studentClickActions = studentActions.filter(a => a.type === 'click');

  for (const action of studentClickActions.slice(0, 3)) {
    const screenshot = findScreenshotForAction(studentScreenshots, action.t);
    if (screenshot && !studentKeyScreenshots.includes(screenshot)) {
      studentKeyScreenshots.push(screenshot);
    }
  }
  if (studentScreenshots.length > 0) {
    const lastStudent = studentScreenshots[studentScreenshots.length - 1];
    if (!studentKeyScreenshots.includes(lastStudent)) {
      studentKeyScreenshots.push(lastStudent);
    }
  }

  const prompt = `Tu es un correcteur pour une plateforme d'apprentissage Bubble.io. Tu dois COMPARER OBJECTIVEMENT le travail d'un élève avec une solution de référence.

## DÉFI: ${challengeTitle}
${challengeDescription}

## MÉTHODE DE NOTATION
Tu vas recevoir des captures d'écran de la RÉFÉRENCE (solution correcte) puis des captures de l'ÉLÈVE.
Ta tâche est de vérifier si le résultat de l'élève CORRESPOND à la référence.

## CRITÈRES
- **Design (0-5):** ${criteriaDesign || 'Le résultat visuel correspond-il à la référence?'}
- **Fonctionnalités (0-5):** ${criteriaFunctionality || 'Les mêmes éléments/interactions sont-ils présents?'}
- **Réalisation (0-5):** ${criteriaCompletion || 'Le résultat final est-il identique ou équivalent?'}

## BARÈME OBJECTIF
- 5/5: Résultat IDENTIQUE ou quasi-identique à la référence
- 4/5: Résultat très proche, différences cosmétiques mineures (couleurs légèrement différentes, etc.)
- 3/5: Résultat similaire mais avec des différences notables
- 2/5: Résultat partiellement correct, éléments manquants
- 1/5: Résultat très différent de la référence
- 0/5: Rien de comparable à la référence

## IMPORTANT
- Ne fais PAS de jugements subjectifs sur la "qualité" du design
- Compare UNIQUEMENT avec la référence fournie
- Si l'élève a fait exactement la même chose que la référence = 5/5
- Les captures de l'élève sont prises à des moments similaires (après chaque clic)

## RÉPONSE
Réponds UNIQUEMENT avec un JSON valide:
{"score_design": X, "score_functionality": X, "score_completion": X, "comment": "Comparaison objective en 2-3 phrases. Indique ce qui correspond ✓ et ce qui diffère ✗ par rapport à la référence."}`;

  const content: (string | { text: string } | { inlineData: { mimeType: string; data: string } })[] = [prompt];

  // Add reference screenshots
  content.push({ text: `\n\n========== RÉFÉRENCE (${refKeyScreenshots.length} captures) ==========` });
  for (let i = 0; i < refKeyScreenshots.length; i++) {
    content.push({ text: `\n--- Référence ${i + 1}/${refKeyScreenshots.length} ---` });
    content.push(getImageData(refKeyScreenshots[i].data));
  }

  // Add student screenshots
  content.push({ text: `\n\n========== TRAVAIL DE L'ÉLÈVE (${studentKeyScreenshots.length} captures) ==========` });
  for (let i = 0; i < studentKeyScreenshots.length; i++) {
    content.push({ text: `\n--- Élève ${i + 1}/${studentKeyScreenshots.length} ---` });
    content.push(getImageData(studentKeyScreenshots[i].data));
  }

  console.log('Direct comparison:', refKeyScreenshots.length, 'ref screenshots vs', studentKeyScreenshots.length, 'student screenshots');

  try {
    const result = await model.generateContent(content);
    const text = result.response.text();

    console.log('Comparison result raw:', text.substring(0, 500));

    // Extract JSON
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }

    const reviewResult = JSON.parse(jsonStr) as ReviewResult;

    return {
      score_design: Math.max(0, Math.min(5, Math.round(reviewResult.score_design))),
      score_functionality: Math.max(0, Math.min(5, Math.round(reviewResult.score_functionality))),
      score_completion: Math.max(0, Math.min(5, Math.round(reviewResult.score_completion))),
      comment: reviewResult.comment || 'Évaluation automatique par IA.',
    };
  } catch (error) {
    console.error('Comparison error:', error);
    return {
      score_design: 3,
      score_functionality: 3,
      score_completion: 3,
      comment: 'Évaluation automatique - l\'IA n\'a pas pu analyser complètement cette soumission.',
    };
  }
}

async function compareScreenshots(
  referenceData: unknown,
  studentData: unknown,
  challengeTitle: string,
  challengeDescription: string,
  criteriaDesign: string,
  criteriaFunctionality: string,
  criteriaCompletion: string
): Promise<ReviewResult> {
  // Extract actions first (needed for timestamp matching in old format screenshots)
  const refActions = extractActions(referenceData);
  const studentActions = extractActions(studentData);

  // Extract screenshots (supports both old and new format)
  const refScreenshots = extractScreenshots(referenceData, refActions);
  const studentScreenshots = extractScreenshots(studentData, studentActions);

  console.log('AI Review - Data:', {
    referenceScreenshotsCount: refScreenshots.length,
    studentScreenshotsCount: studentScreenshots.length,
    referenceActionsCount: refActions.length,
    studentActionsCount: studentActions.length,
  });

  // If no screenshots available, return default scores
  if (refScreenshots.length === 0 || studentScreenshots.length === 0) {
    console.log('Missing screenshots for comparison');
    return {
      score_design: 3,
      score_functionality: 3,
      score_completion: 3,
      comment: 'Évaluation automatique - captures d\'écran insuffisantes pour une analyse complète.',
    };
  }

  // Direct comparison: send both reference and student screenshots to AI
  const reviewResult = await compareDirectly(
    refScreenshots,
    refActions,
    studentScreenshots,
    studentActions,
    challengeTitle,
    challengeDescription,
    criteriaDesign,
    criteriaFunctionality,
    criteriaCompletion
  );

  return reviewResult;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { submission_id } = await request.json();

    if (!submission_id) {
      return NextResponse.json(
        { error: 'submission_id requis' },
        { status: 400 }
      );
    }

    // Fetch submission with challenge details
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select(`
        *,
        challenges (
          id,
          title,
          description,
          criteria_design,
          criteria_functionality,
          criteria_completion,
          ai_correction_enabled,
          reference_actions_json
        )
      `)
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      console.error('Fetch submission error:', fetchError);
      return NextResponse.json(
        { error: 'Soumission introuvable' },
        { status: 404 }
      );
    }

    // Check if AI correction is enabled for this challenge
    if (!submission.challenges?.ai_correction_enabled) {
      return NextResponse.json(
        { error: 'La correction IA n\'est pas activée pour ce défi' },
        { status: 400 }
      );
    }

    // Check if reference actions exist
    if (!submission.challenges?.reference_actions_json) {
      return NextResponse.json(
        { error: 'Aucune solution de référence n\'a été enregistrée pour ce défi. L\'admin doit d\'abord enregistrer la solution avec l\'extension Chrome.' },
        { status: 400 }
      );
    }

    // Check if student has actions
    if (!submission.actions_json) {
      return NextResponse.json(
        { error: 'Aucune action enregistrée dans cette soumission' },
        { status: 400 }
      );
    }

    // Check if already reviewed
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('submission_id', submission_id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'Cette soumission a déjà été corrigée' },
        { status: 400 }
      );
    }

    // Compare screenshots with AI Vision
    const reviewResult = await compareScreenshots(
      submission.challenges.reference_actions_json,
      submission.actions_json,
      submission.challenges.title,
      submission.challenges.description,
      submission.challenges.criteria_design,
      submission.challenges.criteria_functionality,
      submission.challenges.criteria_completion
    );

    // Create AI review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        submission_id: submission_id,
        reviewer_id: submission.user_id,
        score_design: reviewResult.score_design,
        score_functionality: reviewResult.score_functionality,
        score_completion: reviewResult.score_completion,
        comment: `🤖 ${reviewResult.comment}`,
        is_ai_review: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert review error:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'évaluation' },
        { status: 500 }
      );
    }

    // Update submission status
    await supabase
      .from('submissions')
      .update({ status: 'reviewed' })
      .eq('id', submission_id);

    return NextResponse.json({
      success: true,
      review,
    });

  } catch (error) {
    console.error('AI Review API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Endpoint to trigger AI review for a specific submission (admin only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get('submission_id');

  if (!submissionId) {
    return NextResponse.json(
      { error: 'submission_id requis' },
      { status: 400 }
    );
  }

  // Redirect to POST handler
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ submission_id: submissionId }),
    headers: { 'Content-Type': 'application/json' },
  }));
}

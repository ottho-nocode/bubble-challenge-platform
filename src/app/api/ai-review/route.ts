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

// STEP 2: Evaluate student work against checkpoints
async function evaluateStudent(
  studentScreenshots: Screenshot[],
  studentActions: Action[],
  checkpoints: string[],
  challengeTitle: string,
  criteriaDesign: string,
  criteriaFunctionality: string,
  criteriaCompletion: string
): Promise<ReviewResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Select key student screenshots
  const keyScreenshots: Screenshot[] = [];
  const studentClickActions = studentActions.filter(a => a.type === 'click');

  for (const action of studentClickActions.slice(0, 8)) {
    const screenshot = findScreenshotForAction(studentScreenshots, action.t);
    if (screenshot && !keyScreenshots.includes(screenshot)) {
      keyScreenshots.push(screenshot);
    }
  }

  // Always include final screenshot
  if (studentScreenshots.length > 0) {
    const lastScreenshot = studentScreenshots[studentScreenshots.length - 1];
    if (!keyScreenshots.includes(lastScreenshot)) {
      keyScreenshots.push(lastScreenshot);
    }
  }

  const checkpointsList = checkpoints.map((c, i) => `${i + 1}. ${c}`).join('\n');

  const prompt = `Tu es un correcteur expert pour une plateforme d'apprentissage Bubble.io.

## DÉFI: ${challengeTitle}

## CHECKPOINTS À VÉRIFIER
Voici les points de contrôle identifiés dans la solution de référence:
${checkpointsList}

## CRITÈRES D'ÉVALUATION
- **Design (0-5):** ${criteriaDesign || 'Respect du design attendu'}
- **Fonctionnalités (0-5):** ${criteriaFunctionality || 'Présence des éléments interactifs'}
- **Réalisation (0-5):** ${criteriaCompletion || 'Complétude du résultat'}

## TRAVAIL DE L'ÉLÈVE
Tu vas recevoir ${keyScreenshots.length} captures d'écran du travail de l'élève.
Pour chaque checkpoint, vérifie s'il est atteint ou non.

## BARÈME
- 5/5: Tous les checkpoints atteints parfaitement
- 4/5: Presque tous les checkpoints atteints, différences mineures
- 3/5: La majorité des checkpoints atteints
- 2/5: Seulement quelques checkpoints atteints
- 1/5: Très peu de checkpoints atteints
- 0/5: Aucun checkpoint atteint

## RÉPONSE ATTENDUE
Réponds UNIQUEMENT avec un JSON valide (sans markdown):
{"score_design": X, "score_functionality": X, "score_completion": X, "comment": "Commentaire constructif en français (3-4 phrases). Liste les checkpoints atteints ✓ et ceux manqués ✗."}`;

  const content: (string | { text: string } | { inlineData: { mimeType: string; data: string } })[] = [prompt];

  for (let i = 0; i < keyScreenshots.length; i++) {
    content.push({ text: `\n\n=== Capture ${i + 1}/${keyScreenshots.length} ===` });
    content.push(getImageData(keyScreenshots[i].data));
  }

  console.log('Step 2: Evaluating student with', keyScreenshots.length, 'screenshots against', checkpoints.length, 'checkpoints');

  try {
    const result = await model.generateContent(content);
    const text = result.response.text();

    console.log('Student evaluation raw:', text.substring(0, 500));

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
    console.error('Student evaluation error:', error);
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

  // STEP 1: Analyze reference to identify checkpoints
  const checkpoints = await analyzeReference(
    refScreenshots,
    refActions,
    challengeTitle,
    challengeDescription
  );

  // STEP 2: Evaluate student against checkpoints
  const reviewResult = await evaluateStudent(
    studentScreenshots,
    studentActions,
    checkpoints,
    challengeTitle,
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

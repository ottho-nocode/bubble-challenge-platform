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
function extractScreenshots(data: unknown): Screenshot[] {
  if (!data || typeof data !== 'object') return [];
  const screenshots = (data as Record<string, unknown>).screenshots;
  if (Array.isArray(screenshots)) {
    return screenshots.filter((s): s is Screenshot =>
      typeof s === 'object' && s !== null && 'data' in s && 't' in s
    );
  }
  return [];
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

async function compareScreenshots(
  referenceData: unknown,
  studentData: unknown,
  challengeTitle: string,
  challengeDescription: string,
  criteriaDesign: string,
  criteriaFunctionality: string,
  criteriaCompletion: string
): Promise<ReviewResult> {
  const refScreenshots = extractScreenshots(referenceData);
  const studentScreenshots = extractScreenshots(studentData);
  const refActions = extractActions(referenceData);
  const studentActions = extractActions(studentData);

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

  // Select key screenshots to compare:
  // - First screenshot (starting point)
  // - Screenshots at key actions (clicks)
  // - Last screenshot (final result)
  const keyRefScreenshots: { label: string; screenshot: Screenshot }[] = [];
  const keyStudentScreenshots: { label: string; screenshot: Screenshot }[] = [];

  // Add first screenshot
  keyRefScreenshots.push({ label: 'Début', screenshot: refScreenshots[0] });
  keyStudentScreenshots.push({ label: 'Début', screenshot: studentScreenshots[0] });

  // Add screenshots for click actions (up to 3 key actions)
  const refClickActions = refActions.filter(a => a.type === 'click').slice(0, 3);
  refClickActions.forEach((action, i) => {
    const screenshot = findScreenshotForAction(refScreenshots, action.t);
    if (screenshot) {
      keyRefScreenshots.push({ label: `Action ${i + 1}`, screenshot });
    }
  });

  const studentClickActions = studentActions.filter(a => a.type === 'click').slice(0, 3);
  studentClickActions.forEach((action, i) => {
    const screenshot = findScreenshotForAction(studentScreenshots, action.t);
    if (screenshot) {
      keyStudentScreenshots.push({ label: `Action ${i + 1}`, screenshot });
    }
  });

  // Add last screenshot (final result)
  keyRefScreenshots.push({ label: 'Résultat final', screenshot: refScreenshots[refScreenshots.length - 1] });
  keyStudentScreenshots.push({ label: 'Résultat final', screenshot: studentScreenshots[studentScreenshots.length - 1] });

  // Build comparison pairs (match by index/label)
  const comparisonCount = Math.min(keyRefScreenshots.length, keyStudentScreenshots.length, 4);

  console.log('AI Review - Comparing', comparisonCount, 'screenshot pairs');

  const prompt = `Tu es un correcteur expert pour une plateforme d'apprentissage Bubble.io. Tu dois évaluer le travail de l'élève en comparant ses captures d'écran étape par étape avec la référence attendue.

## DÉFI
**Titre:** ${challengeTitle}
**Description:** ${challengeDescription}

## CRITÈRES D'ÉVALUATION
- **Design (0-5):** ${criteriaDesign || 'Respect du design attendu'}
- **Fonctionnalités (0-5):** ${criteriaFunctionality || 'Présence des éléments interactifs'}
- **Réalisation (0-5):** ${criteriaCompletion || 'Complétude du résultat'}

## IMAGES À COMPARER
Tu vas recevoir ${comparisonCount} paires d'images montrant l'évolution du travail:
- Chaque paire contient: RÉFÉRENCE (attendu) puis ÉLÈVE (obtenu)
- Analyse les différences à chaque étape

## POINTS À ÉVALUER
1. **Design**: Les éléments visuels sont-ils similaires? (couleurs, disposition, typographie)
2. **Fonctionnalités**: L'élève a-t-il effectué les bonnes actions? Les bons éléments sont-ils présents?
3. **Réalisation**: Le workflow suivi correspond-il à la référence? Le résultat final est-il correct?

## BARÈME
- 5/5: Parfait, identique à la référence
- 4/5: Très bien, quelques différences mineures
- 3/5: Bien, l'essentiel est présent mais des éléments manquent
- 2/5: Partiel, plusieurs différences notables
- 1/5: Insuffisant, peu de ressemblance
- 0/5: Non réalisé ou complètement différent

## RÉPONSE ATTENDUE
Réponds UNIQUEMENT avec un JSON valide (sans markdown):
{"score_design": X, "score_functionality": X, "score_completion": X, "comment": "Commentaire constructif détaillé en français (3-4 phrases). Mentionne les étapes bien réalisées ET les points à améliorer."}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build content array with all comparison pairs
    const content: (string | { text: string } | { inlineData: { mimeType: string; data: string } })[] = [prompt];

    for (let i = 0; i < comparisonCount; i++) {
      const refItem = keyRefScreenshots[i];
      const studentItem = keyStudentScreenshots[i];

      content.push({ text: `\n\n=== ÉTAPE: ${refItem.label} ===` });
      content.push({ text: `\n--- RÉFÉRENCE (${refItem.label}) ---` });
      content.push(getImageData(refItem.screenshot.data));
      content.push({ text: `\n--- ÉLÈVE (${studentItem.label}) ---` });
      content.push(getImageData(studentItem.screenshot.data));
    }

    console.log('Sending vision prompt to Gemini with', comparisonCount * 2, 'images');

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini raw response:', text.substring(0, 500));

    // Extract JSON from response
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
    console.error('Gemini vision analysis error:', error);
    return {
      score_design: 3,
      score_functionality: 3,
      score_completion: 3,
      comment: 'Évaluation automatique - l\'IA n\'a pas pu analyser complètement cette soumission.',
    };
  }
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

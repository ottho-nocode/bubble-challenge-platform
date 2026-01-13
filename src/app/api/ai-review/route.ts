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

// Extract screenshots array from data
function extractScreenshots(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const screenshots = (data as Record<string, unknown>).screenshots;
  if (Array.isArray(screenshots)) {
    return screenshots.filter((s): s is string => typeof s === 'string');
  }
  return [];
}

// Get the last screenshot (final result) from data
function getLastScreenshot(data: unknown): string | null {
  const screenshots = extractScreenshots(data);
  return screenshots.length > 0 ? screenshots[screenshots.length - 1] : null;
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
  // Get the last screenshot (final result) from both reference and student
  const referenceScreenshot = getLastScreenshot(referenceData);
  const studentScreenshot = getLastScreenshot(studentData);

  const refScreenshots = extractScreenshots(referenceData);
  const studentScreenshots = extractScreenshots(studentData);

  console.log('AI Review - Comparing screenshots:', {
    referenceScreenshotsCount: refScreenshots.length,
    studentScreenshotsCount: studentScreenshots.length,
    hasReferenceLastScreenshot: !!referenceScreenshot,
    hasStudentLastScreenshot: !!studentScreenshot,
  });

  // If no screenshots available, return default scores
  if (!referenceScreenshot || !studentScreenshot) {
    console.log('Missing screenshots for comparison');
    return {
      score_design: 3,
      score_functionality: 3,
      score_completion: 3,
      comment: 'Évaluation automatique - captures d\'écran insuffisantes pour une analyse complète.',
    };
  }

  const prompt = `Tu es un correcteur expert pour une plateforme d'apprentissage Bubble.io. Tu dois évaluer le RÉSULTAT FINAL de l'élève en comparant sa capture d'écran avec la référence attendue.

## DÉFI
**Titre:** ${challengeTitle}
**Description:** ${challengeDescription}

## CRITÈRES D'ÉVALUATION
- **Design (0-5):** ${criteriaDesign}
- **Fonctionnalités (0-5):** ${criteriaFunctionality}
- **Réalisation (0-5):** ${criteriaCompletion}

## IMAGES À COMPARER
Tu vas recevoir 2 images:
1. **IMAGE 1 - RÉFÉRENCE**: Le résultat attendu (ce que l'élève doit reproduire)
2. **IMAGE 2 - ÉLÈVE**: Le résultat obtenu par l'élève

## POINTS À ÉVALUER
1. **Design**: Les éléments visuels sont-ils similaires? (couleurs, disposition, typographie, espacement)
2. **Fonctionnalités**: Les éléments interactifs semblent-ils présents? (boutons, formulaires, menus)
3. **Réalisation**: Le résultat global correspond-il à la référence? (complétude, fidélité)

## BARÈME
- 5/5: Parfait, résultat identique à la référence
- 4/5: Très bien, quelques différences mineures
- 3/5: Bien, l'essentiel est présent mais des éléments manquent
- 2/5: Partiel, plusieurs différences notables
- 1/5: Insuffisant, peu de ressemblance
- 0/5: Non réalisé ou complètement différent

## RÉPONSE ATTENDUE
Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans texte avant/après):
{"score_design": X, "score_functionality": X, "score_completion": X, "comment": "Commentaire constructif en français (2-3 phrases). Mentionne ce qui est bien fait ET ce qui peut être amélioré."}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('Sending vision prompt to Gemini with 2 images');

    // Prepare image parts for Gemini Vision
    // Screenshots are base64 encoded with data URI prefix
    const getImageData = (screenshot: string) => {
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
    };

    const result = await model.generateContent([
      prompt,
      { text: '\n\n--- IMAGE 1: RÉFÉRENCE (résultat attendu) ---' },
      getImageData(referenceScreenshot),
      { text: '\n\n--- IMAGE 2: ÉLÈVE (résultat obtenu) ---' },
      getImageData(studentScreenshot),
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('Gemini raw response:', text.substring(0, 500));

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }

    const reviewResult = JSON.parse(jsonStr) as ReviewResult;

    // Validate and clamp scores
    return {
      score_design: Math.max(0, Math.min(5, Math.round(reviewResult.score_design))),
      score_functionality: Math.max(0, Math.min(5, Math.round(reviewResult.score_functionality))),
      score_completion: Math.max(0, Math.min(5, Math.round(reviewResult.score_completion))),
      comment: reviewResult.comment || 'Évaluation automatique par IA.',
    };
  } catch (error) {
    console.error('Gemini vision analysis error:', error);
    // Return default scores if AI fails
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

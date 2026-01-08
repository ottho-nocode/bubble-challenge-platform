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

// Extract actions array from new format (handles both old and new format)
function extractActions(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data; // Old format: direct array
  if (typeof data === 'object' && 'actions' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).actions as unknown[] || [];
  }
  return [];
}

// Get screenshot count for context
function getScreenshotCount(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  const screenshots = (data as Record<string, unknown>).screenshots;
  return Array.isArray(screenshots) ? screenshots.length : 0;
}

async function compareActions(
  referenceData: unknown,
  studentData: unknown,
  challengeTitle: string,
  challengeDescription: string,
  criteriaDesign: string,
  criteriaFunctionality: string,
  criteriaCompletion: string
): Promise<ReviewResult> {
  // Extract just the actions (not screenshots - too large)
  const referenceActions = extractActions(referenceData);
  const studentActions = extractActions(studentData);
  const refScreenshots = getScreenshotCount(referenceData);
  const studentScreenshots = getScreenshotCount(studentData);

  console.log('AI Review - Comparing:', {
    referenceActionsCount: referenceActions.length,
    studentActionsCount: studentActions.length,
    refScreenshots,
    studentScreenshots
  });

  // Log actions for debugging
  console.log('=== AI REVIEW DEBUG ===');
  console.log('Reference actions count:', referenceActions.length);
  console.log('Student actions count:', studentActions.length);
  console.log('Reference actions (first 5):', JSON.stringify(referenceActions.slice(0, 5), null, 2));
  console.log('Student actions (first 5):', JSON.stringify(studentActions.slice(0, 5), null, 2));

  // Summarize actions for clearer analysis
  const summarizeActions = (actions: unknown[]) => {
    return actions.map((action: unknown, index: number) => {
      const a = action as Record<string, unknown>;
      const summary: Record<string, unknown> = {
        step: index + 1,
        type: a.type,
        time: `${Math.round((a.t as number || 0) / 1000)}s`
      };

      if (a.type === 'click') {
        summary.what = a.text || a.element || 'élément';
        if (a.context) summary.where = a.context;
        if (a.role) summary.role = a.role;
      } else if (a.type === 'input') {
        summary.field = a.label || a.element || 'champ';
        summary.value = a.value;
        if (a.context) summary.where = a.context;
      } else if (a.type === 'drag') {
        summary.what = a.text || a.element || 'élément';
        summary.from = `(${a.x1}, ${a.y1})`;
        summary.to = `(${a.x2}, ${a.y2})`;
      } else if (a.type === 'navigate') {
        summary.url = a.url;
      } else if (a.type === 'keypress') {
        summary.key = a.key;
      }

      return summary;
    });
  };

  const refSummary = summarizeActions(referenceActions);
  const studentSummary = summarizeActions(studentActions);

  console.log('Reference summary (first 5):', JSON.stringify(refSummary.slice(0, 5), null, 2));
  console.log('Student summary (first 5):', JSON.stringify(studentSummary.slice(0, 5), null, 2));
  console.log('=== END DEBUG ===');

  const prompt = `Tu es un correcteur expert pour une plateforme d'apprentissage Bubble.io. Tu dois évaluer la soumission d'un élève en comparant ses actions avec la solution de référence.

## DÉFI
**Titre:** ${challengeTitle}
**Description:** ${challengeDescription}

## CRITÈRES D'ÉVALUATION
- **Design (0-5):** ${criteriaDesign}
- **Fonctionnalités (0-5):** ${criteriaFunctionality}
- **Réalisation (0-5):** ${criteriaCompletion}

## STATISTIQUES
| | Référence | Élève |
|---|---|---|
| Actions | ${referenceActions.length} | ${studentActions.length} |
| Captures | ${refScreenshots} | ${studentScreenshots} |

## ACTIONS DE RÉFÉRENCE (ce que l'élève doit faire)
\`\`\`json
${JSON.stringify(refSummary, null, 2)}
\`\`\`

## ACTIONS DE L'ÉLÈVE (ce qu'il a fait)
\`\`\`json
${JSON.stringify(studentSummary, null, 2)}
\`\`\`

## GUIDE D'ANALYSE
Chaque action contient:
- **type**: click, input, drag, navigate, keypress, scroll
- **what/text**: le texte visible de l'élément cliqué (ex: "Enregistrer", "Design", "Ajouter")
- **where/context**: la section/panneau où se trouve l'élément (ex: "Properties > Appearance")
- **field/label**: pour les inputs, le nom du champ
- **value**: la valeur saisie

## POINTS À ÉVALUER
1. **Correspondance des actions clés**: L'élève a-t-il cliqué sur les mêmes éléments que la référence (boutons, onglets, options)?
2. **Séquence logique**: Les actions sont-elles dans un ordre cohérent?
3. **Valeurs saisies**: Les inputs sont-ils corrects (couleurs, textes, dimensions)?
4. **Actions manquantes**: Y a-t-il des étapes essentielles non réalisées?
5. **Actions superflues**: L'élève a-t-il fait beaucoup d'essais-erreurs?

## BARÈME
- 5/5: Parfait, toutes les étapes sont correctes
- 4/5: Très bien, quelques petites différences mineures
- 3/5: Bien, l'essentiel est fait mais il manque des détails
- 2/5: Partiel, plusieurs étapes manquantes ou incorrectes
- 1/5: Insuffisant, peu d'étapes correctes
- 0/5: Non réalisé ou complètement hors sujet

## RÉPONSE ATTENDUE
Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans texte avant/après):
{"score_design": X, "score_functionality": X, "score_completion": X, "comment": "Commentaire constructif en français (2-3 phrases). Mentionne ce qui a été bien fait ET ce qui peut être amélioré."}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('Sending prompt to Gemini (length:', prompt.length, 'chars)');

    const result = await model.generateContent(prompt);
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
    console.error('Gemini analysis error:', error);
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

    // Compare actions with AI
    const reviewResult = await compareActions(
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

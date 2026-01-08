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

async function analyzeSubmission(
  videoUrl: string,
  challengeTitle: string,
  challengeDescription: string,
  criteriaDesign: string,
  criteriaFunctionality: string,
  criteriaCompletion: string
): Promise<ReviewResult> {
  const prompt = `Tu es un correcteur expert pour une plateforme d'apprentissage Bubble.io. Tu dois évaluer une soumission vidéo d'un élève.

DÉFI: ${challengeTitle}
DESCRIPTION: ${challengeDescription}

CRITÈRES D'ÉVALUATION:
1. Design (0-5): ${criteriaDesign}
2. Fonctionnalités (0-5): ${criteriaFunctionality}
3. Réalisation (0-5): ${criteriaCompletion}

URL de la vidéo de la soumission: ${videoUrl}

Analyse cette soumission et fournis:
1. Un score de 0 à 5 pour chaque critère (0 = non réalisé, 5 = parfait)
2. Un commentaire constructif et bienveillant en français (2-3 phrases max)

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide dans ce format exact, sans aucun texte avant ou après:
{
  "score_design": <number 0-5>,
  "score_functionality": <number 0-5>,
  "score_completion": <number 0-5>,
  "comment": "<string>"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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
          ai_correction_enabled
        )
      `)
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
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

    // Analyze with AI
    const reviewResult = await analyzeSubmission(
      submission.video_url || '',
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

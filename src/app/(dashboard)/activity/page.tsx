import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils/date';

type ActivityItem = {
  id: string;
  type: 'submission' | 'review_given' | 'review_received';
  title: string;
  description: string;
  points: number | null;
  created_at: string;
  challenge_title?: string;
  reviewer_name?: string;
};

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all activity data in parallel
  const [submissionsResult, reviewsGivenResult, reviewsReceivedResult] = await Promise.all([
    // User's submissions
    supabase
      .from('submissions')
      .select(`
        id,
        created_at,
        status,
        challenges (title)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Reviews given by user
    supabase
      .from('reviews')
      .select(`
        id,
        created_at,
        score_design,
        score_functionality,
        score_completion,
        submissions (
          challenges (title),
          profiles (username)
        )
      `)
      .eq('reviewer_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Reviews received by user
    supabase
      .from('reviews')
      .select(`
        id,
        created_at,
        score_design,
        score_functionality,
        score_completion,
        is_ai_review,
        submissions!inner (
          user_id,
          challenges (title)
        ),
        profiles:reviewer_id (username)
      `)
      .eq('submissions.user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Build activity list
  const activities: ActivityItem[] = [];

  // Add submissions
  submissionsResult.data?.forEach((sub) => {
    const challenge = Array.isArray(sub.challenges) ? sub.challenges[0] : sub.challenges;
    activities.push({
      id: `sub-${sub.id}`,
      type: 'submission',
      title: 'Défi soumis',
      description: challenge?.title || 'Défi inconnu',
      points: null,
      created_at: sub.created_at,
      challenge_title: challenge?.title,
    });
  });

  // Add reviews given
  reviewsGivenResult.data?.forEach((review) => {
    const submission = Array.isArray(review.submissions) ? review.submissions[0] : review.submissions;
    const challenge = (submission as { challenges?: { title?: string } | { title?: string }[] })?.challenges;
    const challengeTitle = Array.isArray(challenge) ? challenge[0]?.title : challenge?.title;
    const profile = (submission as { profiles?: { username?: string } | { username?: string }[] })?.profiles;
    const username = Array.isArray(profile) ? profile[0]?.username : profile?.username;

    activities.push({
      id: `review-given-${review.id}`,
      type: 'review_given',
      title: 'Correction effectuée',
      description: `${challengeTitle || 'Défi'} de ${username || 'un élève'}`,
      points: 5,
      created_at: review.created_at,
      challenge_title: challengeTitle,
    });
  });

  // Add reviews received
  reviewsReceivedResult.data?.forEach((review) => {
    const submission = Array.isArray(review.submissions) ? review.submissions[0] : review.submissions;
    const challenge = (submission as { challenges?: { title?: string } | { title?: string }[] })?.challenges;
    const challengeTitle = Array.isArray(challenge) ? challenge[0]?.title : challenge?.title;
    const reviewerProfile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles as { username?: string } | null;
    const totalScore = review.score_design + review.score_functionality + review.score_completion;

    activities.push({
      id: `review-received-${review.id}`,
      type: 'review_received',
      title: review.is_ai_review ? 'Correction IA reçue' : 'Correction reçue',
      description: challengeTitle || 'Défi',
      points: totalScore,
      created_at: review.created_at,
      challenge_title: challengeTitle,
      reviewer_name: review.is_ai_review ? 'IA' : reviewerProfile?.username,
    });
  });

  // Sort by date descending
  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const activityIcons = {
    submission: { bg: 'bg-[#4a90d9]', icon: '📤' },
    review_given: { bg: 'bg-[#22c55e]', icon: '✅' },
    review_received: { bg: 'bg-[#f0b100]', icon: '⭐' },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[#6a7282] hover:text-[#101828] mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>
        <h1 className="text-3xl font-bold text-[#101828]">Historique d&apos;activité</h1>
        <p className="text-[#6a7282] mt-1">Toutes vos actions sur la plateforme</p>
      </div>

      <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
        {activities.length > 0 ? (
          <div className="divide-y divide-[#e5e7eb]">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 flex items-start gap-4">
                <div className={`w-10 h-10 ${activityIcons[activity.type].bg} rounded-full flex items-center justify-center text-white text-lg shrink-0`}>
                  {activityIcons[activity.type].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#101828]">{activity.title}</p>
                      <p className="text-sm text-[#6a7282] mt-0.5">{activity.description}</p>
                      {activity.reviewer_name && (
                        <p className="text-xs text-[#9ca3af] mt-1">
                          Par {activity.reviewer_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#9ca3af]">{formatDateTime(activity.created_at)}</p>
                      {activity.points !== null && (
                        <p className="text-sm font-semibold text-[#22c55e] mt-1">
                          +{activity.points} pts
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#f3f4f6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#101828] mb-2">Aucune activité</h3>
            <p className="text-[#6a7282] mb-6">
              Commencez par soumettre un défi pour voir votre historique.
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors"
            >
              Voir les défis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import crypto from 'crypto';

type ActivityItem = {
  id: string;
  type: 'submission' | 'review_given' | 'review_received';
  title: string;
  description: string;
  points: number | null;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Parallelize all queries
  const [
    profileResult,
    pendingReviewsResult,
    challengesResult,
    recentSubmissionsResult,
    recentReviewsGivenResult,
    recentReviewsReceivedResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user?.id).single(),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending').neq('user_id', user?.id),
    supabase.from('challenges').select('*').eq('is_active', true).limit(1),
    // Recent submissions
    supabase
      .from('submissions')
      .select('id, created_at, challenges (title)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(3),
    // Recent reviews given
    supabase
      .from('reviews')
      .select('id, created_at, submissions (challenges (title))')
      .eq('reviewer_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(3),
    // Recent reviews received
    supabase
      .from('reviews')
      .select('id, created_at, score_design, score_functionality, score_completion, is_ai_review, submissions!inner (user_id, challenges (title))')
      .eq('submissions.user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const profile = profileResult.data;
  const pendingReviews = pendingReviewsResult.count;
  const recommendedChallenge = challengesResult.data?.[0];

  // Build recent activity
  const activities: ActivityItem[] = [];

  recentSubmissionsResult.data?.forEach((sub) => {
    const challenge = Array.isArray(sub.challenges) ? sub.challenges[0] : sub.challenges;
    activities.push({
      id: `sub-${sub.id}`,
      type: 'submission',
      title: 'Défi soumis',
      description: challenge?.title || 'Défi',
      points: null,
      created_at: sub.created_at,
    });
  });

  recentReviewsGivenResult.data?.forEach((review) => {
    const submission = Array.isArray(review.submissions) ? review.submissions[0] : review.submissions;
    const challenge = (submission as { challenges?: { title?: string } | { title?: string }[] })?.challenges;
    const challengeTitle = Array.isArray(challenge) ? challenge[0]?.title : challenge?.title;
    activities.push({
      id: `review-given-${review.id}`,
      type: 'review_given',
      title: 'Correction effectuée',
      description: challengeTitle || 'Défi',
      points: 5,
      created_at: review.created_at,
    });
  });

  recentReviewsReceivedResult.data?.forEach((review) => {
    const submission = Array.isArray(review.submissions) ? review.submissions[0] : review.submissions;
    const challenge = (submission as { challenges?: { title?: string } | { title?: string }[] })?.challenges;
    const challengeTitle = Array.isArray(challenge) ? challenge[0]?.title : challenge?.title;
    const totalScore = review.score_design + review.score_functionality + review.score_completion;
    activities.push({
      id: `review-received-${review.id}`,
      type: 'review_received',
      title: review.is_ai_review ? 'Correction IA' : 'Correction reçue',
      description: challengeTitle || 'Défi',
      points: totalScore,
      created_at: review.created_at,
    });
  });

  // Sort by date and take top 5
  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentActivities = activities.slice(0, 5);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}j`;
  };

  const activityColors = {
    submission: 'bg-[#4a90d9]',
    review_given: 'bg-[#22c55e]',
    review_received: 'bg-[#f0b100]',
  };

  // Generate gravatar URL from email
  const emailHash = user?.email
    ? crypto.createHash('md5').update(user.email.toLowerCase().trim()).digest('hex')
    : '';
  const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=80`;

  // Get first name from username (before any space or use full username)
  const firstName = profile?.username?.split(' ')[0] || profile?.username || 'Utilisateur';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#101828]">
            Bonjour, {firstName}
          </h1>
          <p className="text-[#6a7282] mt-1">
            Voici un aperçu de votre progression sur Bubble.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#101828]">{profile?.username || 'Utilisateur'}</span>
          <img
            src={gravatarUrl}
            alt={profile?.username || 'Avatar'}
            className="w-10 h-10 rounded-full border-2 border-[#e5e7eb]"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(240,177,0,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#f0b100]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">Points Totaux</p>
            <p className="text-2xl font-bold text-[#101828]">{profile?.total_points?.toLocaleString() || '0'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(74,144,217,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#4a90d9]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 17V21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">Soumissions</p>
            <p className="text-2xl font-bold text-[#101828]">{profile?.submissions_count || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(34,197,94,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#22c55e]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">Corrections</p>
            <p className="text-2xl font-bold text-[#101828]">{profile?.reviews_count || 0}</p>
          </div>
        </div>

      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="col-span-2 space-y-6">
          {/* Recommended Challenge */}
          {recommendedChallenge && (
            <div className="bg-gradient-to-br from-[#001354] to-[#4a90d9] rounded-2xl p-8 text-white">
              <span className="inline-flex items-center gap-2 bg-[#f0b100] text-[#101828] text-xs font-medium px-3 py-1 rounded-full mb-4">
                Défi recommandé
              </span>
              <h2 className="text-2xl font-bold mb-3">{recommendedChallenge.title}</h2>
              <p className="text-white/80 mb-6 max-w-lg">
                {recommendedChallenge.description}
              </p>
              <div className="flex gap-3">
                <Link
                  href={`/challenges/${recommendedChallenge.id}`}
                  className="inline-flex items-center gap-2 bg-white text-[#001354] px-5 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Commencer le défi
                </Link>
                <Link
                  href="/challenges"
                  className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors border border-white/20"
                >
                  Voir tous les défis
                </Link>
              </div>
            </div>
          )}

          {/* Continue Learning */}
          <div>
            <h2 className="text-xl font-bold text-[#101828] mb-4">Continuer l&apos;apprentissage</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/review" className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:shadow-[0px_4px_8px_0px_rgba(16,24,40,0.1)] transition-shadow group">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-10 h-10 bg-[rgba(74,144,217,0.1)] rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#4a90d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-[#d1d5db] group-hover:text-[#4a90d9] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#101828] mb-1">Corriger des pairs</h3>
                <p className="text-sm text-[#6a7282]">Gagnez des points en aidant la communauté.</p>
              </Link>

              <Link href="/leaderboard" className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:shadow-[0px_4px_8px_0px_rgba(16,24,40,0.1)] transition-shadow group">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-10 h-10 bg-[rgba(240,177,0,0.1)] rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#f0b100]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-[#d1d5db] group-hover:text-[#4a90d9] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#101828] mb-1">Voir le classement</h3>
                <p className="text-sm text-[#6a7282]">Comparez vos performances.</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
            <div className="p-6 border-b border-[#e5e7eb]">
              <h3 className="text-lg font-semibold text-[#101828]">Activité récente</h3>
            </div>
            <div className="p-6 space-y-6">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 ${activityColors[activity.type]} rounded-full mt-2`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#101828] truncate">{activity.title}</p>
                        <span className="text-xs text-[#6a7282] shrink-0 ml-2">{getTimeAgo(activity.created_at)}</span>
                      </div>
                      <p className="text-sm text-[#6a7282] truncate">{activity.description}</p>
                    </div>
                    {activity.points !== null && (
                      <span className="text-sm font-medium text-[#22c55e] shrink-0">+{activity.points}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-[#6a7282]">Aucune activité récente</p>
                  <p className="text-xs text-[#9ca3af] mt-1">Commencez par soumettre un défi !</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#e5e7eb]">
              <Link href="/activity" className="block w-full py-2 text-sm text-[#6a7282] hover:text-[#101828] transition-colors text-center">
                Voir tout l&apos;historique
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

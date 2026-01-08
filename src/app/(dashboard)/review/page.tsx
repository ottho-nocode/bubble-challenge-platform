import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const difficultyColors = {
  easy: 'bg-[#dcfce7] text-[#166534]',
  medium: 'bg-[#fef3c7] text-[#92400e]',
  hard: 'bg-[#fee2e2] text-[#991b1b]',
};

const difficultyLabels = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

export default async function ReviewPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get pending submissions from other users
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      challenges (
        title,
        description,
        difficulty,
        points_base,
        time_limit,
        criteria_design,
        criteria_functionality,
        criteria_completion
      ),
      profiles (
        username
      )
    `)
    .eq('status', 'pending')
    .neq('user_id', user?.id)
    .order('created_at', { ascending: true })
    .limit(10);

  // Get stats
  const { count: totalPending } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .neq('user_id', user?.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('reviews_count')
    .eq('id', user?.id)
    .single();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#101828]">Corrections</h1>
          <p className="text-[#6a7282] mt-1">
            Evaluez les soumissions des autres eleves et gagnez 5 points par correction.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(74,144,217,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#4a90d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">En attente</p>
            <p className="text-2xl font-bold text-[#101828]">{totalPending || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(34,197,94,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">Mes corrections</p>
            <p className="text-2xl font-bold text-[#101828]">{profile?.reviews_count || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(240,177,0,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#f0b100]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">Points gagnes</p>
            <p className="text-2xl font-bold text-[#101828]">{(profile?.reviews_count || 0) * 5}</p>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <h2 className="text-xl font-bold text-[#101828] mb-4">Soumissions a corriger</h2>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions?.map((submission) => (
          <div key={submission.id} className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Title and Badges */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-[#101828]">
                    {submission.challenges?.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[submission.challenges?.difficulty as keyof typeof difficultyColors]}`}>
                    {difficultyLabels[submission.challenges?.difficulty as keyof typeof difficultyLabels]}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fef3c7] text-[#92400e]">
                    En attente
                  </span>
                </div>

                {/* Submitter info */}
                <p className="text-[#6a7282] text-sm mb-4">
                  Soumis par <span className="font-medium text-[#101828]">{submission.profiles?.username}</span>
                  {' le '}
                  {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>

                {/* Meta info */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#6a7282]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{submission.challenges?.time_limit} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#6a7282]">
                    <svg className="w-4 h-4 text-[#f0b100]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"/>
                    </svg>
                    <span>{submission.challenges?.points_base} pts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#22c55e]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>+5 pts pour la correction</span>
                  </div>
                </div>

                {/* Criteria Tags */}
                <div className="flex flex-wrap gap-2">
                  {submission.challenges?.criteria_design && (
                    <span className="px-3 py-1 bg-[#f3f4f6] text-[#4b5563] rounded-lg text-xs">
                      Design
                    </span>
                  )}
                  {submission.challenges?.criteria_functionality && (
                    <span className="px-3 py-1 bg-[#f3f4f6] text-[#4b5563] rounded-lg text-xs">
                      Fonctionnalites
                    </span>
                  )}
                  {submission.challenges?.criteria_completion && (
                    <span className="px-3 py-1 bg-[#f3f4f6] text-[#4b5563] rounded-lg text-xs">
                      Realisation
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 ml-6 shrink-0">
                <Link
                  href={`/review/${submission.id}`}
                  className="flex items-center justify-center gap-2 bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors"
                >
                  Corriger
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7"/>
                  </svg>
                </Link>
                {submission.video_url && (
                  <a
                    href={submission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#f3f4f6] text-[#4b5563] px-5 py-3 rounded-xl font-medium hover:bg-[#e5e7eb] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Voir video
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-16 bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
            <div className="w-16 h-16 bg-[rgba(34,197,94,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#101828] mb-2">
              Aucune soumission a corriger
            </h3>
            <p className="text-[#6a7282] mb-6 max-w-md mx-auto">
              Toutes les soumissions ont ete evaluees ou il n&apos;y a pas encore de soumissions d&apos;autres eleves.
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors"
            >
              Relever un defi
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

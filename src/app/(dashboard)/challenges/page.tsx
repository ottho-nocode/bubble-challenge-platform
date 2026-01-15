import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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

const categoryLabels = {
  web: 'Web',
  mobile: 'Mobile',
  both: 'Web & Mobile',
};

const categoryColors = {
  web: 'bg-[#dbeafe] text-[#1e40af]',
  mobile: 'bg-[#f3e8ff] text-[#6b21a8]',
  both: 'bg-[#e0e7ff] text-[#3730a3]',
};

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const formatFilter = params.format || 'all';

  let query = supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true);

  // Apply format filter
  if (formatFilter === 'web') {
    query = query.in('category', ['web', 'both']);
  } else if (formatFilter === 'mobile') {
    query = query.in('category', ['mobile', 'both']);
  }

  const { data: challenges } = await query.order('created_at', { ascending: false });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#101828]">Défis disponibles</h1>
          <p className="text-[#6a7282] mt-1">
            Choisissez un exercice pour monter en compétence sur Bubble.
          </p>
        </div>
      </div>

      {/* Format Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/challenges"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            formatFilter === 'all'
              ? 'bg-[#001354] text-white'
              : 'bg-white text-[#6a7282] hover:bg-[#f3f4f6] border border-[#e5e7eb]'
          }`}
        >
          Tous
        </Link>
        <Link
          href="/challenges?format=web"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            formatFilter === 'web'
              ? 'bg-[#001354] text-white'
              : 'bg-white text-[#6a7282] hover:bg-[#f3f4f6] border border-[#e5e7eb]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          Web
        </Link>
        <Link
          href="/challenges?format=mobile"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            formatFilter === 'mobile'
              ? 'bg-[#001354] text-white'
              : 'bg-white text-[#6a7282] hover:bg-[#f3f4f6] border border-[#e5e7eb]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          Mobile
        </Link>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        {challenges?.map((challenge) => (
          <div key={challenge.id} className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Title and Badge */}
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-[#101828]">
                    {challenge.title}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[challenge.difficulty as keyof typeof difficultyColors]}`}>
                    {difficultyLabels[challenge.difficulty as keyof typeof difficultyLabels]}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[#6a7282] text-sm mb-4 max-w-2xl">
                  {challenge.description}
                </p>

                {/* Meta info */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#6a7282]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{challenge.time_limit} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#6a7282]">
                    <svg className="w-4 h-4 text-[#f0b100]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"/>
                    </svg>
                    <span>15 pts max</span>
                  </div>
                </div>

                {/* Category Tag */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${categoryColors[challenge.category as keyof typeof categoryColors] || categoryColors.both}`}>
                    {categoryLabels[challenge.category as keyof typeof categoryLabels] || 'Web & Mobile'}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <Link
                href={`/challenges/${challenge.id}`}
                className="flex items-center gap-2 bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors shrink-0 ml-6"
              >
                Commencer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        ))}

        {(!challenges || challenges.length === 0) && (
          <div className="text-center py-16 bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
            <div className="w-16 h-16 bg-[#f3f4f6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <p className="text-[#6a7282]">Aucun défi disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

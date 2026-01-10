import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  const { count: pendingReviews } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .neq('user_id', user?.id);

  // Get a recommended challenge
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .limit(1);

  const recommendedChallenge = challenges?.[0];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#101828]">
            Bonjour, {profile?.username || 'Alex'}
          </h1>
          <p className="text-[#6a7282] mt-1">
            Voici un aperçu de votre progression sur Bubble.
          </p>
        </div>
        <div className="text-sm text-[#6a7282]">
          Dernière connexion: Aujourd&apos;hui, {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
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

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(168,85,247,0.1)] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#a855f7]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#6a7282]">Série en cours</p>
            <p className="text-2xl font-bold text-[#101828]">3 jours</p>
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
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#f0b100] rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#101828]">Défi complété</p>
                    <span className="text-xs text-[#6a7282]">2h</span>
                  </div>
                  <p className="text-sm text-[#6a7282]">Marketplace MVP</p>
                </div>
                <span className="text-sm font-medium text-[#22c55e]">+50</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#4a90d9] rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#101828]">Nouveau badge</p>
                    <span className="text-xs text-[#6a7282]">1j</span>
                  </div>
                  <p className="text-sm text-[#6a7282]">Premiers pas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#ec4899] rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#101828]">Correction reçue</p>
                    <span className="text-xs text-[#6a7282]">2j</span>
                  </div>
                  <p className="text-sm text-[#6a7282]">SaaS Dashboard</p>
                </div>
                <span className="text-sm font-medium text-[#22c55e]">+10</span>
              </div>
            </div>
            <div className="p-4 border-t border-[#e5e7eb]">
              <button className="w-full py-2 text-sm text-[#6a7282] hover:text-[#101828] transition-colors">
                Voir tout l&apos;historique
              </button>
            </div>
          </div>

          {/* Weekly Goal */}
          <div className="bg-gradient-to-br from-[#f59e0b] to-[#ea580c] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              <h3 className="font-semibold">Objectif Hebdo</h3>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/80">Progression</span>
              <span className="font-medium">3/5 défis</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-4">
              <div className="bg-white rounded-full h-2 w-3/5"></div>
            </div>
            <p className="text-sm text-white/80">
              Complétez encore 2 défis pour gagner le badge &quot;Régularité&quot;.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

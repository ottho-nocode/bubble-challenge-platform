'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from '@phosphor-icons/react';

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time_limit: 30,
    difficulty: 'medium',
    points_base: 15,
    criteria_design: '',
    criteria_functionality: '',
    criteria_completion: '',
    is_active: false,
    ai_correction_enabled: false,
  });

  useEffect(() => {
    const fetchChallenge = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        router.push('/admin/challenges');
        return;
      }

      setFormData({
        title: data.title,
        description: data.description,
        time_limit: data.time_limit,
        difficulty: data.difficulty,
        points_base: data.points_base,
        criteria_design: data.criteria_design,
        criteria_functionality: data.criteria_functionality,
        criteria_completion: data.criteria_completion,
        is_active: data.is_active,
        ai_correction_enabled: data.ai_correction_enabled || false,
      });
      setFetching(false);
    };

    fetchChallenge();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const { error } = await supabase
      .from('challenges')
      .update(formData)
      .eq('id', params.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/challenges');
  };

  if (fetching) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001354]"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        href="/admin/challenges"
        className="inline-flex items-center gap-2 text-[#6a7282] hover:text-[#101828] mb-6"
      >
        <ArrowLeft size={20} />
        Retour aux defis
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-[#101828] mb-2">Modifier le defi</h1>
        <p className="text-[#6a7282] mb-8">Modifiez les informations du defi</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Titre du defi
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Difficulte
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
                >
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Temps limite (min)
                </label>
                <input
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
                  min={5}
                  max={120}
                  required
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Points de base
                </label>
                <input
                  type="number"
                  value={formData.points_base}
                  onChange={(e) => setFormData({ ...formData, points_base: parseInt(e.target.value) })}
                  min={5}
                  max={100}
                  required
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Criteria */}
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-6">
            <h2 className="text-lg font-semibold text-[#101828]">Criteres d&apos;evaluation</h2>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Critere Design
              </label>
              <textarea
                value={formData.criteria_design}
                onChange={(e) => setFormData({ ...formData, criteria_design: e.target.value })}
                required
                rows={2}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Critere Fonctionnalites
              </label>
              <textarea
                value={formData.criteria_functionality}
                onChange={(e) => setFormData({ ...formData, criteria_functionality: e.target.value })}
                required
                rows={2}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Critere Realisation
              </label>
              <textarea
                value={formData.criteria_completion}
                onChange={(e) => setFormData({ ...formData, criteria_completion: e.target.value })}
                required
                rows={2}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none resize-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-[#e5e7eb] text-[#001354] focus:ring-[#4a90d9]"
              />
              <div>
                <p className="font-medium text-[#101828]">Publie</p>
                <p className="text-sm text-[#6a7282]">Le defi est visible par les eleves</p>
              </div>
            </label>

            <div className="border-t border-[#e5e7eb] pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ai_correction_enabled}
                  onChange={(e) => setFormData({ ...formData, ai_correction_enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-[#e5e7eb] text-[#6d28d9] focus:ring-[#6d28d9]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#101828]">Correction par IA</p>
                    <span className="px-2 py-0.5 bg-[#faf5ff] text-[#6d28d9] text-xs font-medium rounded-full">
                      Beta
                    </span>
                  </div>
                  <p className="text-sm text-[#6a7282]">Les soumissions seront automatiquement corrigees par l&apos;IA</p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#001354] text-white py-3 px-6 rounded-xl font-medium hover:bg-[#001354]/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
            <Link
              href="/admin/challenges"
              className="px-6 py-3 border border-[#e5e7eb] rounded-xl font-medium text-[#6a7282] hover:bg-[#f9fafb] transition-colors"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from '@phosphor-icons/react';

export default function NewChallengePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time_limit: 30,
    difficulty: 'medium',
    category: 'both',
    points_base: 15,
    criteria_design: '',
    criteria_functionality: '',
    criteria_completion: '',
    result_image_url: '',
    resources: '',
    is_active: false,
    ai_correction_enabled: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const { error } = await supabase
      .from('challenges')
      .insert([formData]);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/challenges');
  };

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
        <h1 className="text-3xl font-bold text-[#101828] mb-2">Nouveau defi</h1>
        <p className="text-[#6a7282] mb-8">Creez un nouveau defi pour les eleves</p>

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
                placeholder="Ex: Creer un formulaire de contact"
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
                placeholder="Decrivez le defi en detail..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  Categorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
                >
                  <option value="web">Web</option>
                  <option value="mobile">Mobile</option>
                  <option value="both">Web & Mobile</option>
                </select>
              </div>
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
              <p className="text-xs text-[#6a7282] mt-1">Score max: 15 points (5 par critere)</p>
            </div>
          </div>

          {/* Result Image & Resources */}
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-6">
            <h2 className="text-lg font-semibold text-[#101828]">Medias et ressources</h2>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Image du resultat attendu (URL)
              </label>
              <input
                type="url"
                value={formData.result_image_url}
                onChange={(e) => setFormData({ ...formData, result_image_url: e.target.value })}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
                placeholder="https://example.com/image.png (optionnel)"
              />
              <p className="text-xs text-[#6a7282] mt-1">Laissez vide si pas d&apos;image de reference</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Ressources (HTML)
              </label>
              <textarea
                value={formData.resources}
                onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none resize-none font-mono"
                placeholder='<p>Voici quelques ressources utiles :</p>
<ul>
  <li><a href="https://...">Documentation Bubble</a></li>
  <li><a href="https://...">Tutoriel video</a></li>
</ul>'
              />
              <p className="text-xs text-[#6a7282] mt-1">Vous pouvez utiliser du HTML pour formater le texte et ajouter des liens</p>
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
                placeholder="Ex: L'interface est esthetique et les couleurs sont harmonieuses"
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
                placeholder="Ex: Toutes les fonctionnalites demandees fonctionnent correctement"
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
                placeholder="Ex: Le defi est complete dans son integralite"
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
                <p className="font-medium text-[#101828]">Publier immediatement</p>
                <p className="text-sm text-[#6a7282]">Le defi sera visible par les eleves</p>
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
              {loading ? 'Creation...' : 'Creer le defi'}
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

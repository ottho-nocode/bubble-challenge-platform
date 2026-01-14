'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash, VideoCamera, CheckCircle, Image, Play, CaretDown, CaretUp, Robot } from '@phosphor-icons/react';

interface Screenshot {
  t: number;
  data: string;
}

interface Action {
  t: number;
  type: string;
  text?: string;
  element?: string;
}

interface ReferenceData {
  screenshots: (Screenshot | string)[];
  actions: Action[];
  metadata?: Record<string, unknown>;
}

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [deletingPreview, setDeletingPreview] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<{
    hasPreview: boolean;
    playbackId: string | null;
  }>({ hasPreview: false, playbackId: null });

  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [showReferenceDetails, setShowReferenceDetails] = useState(false);
  const [analyzingReference, setAnalyzingReference] = useState(false);
  const [referenceCheckpoints, setReferenceCheckpoints] = useState<string[]>([]);

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

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        // Use admin API route to fetch challenge (bypasses RLS)
        const response = await fetch(`/api/admin/challenges/${params.id}`);
        const result = await response.json();

        if (!response.ok || !result.data) {
          router.push('/admin/challenges');
          return;
        }

        const data = result.data;
        console.log('Fetched challenge:', data);
        console.log('ai_correction_enabled from DB:', data?.ai_correction_enabled);

        setFormData({
          title: data.title,
          description: data.description,
          time_limit: data.time_limit,
          difficulty: data.difficulty,
          category: data.category || 'both',
          points_base: data.points_base,
          criteria_design: data.criteria_design,
          criteria_functionality: data.criteria_functionality,
          criteria_completion: data.criteria_completion,
          result_image_url: data.result_image_url || '',
          resources: data.resources || '',
          is_active: data.is_active,
          ai_correction_enabled: data.ai_correction_enabled === true,
        });

        setPreviewStatus({
          hasPreview: !!data.preview_video_playback_id,
          playbackId: data.preview_video_playback_id || null,
        });

        // Parse reference actions JSON if available
        console.log('reference_actions_json:', data.reference_actions_json);
        if (data.reference_actions_json) {
          try {
            const refData = typeof data.reference_actions_json === 'string'
              ? JSON.parse(data.reference_actions_json)
              : data.reference_actions_json;
            console.log('Parsed refData:', refData);
            setReferenceData(refData as ReferenceData);
          } catch (e) {
            console.error('Failed to parse reference_actions_json:', e);
          }
        } else {
          console.log('No reference_actions_json available');
        }

        setFetching(false);
      } catch (err) {
        console.error('Fetch error:', err);
        router.push('/admin/challenges');
      }
    };

    fetchChallenge();
  }, [params.id, router]);

  const handleAnalyzeReference = async () => {
    setAnalyzingReference(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/challenges/${params.id}/analyze-reference`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'analyse');
      }

      setReferenceCheckpoints(result.checkpoints || []);
    } catch (err) {
      console.error('Analyze reference error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzingReference(false);
    }
  };

  // Helper to extract screenshot data (supports old string format and new {t, data} format)
  const getScreenshotSrc = (screenshot: Screenshot | string): string => {
    if (typeof screenshot === 'string') {
      return screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`;
    }
    return screenshot.data.startsWith('data:') ? screenshot.data : `data:image/png;base64,${screenshot.data}`;
  };

  // Helper to format timestamp
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDeletePreviewVideo = async () => {
    if (!confirm('Supprimer la vidéo de référence ? Les élèves ne verront plus la prévisualisation.')) return;

    setDeletingPreview(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/challenges/${params.id}/preview`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      setPreviewStatus({
        hasPreview: false,
        playbackId: null,
      });
    } catch (err) {
      console.error('Delete preview error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingPreview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Saving formData:', formData);
    console.log('ai_correction_enabled value:', formData.ai_correction_enabled);

    try {
      // Use admin API route to update challenge (bypasses RLS)
      const response = await fetch(`/api/admin/challenges/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('Update response:', result);

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la mise à jour');
        setLoading(false);
        return;
      }

      router.push('/admin/challenges');
    } catch (err) {
      console.error('Update error:', err);
      setError('Erreur lors de la mise à jour');
      setLoading(false);
    }
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
        Retour aux défis
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-[#101828] mb-2">Modifier le défi</h1>
        <p className="text-[#6a7282] mb-8">Modifiez les informations du défi</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Titre du défi
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#101828] mb-2">
                  Difficulté
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
                  Catégorie
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
              <p className="text-xs text-[#6a7282] mt-1">Score max: 15 points (5 par critère)</p>
            </div>
          </div>

          {/* Result Image & Resources */}
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-6">
            <h2 className="text-lg font-semibold text-[#101828]">Médias et ressources</h2>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Image du résultat attendu (URL)
              </label>
              <input
                type="url"
                value={formData.result_image_url}
                onChange={(e) => setFormData({ ...formData, result_image_url: e.target.value })}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
                placeholder="https://example.com/image.png (optionnel)"
              />
              <p className="text-xs text-[#6a7282] mt-1">Laissez vide si pas d&apos;image de référence</p>
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
  <li><a href="https://...">Tutoriel vidéo</a></li>
</ul>'
              />
              <p className="text-xs text-[#6a7282] mt-1">Vous pouvez utiliser du HTML pour formater le texte et ajouter des liens</p>
            </div>

            {/* Preview Video Section */}
            <div className="border-t border-[#e5e7eb] pt-6">
              <div className="flex items-center gap-2 mb-3">
                <VideoCamera size={20} className="text-[#4a90d9]" />
                <label className="block text-sm font-medium text-[#101828]">
                  Vidéo de référence
                </label>
              </div>
              <p className="text-sm text-[#6a7282] mb-4">
                Enregistrez la solution avec l&apos;extension Chrome. La vidéo sera visible par les élèves et servira de référence pour la correction IA.
              </p>

              {previewStatus.hasPreview ? (
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={24} className="text-[#22c55e]" weight="fill" />
                      <div>
                        <p className="font-medium text-[#166534]">Vidéo de référence enregistrée</p>
                        <p className="text-sm text-[#15803d]">
                          {previewStatus.playbackId === 'processing'
                            ? 'Traitement en cours...'
                            : 'Vidéo disponible pour les élèves'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {previewStatus.playbackId && previewStatus.playbackId !== 'processing' && (
                        <a
                          href={`https://stream.mux.com/${previewStatus.playbackId}.m3u8`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
                        >
                          Voir
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleDeletePreviewVideo}
                        disabled={deletingPreview}
                        className="p-1.5 text-[#dc2626] hover:bg-[#fee2e2] rounded-lg transition-colors disabled:opacity-50"
                        title="Supprimer la vidéo"
                      >
                        {deletingPreview ? (
                          <span className="animate-spin inline-block w-5 h-5 border-2 border-[#dc2626] border-t-transparent rounded-full"></span>
                        ) : (
                          <Trash size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#fef3c7] border border-[#fcd34d] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <VideoCamera size={24} className="text-[#d97706] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#92400e]">Aucune vidéo de référence</p>
                      <p className="text-sm text-[#a16207] mt-1">
                        Utilisez l&apos;extension Chrome Bubble Recorder pour enregistrer la solution. Sélectionnez ce défi et choisissez le mode &quot;Référence&quot;.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Data Details */}
              {previewStatus.hasPreview && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowReferenceDetails(!showReferenceDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-[#4a90d9] hover:text-[#3a7cc0] transition-colors"
                  >
                    {showReferenceDetails ? <CaretUp size={16} /> : <CaretDown size={16} />}
                    {showReferenceDetails ? 'Masquer' : 'Voir'} les détails de la référence
                    <span className="text-[#6a7282] font-normal">
                      ({referenceData?.screenshots?.length || 0} captures, {referenceData?.actions?.length || 0} actions)
                    </span>
                  </button>

                  {showReferenceDetails && (
                    <div className="mt-4 space-y-6">
                      {/* AI Analysis Button */}
                      <div className="bg-[#faf5ff] border border-[#e9d5ff] rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Robot size={24} className="text-[#6d28d9]" />
                            <div>
                              <p className="font-medium text-[#581c87]">Analyse IA de la référence</p>
                              <p className="text-sm text-[#7c3aed]">
                                Voir les checkpoints identifiés par l&apos;IA
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleAnalyzeReference}
                            disabled={analyzingReference}
                            className="px-4 py-2 bg-[#6d28d9] text-white rounded-lg hover:bg-[#5b21b6] transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {analyzingReference ? (
                              <>
                                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                Analyse...
                              </>
                            ) : (
                              <>
                                <Play size={16} weight="fill" />
                                Analyser
                              </>
                            )}
                          </button>
                        </div>

                        {referenceCheckpoints.length > 0 && (
                          <div className="mt-4 bg-white rounded-lg p-4">
                            <p className="font-medium text-[#101828] mb-2">Checkpoints identifiés:</p>
                            <ul className="space-y-2">
                              {referenceCheckpoints.map((checkpoint, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-[#6a7282]">
                                  <CheckCircle size={18} className="text-[#22c55e] shrink-0 mt-0.5" weight="fill" />
                                  {checkpoint}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Screenshots */}
                      {referenceData?.screenshots && referenceData.screenshots.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Image size={18} className="text-[#6a7282]" />
                            <p className="font-medium text-[#101828]">
                              Captures d&apos;écran ({referenceData.screenshots.length})
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {referenceData.screenshots.map((screenshot, index) => {
                              const isNewFormat = typeof screenshot === 'object' && screenshot !== null;
                              const timestamp = isNewFormat ? (screenshot as Screenshot).t : index * 1000;
                              return (
                                <div key={index} className="relative group">
                                  <img
                                    src={getScreenshotSrc(screenshot)}
                                    alt={`Capture ${index + 1}`}
                                    className="w-full h-auto rounded-lg border border-[#e5e7eb] object-cover aspect-video"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-b-lg">
                                    #{index + 1} - {formatTime(timestamp)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {referenceData?.actions && referenceData.actions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Play size={18} className="text-[#6a7282]" />
                            <p className="font-medium text-[#101828]">
                              Actions enregistrées ({referenceData.actions.length})
                            </p>
                          </div>
                          <div className="bg-[#f9fafb] rounded-xl p-4 max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-[#6a7282]">
                                  <th className="pb-2 font-medium">Temps</th>
                                  <th className="pb-2 font-medium">Type</th>
                                  <th className="pb-2 font-medium">Détails</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e5e7eb]">
                                {referenceData.actions.map((action, index) => (
                                  <tr key={index} className="text-[#101828]">
                                    <td className="py-2 text-[#6a7282]">{formatTime(action.t)}</td>
                                    <td className="py-2">
                                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                        action.type === 'click' ? 'bg-blue-100 text-blue-700' :
                                        action.type === 'input' ? 'bg-green-100 text-green-700' :
                                        action.type === 'scroll' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {action.type}
                                      </span>
                                    </td>
                                    <td className="py-2 text-[#6a7282] truncate max-w-[200px]">
                                      {action.element || action.text || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* No data warning */}
                      {(!referenceData?.screenshots || referenceData.screenshots.length === 0) && (
                        <div className="bg-[#fef3c7] border border-[#fcd34d] rounded-xl p-4">
                          <p className="text-[#92400e] font-medium">Aucune capture d&apos;écran</p>
                          <p className="text-sm text-[#a16207] mt-1">
                            La vidéo de référence a été enregistrée avec une ancienne version de l&apos;extension.
                            Ré-enregistrez la solution avec la dernière version pour capturer les screenshots à chaque action.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Criteria */}
          <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] space-y-6">
            <h2 className="text-lg font-semibold text-[#101828]">Critères d&apos;évaluation</h2>

            <div>
              <label className="block text-sm font-medium text-[#101828] mb-2">
                Critère Design
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
                Critère Fonctionnalités
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
                Critère Réalisation
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
                <p className="font-medium text-[#101828]">Publié</p>
                <p className="text-sm text-[#6a7282]">Le défi est visible par les élèves</p>
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
                  <p className="text-sm text-[#6a7282]">Les soumissions seront automatiquement corrigées par l&apos;IA (utilise la vidéo de référence ci-dessus)</p>
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

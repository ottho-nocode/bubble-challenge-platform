import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const difficultyLabels = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (!challenge) {
    notFound();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/challenges"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Retour aux defis
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {challenge.title}
            </h1>
            <div className="flex gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  difficultyColors[challenge.difficulty as keyof typeof difficultyColors]
                }`}
              >
                {difficultyLabels[challenge.difficulty as keyof typeof difficultyLabels]}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {challenge.time_limit} minutes
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {challenge.points_base} points
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-lg mb-8">{challenge.description}</p>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Criteres de notation
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎨</span>
                <h3 className="font-semibold text-gray-900">Design</h3>
              </div>
              <p className="text-gray-600 text-sm">{challenge.criteria_design}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚙️</span>
                <h3 className="font-semibold text-gray-900">Fonctionnalites</h3>
              </div>
              <p className="text-gray-600 text-sm">{challenge.criteria_functionality}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <h3 className="font-semibold text-gray-900">Realisation</h3>
              </div>
              <p className="text-gray-600 text-sm">{challenge.criteria_completion}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-3">
          Comment relever ce defi ?
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 mb-6">
          <li>Ouvre Bubble.io dans un nouvel onglet</li>
          <li>Lance l'extension Chrome "Bubble Challenge"</li>
          <li>Selectionne ce defi dans la liste</li>
          <li>Clique sur "Demarrer l'enregistrement"</li>
          <li>Realise le defi dans le temps imparti</li>
          <li>Arrete l'enregistrement et soumets ton travail</li>
        </ol>
        <a
          href="https://bubble.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Ouvrir Bubble.io
        </a>
      </div>
    </div>
  );
}

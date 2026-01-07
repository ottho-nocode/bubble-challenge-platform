import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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

export default async function ChallengesPage() {
  const supabase = await createClient();

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Défis disponibles</h1>
        <p className="text-gray-600">Choisissez un défi et relevez le challenge !</p>
      </div>

      <div className="grid gap-6">
        {challenges?.map((challenge) => (
          <div key={challenge.id} className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {challenge.title}
                </h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${difficultyColors[challenge.difficulty as keyof typeof difficultyColors]}`}>
                    {difficultyLabels[challenge.difficulty as keyof typeof difficultyLabels]}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                    ⏱️ {challenge.time_limit} min
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm">
                    🎯 {challenge.points_base} pts base
                  </span>
                </div>
              </div>
              <Link
                href={`/challenges/${challenge.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Relever le défi
              </Link>
            </div>

            <p className="text-gray-600 mb-4">{challenge.description}</p>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Critères de notation :</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Design :</span>
                  <span className="text-gray-600 ml-1">{challenge.criteria_design}</span>
                </div>
                <div>
                  <span className="font-medium">Fonctionnalités :</span>
                  <span className="text-gray-600 ml-1">{challenge.criteria_functionality}</span>
                </div>
                <div>
                  <span className="font-medium">Réalisation :</span>
                  <span className="text-gray-600 ml-1">{challenge.criteria_completion}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {(!challenges || challenges.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            Aucun défi disponible pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

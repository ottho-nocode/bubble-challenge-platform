'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PencilSimple, Trash, Eye, EyeSlash } from '@phosphor-icons/react';

interface Challenge {
  id: string;
  title: string;
  is_active: boolean;
}

export default function ChallengeActions({ challenge }: { challenge: Challenge }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const togglePublish = async () => {
    setLoading(true);
    const supabase = createClient();

    await supabase
      .from('challenges')
      .update({ is_active: !challenge.is_active })
      .eq('id', challenge.id);

    router.refresh();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer le défi "${challenge.title}" ? Cette action est irréversible.`)) {
      return;
    }

    setLoading(true);
    const supabase = createClient();

    await supabase
      .from('challenges')
      .delete()
      .eq('id', challenge.id);

    router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={togglePublish}
        disabled={loading}
        className={`p-2 rounded-lg transition-colors ${
          challenge.is_active
            ? 'text-yellow-600 hover:bg-yellow-50'
            : 'text-green-600 hover:bg-green-50'
        }`}
        title={challenge.is_active ? 'Dépublier' : 'Publier'}
      >
        {challenge.is_active ? <EyeSlash size={18} /> : <Eye size={18} />}
      </button>

      <Link
        href={`/admin/challenges/${challenge.id}/edit`}
        className="p-2 text-[#4a90d9] hover:bg-blue-50 rounded-lg transition-colors"
        title="Modifier"
      >
        <PencilSimple size={18} />
      </Link>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Supprimer"
      >
        <Trash size={18} />
      </button>
    </div>
  );
}

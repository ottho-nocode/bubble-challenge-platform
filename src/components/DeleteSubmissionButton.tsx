'use client';

import { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface DeleteSubmissionButtonProps {
  submissionId: string;
  status: string;
}

export default function DeleteSubmissionButton({ submissionId, status }: DeleteSubmissionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  // Only allow deleting pending submissions
  if (status !== 'pending') {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    }
    setIsDeleting(false);
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? 'Suppression...' : 'Confirmer'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="px-3 py-2 bg-[#f3f4f6] text-[#4b5563] rounded-xl text-sm font-medium hover:bg-[#e5e7eb] transition-colors"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
    >
      <Trash size={16} />
      Supprimer
    </button>
  );
}

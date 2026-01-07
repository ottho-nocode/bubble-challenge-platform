'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] py-12 px-4">
      <div className="w-[448px] bg-white rounded-2xl shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="pt-6 pb-4 text-center">
          <div className="w-12 h-12 bg-gradient-to-b from-[#4a90d9] to-[#001354] rounded-[14px] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-[#101828] tracking-tight">
            Bienvenue
          </h1>
          <p className="text-[#6a7282] text-sm mt-2">
            Connectez-vous pour continuer votre progression
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-[#101828] mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
              placeholder="exemple@email.com"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#101828]">
                Mot de passe
              </label>
              <Link href="#" className="text-sm text-[#4a90d9] hover:underline">
                Oublie ?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#001354] text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-[#001354]/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 text-center text-sm text-[#6a7282] border-t border-[#e5e7eb]">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-[#4a90d9] font-medium hover:underline">
            S&apos;inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}

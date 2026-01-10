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
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] py-12 px-4">
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(0,0,0,0.08)] p-8 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src="/logo.svg" alt="Bubble Challenge" className="w-14 h-14" />
          </div>

          {/* Title */}
          <h1 className="text-[28px] font-bold text-[#101828] text-center mb-2">
            Bienvenue
          </h1>
          <p className="text-[#6a7282] text-center mb-8">
            Connectez-vous pour continuer votre progression
          </p>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[15px] font-semibold text-[#101828] mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-[#e5e7eb] rounded-xl text-[15px] text-[#101828] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#001354]/20 focus:border-[#001354] outline-none transition-all"
                  placeholder="exemple@email.com"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9d9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-[15px] font-semibold text-[#101828]">
                  Mot de passe
                </label>
                <Link href="#" className="text-sm text-[#4a90d9] hover:underline">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-[#e5e7eb] rounded-xl text-[15px] text-[#101828] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#001354]/20 focus:border-[#001354] outline-none transition-all"
                  placeholder="••••••••"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#001354] text-white py-4 rounded-xl text-[15px] font-semibold hover:bg-[#001354]/90 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Bottom Link */}
        <div className="text-center mt-6">
          <p className="text-[#6a7282] text-[15px]">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-[#4a90d9] font-medium hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

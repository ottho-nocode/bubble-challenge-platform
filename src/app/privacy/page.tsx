import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#4a90d9] hover:underline mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-bold text-[#101828]">Politique de Confidentialité</h1>
          <p className="text-[#6a7282] mt-2">Dernière mise à jour : 10 janvier 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Introduction</h2>
            <p className="text-[#4b5563] leading-relaxed">
              Bubble Challenge Recorder (&quot;l&apos;extension&quot;) est développée par Bubble Challenge.
              Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos données.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Données collectées</h2>

            <h3 className="text-lg font-medium text-[#101828] mt-4 mb-2">Données de compte</h3>
            <ul className="list-disc list-inside text-[#4b5563] space-y-1">
              <li>Adresse e-mail</li>
              <li>Nom d&apos;utilisateur</li>
              <li>Token de session (stocké localement)</li>
            </ul>

            <h3 className="text-lg font-medium text-[#101828] mt-4 mb-2">Données d&apos;enregistrement</h3>
            <ul className="list-disc list-inside text-[#4b5563] space-y-1">
              <li>Vidéos de vos sessions Bubble.io (uniquement lorsque vous démarrez un enregistrement)</li>
              <li>Durée des enregistrements</li>
              <li>Défi associé à chaque soumission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Utilisation des données</h2>
            <p className="text-[#4b5563] leading-relaxed mb-3">
              Vos données sont utilisées exclusivement pour :
            </p>
            <ul className="list-disc list-inside text-[#4b5563] space-y-1">
              <li>Vous authentifier sur la plateforme Bubble Challenge</li>
              <li>Soumettre vos enregistrements vidéo pour évaluation</li>
              <li>Afficher votre progression et vos scores</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Stockage des données</h2>
            <ul className="list-disc list-inside text-[#4b5563] space-y-2">
              <li><strong>Données locales :</strong> Vos préférences et token de session sont stockés localement sur votre navigateur via chrome.storage</li>
              <li><strong>Vidéos :</strong> Les enregistrements sont hébergés de manière sécurisée sur Mux.com</li>
              <li><strong>Données de compte :</strong> Stockées sur nos serveurs Supabase avec chiffrement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Partage des données</h2>
            <p className="text-[#4b5563] leading-relaxed mb-3">
              Nous ne vendons ni ne partageons vos données personnelles avec des tiers. Vos vidéos sont uniquement visibles par :
            </p>
            <ul className="list-disc list-inside text-[#4b5563] space-y-1">
              <li>Vous-même</li>
              <li>Les correcteurs de la plateforme Bubble Challenge</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Vos droits</h2>
            <p className="text-[#4b5563] leading-relaxed mb-3">
              Vous pouvez à tout moment :
            </p>
            <ul className="list-disc list-inside text-[#4b5563] space-y-1">
              <li>Accéder à vos données personnelles</li>
              <li>Demander la suppression de votre compte et de vos données</li>
              <li>Retirer votre consentement</li>
            </ul>
            <p className="text-[#4b5563] leading-relaxed mt-3">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@bubble-challenge.com" className="text-[#4a90d9] hover:underline">contact@bubble-challenge.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Sécurité</h2>
            <p className="text-[#4b5563] leading-relaxed">
              Nous utilisons des protocoles HTTPS pour toutes les communications et stockons vos données sur des serveurs sécurisés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Modifications</h2>
            <p className="text-[#4b5563] leading-relaxed">
              Cette politique peut être mise à jour. Toute modification sera notifiée via l&apos;extension ou notre site web.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#101828] mb-3">Contact</h2>
            <p className="text-[#4b5563] leading-relaxed">
              Pour toute question concernant cette politique de confidentialité :
            </p>
            <ul className="list-disc list-inside text-[#4b5563] space-y-1 mt-2">
              <li>Email : <a href="mailto:contact@bubble-challenge.com" className="text-[#4a90d9] hover:underline">contact@bubble-challenge.com</a></li>
              <li>Site web : <a href="https://bubble-challenge-platform.vercel.app" className="text-[#4a90d9] hover:underline">bubble-challenge-platform.vercel.app</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

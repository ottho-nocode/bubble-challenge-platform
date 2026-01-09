'use client';

import { useState, useEffect } from 'react';
import { Record, Download, CheckCircle, XCircle, Link as LinkIcon } from '@phosphor-icons/react';

// Declare chrome type for TypeScript
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (extensionId: string, message: object, callback: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}

// Extension ID
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || 'abbhlbldflfpeolmjihamfngefcpbiig';

interface ExtensionLauncherProps {
  challengeId: string;
  challengeTitle: string;
  onRecordingComplete?: () => void;
}

type ExtensionStatus = 'checking' | 'installed' | 'not_installed';

export default function ExtensionLauncher({
  challengeId,
  challengeTitle,
  onRecordingComplete,
}: ExtensionLauncherProps) {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>('checking');
  const [isPreparing, setIsPreparing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bubbleUrl, setBubbleUrl] = useState('');

  // Check if extension is installed
  useEffect(() => {
    checkExtension();
  }, []);

  const checkExtension = async () => {
    setExtensionStatus('checking');

    try {
      // Try to send a message to the extension
      const response = await sendMessageToExtension({ type: 'PING' });
      if (response?.installed) {
        setExtensionStatus('installed');
        console.log('Extension detected, version:', response.version);
      } else {
        setExtensionStatus('not_installed');
      }
    } catch (error) {
      console.log('Extension not detected:', error);
      setExtensionStatus('not_installed');
    }
  };

  const sendMessageToExtension = (message: object): Promise<any> => {
    return new Promise((resolve, reject) => {
      const chromeRuntime = window.chrome?.runtime;
      if (!chromeRuntime?.sendMessage) {
        reject(new Error('Chrome runtime not available'));
        return;
      }

      try {
        chromeRuntime.sendMessage(EXTENSION_ID, message, (response) => {
          if (chromeRuntime.lastError) {
            reject(new Error(chromeRuntime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  const handleLaunchRecording = async () => {
    setIsPreparing(true);
    setMessage(null);

    try {
      const returnUrl = `${window.location.origin}/submissions`;

      setMessage('Ouverture de votre application Bubble et demarrage de l\'enregistrement...');

      const response = await sendMessageToExtension({
        type: 'START_RECORDING_ON_URL',
        data: {
          challengeId,
          challengeTitle,
          returnUrl,
          bubbleUrl,
        },
      });

      if (response?.success) {
        setMessage('Onglet Bubble ouvert ! Cliquez sur "Demarrer l\'enregistrement" dans le popup de l\'extension pour commencer.');
      } else {
        setMessage('Erreur: ' + (response?.error || 'Impossible de demarrer l\'enregistrement'));
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setMessage('Erreur de communication avec l\'extension. Rechargez la page et reessayez.');
    }

    setIsPreparing(false);
  };

  if (extensionStatus === 'checking') {
    return (
      <div className="bg-[#f9fafb] rounded-[16px] p-5">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#6d28d9]"></div>
          <span className="text-[#6a7282]">Verification de l&apos;extension...</span>
        </div>
      </div>
    );
  }

  if (extensionStatus === 'not_installed') {
    return (
      <div className="space-y-4">
        {/* Extension not installed box */}
        <div className="bg-[#fef3c7] rounded-[16px] p-5">
          <div className="flex items-start gap-3">
            <XCircle size={20} weight="fill" className="text-[#d97706] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[#92400e] text-sm">
                Extension requise
              </h4>
              <p className="text-[#a16207] text-sm mt-1">
                Installez l&apos;extension Bubble Recorder pour enregistrer votre travail.
              </p>
            </div>
          </div>
        </div>

        {/* Install button */}
        <a
          href="https://github.com/ottho-nocode/bubble-recorder-plugin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#d97706] text-white py-3 px-4 rounded-[9px] font-medium hover:bg-[#b45309] transition-colors"
        >
          <Download size={18} weight="bold" />
          Installer l&apos;extension
        </a>

        {/* Recheck button */}
        <button
          onClick={checkExtension}
          className="w-full text-[#6a7282] text-sm hover:text-[#101828] transition-colors"
        >
          Reverifier l&apos;installation
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Extension installed box */}
      <div className="bg-[#d1fae5] rounded-[16px] p-5">
        <div className="flex items-start gap-3">
          <CheckCircle size={20} weight="fill" className="text-[#059669] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-[#059669] text-sm">
              Extension installee
            </h4>
            <p className="text-[#047857] text-sm mt-1">
              L&apos;extension Bubble Recorder est prete. Cliquez sur le bouton ci-dessous pour preparer l&apos;enregistrement.
            </p>
          </div>
        </div>
      </div>

      {/* Bubble URL Input */}
      <div>
        <label htmlFor="bubble-url" className="block text-sm font-medium text-[#374151] mb-2">
          URL de votre application Bubble
        </label>
        <div className="relative">
          <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="url"
            id="bubble-url"
            value={bubbleUrl}
            onChange={(e) => setBubbleUrl(e.target.value)}
            placeholder="https://votre-app.bubbleapps.io/version-test"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#e5e7eb] bg-white text-[#101828] placeholder-[#9ca3af] focus:ring-2 focus:ring-[#6d28d9] focus:border-transparent outline-none text-sm"
          />
        </div>
        <p className="text-xs text-[#6a7282] mt-2">
          Partagez votre app en mode &quot;Everyone can edit&quot; dans les parametres Bubble.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-[#faf5ff] rounded-xl p-4 border border-[#e9d5ff]">
          <p className="text-[#6d28d9] text-sm font-medium">{message}</p>
        </div>
      )}

      {/* Launch button */}
      <button
        onClick={handleLaunchRecording}
        disabled={isPreparing || !bubbleUrl}
        className="flex items-center justify-center gap-2 w-full bg-[#6d28d9] text-white py-3 px-4 rounded-[9px] font-medium hover:bg-[#5b21b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-white"></span>
        {isPreparing ? 'Preparation...' : 'Lancer l\'enregistrement'}
      </button>
    </div>
  );
}

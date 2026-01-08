'use client';

import { useState, useEffect } from 'react';
import { Record, Download, CheckCircle, XCircle } from '@phosphor-icons/react';

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

      const response = await sendMessageToExtension({
        type: 'PREPARE_RECORDING',
        data: {
          challengeId,
          challengeTitle,
          returnUrl,
        },
      });

      if (response?.success) {
        setMessage('L\'extension Bubble Recorder s\'ouvre... Selectionnez l\'onglet Bubble a enregistrer et cliquez sur Demarrer.');
      } else {
        setMessage('Erreur: ' + (response?.error || 'Impossible de communiquer avec l\'extension'));
      }
    } catch (error) {
      console.error('Error preparing recording:', error);
      setMessage('Erreur de communication avec l\'extension. Rechargez la page et reessayez.');
    }

    setIsPreparing(false);
  };

  if (extensionStatus === 'checking') {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#6d28d9]"></div>
          <span className="text-gray-600">Verification de l'extension...</span>
        </div>
      </div>
    );
  }

  if (extensionStatus === 'not_installed') {
    return (
      <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
        <div className="flex items-start gap-3">
          <XCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">
              Extension Chrome requise
            </h3>
            <p className="text-amber-700 text-sm mb-4">
              Pour enregistrer votre travail, vous devez installer l'extension Bubble Recorder.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/ottho-nocode/bubble-recorder-plugin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                <Download size={18} />
                Installer l'extension
              </a>
              <button
                onClick={checkExtension}
                className="inline-flex items-center gap-2 bg-white text-amber-700 px-4 py-2 rounded-lg text-sm font-medium border border-amber-300 hover:bg-amber-50 transition-colors"
              >
                Reverifier
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
      <div className="flex items-start gap-3">
        <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-green-800 mb-2">
            Extension installee
          </h3>
          <p className="text-green-700 text-sm mb-4">
            L'extension Bubble Recorder est prete. Cliquez sur le bouton ci-dessous pour preparer l'enregistrement.
          </p>

          {message && (
            <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
              <p className="text-green-800 text-sm font-medium">{message}</p>
              <p className="text-green-600 text-xs mt-2">
                L'extension ouvrira la page de vos soumissions une fois l'enregistrement termine.
              </p>
            </div>
          )}

          <button
            onClick={handleLaunchRecording}
            disabled={isPreparing}
            className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#5b21b6] disabled:opacity-50 transition-colors"
          >
            <Record size={20} weight="fill" />
            {isPreparing ? 'Preparation...' : 'Lancer l\'enregistrement'}
          </button>
        </div>
      </div>
    </div>
  );
}

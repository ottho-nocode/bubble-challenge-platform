'use client';

import { useState, useRef, useEffect } from 'react';

interface WebRecorderProps {
  challengeId: string;
  challengeTitle: string;
  timeLimit: number; // in minutes
  onSubmissionComplete: (success: boolean) => void;
}

export default function WebRecorder({
  challengeId,
  challengeTitle,
  timeLimit,
  onSubmissionComplete,
}: WebRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'preview' | 'uploading' | 'success'>('idle');
  const [bubbleUrl, setBubbleUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mimeTypeRef = useRef<string>('video/webm');

  const timeLimitMs = timeLimit * 60 * 1000;

  useEffect(() => {
    console.log('=== WebRecorder mounted ===');
    console.log('challengeId:', challengeId);
    console.log('timeLimit:', timeLimit);

    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Set video preview when blob is ready and status is preview
  useEffect(() => {
    if (status === 'preview' && recordedBlob && videoPreviewRef.current) {
      console.log('Setting video preview source...');
      const url = URL.createObjectURL(recordedBlob);
      videoPreviewRef.current.src = url;
      console.log('Video preview URL set:', url);
    }
  }, [status, recordedBlob]);

  const startRecording = async () => {
    console.log('=== startRecording called ===');

    if (!bubbleUrl.trim()) {
      console.log('No bubble URL provided');
      setError('Veuillez entrer l\'URL de votre application Bubble');
      return;
    }

    console.log('Bubble URL:', bubbleUrl);
    setError('');
    chunksRef.current = [];

    try {
      console.log('Requesting screen capture...');
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
        audio: true,
      });

      console.log('Got stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks().length);
      streamRef.current = stream;

      // Find supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('Aucun format video supporte par ce navigateur');
      }

      console.log('Using mimeType:', selectedMimeType);
      mimeTypeRef.current = selectedMimeType;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        console.log('Blob created:', blob.size, 'bytes');
        setRecordedBlob(blob);
        setStatus('preview');
      };

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        if (status === 'recording') {
          stopRecording();
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Erreur lors de l\'enregistrement');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      console.log('MediaRecorder started, state:', mediaRecorder.state);

      startTimeRef.current = Date.now();
      setStatus('recording');

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDuration(elapsed);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Impossible de demarrer l\'enregistrement. Verifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setDuration(0);
    setStatus('idle');
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = '';
    }
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;

    setStatus('uploading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', recordedBlob, 'recording.webm');
      formData.append('challenge_id', challengeId);
      formData.append('duration', duration.toString());
      formData.append('bubble_url', bubbleUrl);
      formData.append('actions', JSON.stringify({
        metadata: {
          bubbleUrl,
          recordedAt: new Date().toISOString(),
          duration,
        },
        actions: [], // No action tracking in web version
      }));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        onSubmissionComplete(true);
      } else {
        throw new Error(result.error || 'Erreur lors de l\'upload');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erreur lors de l\'envoi. Reessayez.');
      setStatus('preview');
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = timeLimitMs - duration;
  const isOverTime = remainingTime < 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Enregistrer votre solution
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Idle State - Setup */}
      {status === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de votre application Bubble
            </label>
            <input
              type="url"
              value={bubbleUrl}
              onChange={(e) => setBubbleUrl(e.target.value)}
              placeholder="https://votre-app.bubbleapps.io/version-test"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              Assurez-vous que votre application est configuree en <strong>"Everyone can edit"</strong> dans les parametres de partage Bubble.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Ouvrez votre application Bubble dans un autre onglet</li>
              <li>Cliquez sur "Demarrer l'enregistrement" ci-dessous</li>
              <li>Selectionnez l'onglet Bubble a partager</li>
              <li>Realisez le defi dans le temps imparti ({timeLimit} min)</li>
              <li>Cliquez sur "Arreter" quand vous avez termine</li>
            </ol>
          </div>

          <button
            onClick={startRecording}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <span className="text-xl">&#9679;</span>
            Demarrer l'enregistrement
          </button>
        </div>
      )}

      {/* Recording State */}
      {status === 'recording' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <span className="font-medium text-red-700">Enregistrement en cours</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-red-700">
                {formatTime(duration)}
              </div>
              <div className={`text-sm ${isOverTime ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {isOverTime ? 'Temps depasse!' : `${formatTime(remainingTime)} restant`}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Realisez le defi "<strong>{challengeTitle}</strong>" puis cliquez sur Arreter.
          </p>

          <button
            onClick={stopRecording}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
          >
            <span className="text-xl">&#9632;</span>
            Arreter l'enregistrement
          </button>
        </div>
      )}

      {/* Preview State */}
      {status === 'preview' && (
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            <video
              ref={videoPreviewRef}
              controls
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Duree: {formatTime(duration)}</span>
            <span>{isOverTime && '(Temps depasse)'}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={discardRecording}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300"
            >
              Annuler
            </button>
            <button
              onClick={uploadRecording}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
            >
              Soumettre
            </button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {status === 'uploading' && (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Envoi en cours...</p>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-green-600">&#10003;</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Soumission envoyee !
          </h3>
          <p className="text-gray-600 mb-4">
            Votre travail sera evalue par d'autres etudiants.
          </p>
          <a
            href="/submissions"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700"
          >
            Voir mes soumissions
          </a>
        </div>
      )}
    </div>
  );
}

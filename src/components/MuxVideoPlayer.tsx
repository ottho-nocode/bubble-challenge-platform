'use client';

import MuxPlayer from '@mux/mux-player-react';

interface MuxVideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export default function MuxVideoPlayer({
  playbackId,
  title,
  className = '',
  autoPlay = false,
  muted = false,
  loop = false,
  poster,
  onPlay,
  onPause,
  onEnded,
}: MuxVideoPlayerProps) {
  if (!playbackId) {
    return (
      <div className={`bg-gray-900 rounded-xl flex items-center justify-center aspect-video ${className}`}>
        <p className="text-gray-400">Aucune video disponible</p>
      </div>
    );
  }

  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title || 'Video',
      }}
      streamType="on-demand"
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      poster={poster}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      className={className}
      style={{
        aspectRatio: '16/9',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
      accentColor="#6d28d9"
    />
  );
}
